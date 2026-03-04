import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Lock, User, Mail, Loader2, Eye, EyeOff, Camera, Trash2, Upload,
  ShieldCheck, CheckCircle2, RefreshCw, PencilLine // Added Pencil Icon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const API_URL  = `${BASE_URL}/api`;

const STEPS = { REQUEST: 'request', VERIFY: 'verify', RESET: 'reset', DONE: 'done' };

export default function AdminSettings() {
  const { toast } = useToast();
  const { authHeaders, setCurrentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // 🟢 NEW STATES: baselineData for dirty checking, isEditing for locking
  const [formData, setFormData] = useState({ name: '', email: '', username: '', profilePicture: '' });
  const [baselineData, setBaselineData] = useState({ name: '', email: '', username: '', profilePicture: '' });
  const [isEditing, setIsEditing] = useState(false);

  // Dirty check: Compare current form to the original data from DB
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(baselineData);

  const fileInputRef = useRef(null);
  
  // OTP States (Keep your existing ones)
  const [step, setStep] = useState(STEPS.REQUEST);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const boxRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState({ new: false, confirm: false });

  const buildHeaders = useCallback(async () => {
    const ah = await authHeaders();
    return { 'Content-Type': 'application/json', ...ah };
  }, [authHeaders]);

  const getUserEmail = useCallback(() => {
    try {
      const session = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      return session.email || formData.email || '';
    } catch { return formData.email || ''; }
  }, [formData.email]);

  // ── Fetch Profile ────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const headers = await buildHeaders();
        const res = await fetch(`${API_URL}/auth/profile`, { headers });
        const data = await res.json();
        const profile = { 
            name: data.name || '', 
            email: data.email || '', 
            username: data.username || '',
            profilePicture: data.profilePicture || '' 
        };
        setFormData(profile);
        setBaselineData(profile); // Set baseline for change detection
      } catch (err) {
        toast({ title: 'Error loading profile', variant: 'destructive' });
      } finally { setLoading(false); }
    })();
  }, [buildHeaders, toast]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(p => ({ ...p, profilePicture: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    // If not editing, just unlock the fields
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    setSaving(true);
    try {
      const headers = await buildHeaders();
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT', headers,
        body: JSON.stringify({ 
            name: formData.name, 
            email: formData.email, 
            profilePicture: formData.profilePicture 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Update baseline and lock fields
      setBaselineData(formData);
      setIsEditing(false);

      // Update context/session
      const session = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      const updatedUser = { ...session, ...data };
      sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
      if (setCurrentUser) setCurrentUser(updatedUser);

      toast({ title: 'Success', description: 'Profile changes saved!' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  // ... (Keep existing OTP handlers: handleSendOtp, handleVerifyOtp, etc.)

  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#f3f6fd]">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your account and preferences</p>
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <User className="text-primary h-5 w-5" />
                    <CardTitle>Profile Information</CardTitle>
                </div>
                <CardDescription>Update your personal details and photo</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative group w-32 h-32">
                <div className="w-full h-full rounded-full border-2 border-dashed border-zinc-300 overflow-hidden bg-zinc-50 flex items-center justify-center shadow-inner">
                  {formData.profilePicture ? (
                    <img src={formData.profilePicture} className="w-full h-full object-cover" alt="profile" />
                  ) : (
                    <User className="h-12 w-12 text-zinc-400" />
                  )}
                </div>
                {/* Only allow upload when isEditing is true */}
                {isEditing && (
                    <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Camera className="text-white h-8 w-8" />
                    </div>
                )}
              </div>
              
              {isEditing && (
                <div className="flex flex-col gap-2">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                    <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" /> Change
                    </Button>
                    {formData.profilePicture && (
                        <Button variant="destructive" size="sm" onClick={() => setFormData(p => ({ ...p, profilePicture: '' }))}>
                            <Trash2 className="h-4 w-4 mr-2" /> Remove
                        </Button>
                    )}
                    </div>
                </div>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input 
                    value={formData.name} 
                    disabled={!isEditing}
                    className={!isEditing ? "bg-gray-50 border-transparent cursor-not-allowed" : ""}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} 
                />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={formData.username} disabled className="bg-gray-100 border-transparent cursor-not-allowed text-gray-400" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                value={formData.email} 
                disabled={!isEditing}
                className={!isEditing ? "bg-gray-50 border-transparent cursor-not-allowed" : ""}
                onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} 
              />
            </div>

            <div className="flex justify-end gap-3 border-t pt-6">
              {isEditing && (
                  <Button variant="outline" onClick={() => { setFormData(baselineData); setIsEditing(false); }}>
                      Cancel
                  </Button>
              )}
              
              <Button onClick={handleSaveProfile} disabled={saving} className="min-w-[140px] bg-black text-white hover:bg-zinc-800">
                {saving ? (
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                ) : !isEditing ? (
                  <><PencilLine className="h-4 w-4 mr-2" /> Edit Profile</>
                ) : hasChanges ? (
                  'Save Changes'
                ) : (
                  'Save Profile'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Change Password Card - Keep your existing code below */}
        {/* ... */}
      </div>
    </div>
  );
}
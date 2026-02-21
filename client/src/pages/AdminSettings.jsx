import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { Lock, User, Mail, Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Default to /api, but fallback safely
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function AdminSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Password Visibility States
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    currentPassword: '', 
    newPassword: '',
    confirmPassword: ''
  });

  const getAuthHeader = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
  });

  // Fetch Profile Data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/profile`, {
          headers: getAuthHeader()
        });
        
        if (response.ok) {
          const data = await response.json();
          setFormData(prev => ({
            ...prev,
            name: data.name || '',
            email: data.email || '',
            username: data.username || ''
          }));
        } else {
          // If /api fails, try without /api (in case server isn't using prefix for this route)
          const fallbackResponse = await fetch('http://localhost:5000/auth/profile', { headers: getAuthHeader() });
          if (fallbackResponse.ok) {
             const data = await fallbackResponse.json();
             setFormData(prev => ({ ...prev, name: data.name, email: data.email, username: data.username }));
          } else {
             throw new Error('Failed to load profile');
          }
        }
      } catch (error) {
        console.error(error);
        toast({
          title: "Error",
          description: "Could not load user profile.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    // Validation
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "New passwords do not match.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email
      };

      if (formData.newPassword) {
        payload.password = formData.newPassword;
      }

      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }
      
      // Update Session Storage with new details
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      sessionStorage.setItem('currentUser', JSON.stringify({ ...currentUser, name: data.name, email: data.email }));

      toast({
        title: "Settings saved",
        description: "Your profile has been updated successfully.",
      });

      // Clear password fields and reset visibility
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      setShowNewPassword(false);
      setShowConfirmPassword(false);

    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-2">Manage your account and preferences</p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>Profile Information</CardTitle>
              </div>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    value={formData.email} 
                    onChange={handleChange} 
                    className="pl-10" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  value={formData.username} 
                  disabled 
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Username cannot be changed.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>Security</CardTitle>
              </div>
              <CardDescription>Update your password (leave blank to keep current)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* New Password Field with Eye Icon */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input 
                    id="newPassword" 
                    type={showNewPassword ? "text" : "password"} 
                    value={formData.newPassword} 
                    onChange={handleChange} 
                    placeholder="Enter new password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field with Eye Icon */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input 
                    id="confirmPassword" 
                    type={showConfirmPassword ? "text" : "password"} 
                    value={formData.confirmPassword} 
                    onChange={handleChange} 
                    placeholder="Confirm new password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 pb-10">
            <Button variant="outline" onClick={() => window.location.reload()}>Discard Changes</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
  );
}
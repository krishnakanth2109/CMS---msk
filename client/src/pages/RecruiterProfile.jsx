import { useState, useRef, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import {
  User, Briefcase, Camera, CheckCircle,
  TrendingUp, Edit, Loader2, Globe, Linkedin, Github, Twitter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function RecruiterProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [imagePreview, setImagePreview] = useState('');

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', location: '',
    specialization: '', experience: '', bio: '', profilePicture: '',
    linkedin: '', github: '', twitter: '', website: '',
  });

  const [stats, setStats] = useState({
    totalSubmissions: 0, interviews: 0, offers: 0, joined: 0, successRate: 0
  });

  const getAuthHeader = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
  });

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/recruiters/profile`, { headers: getAuthHeader() });
        if (!res.ok) throw new Error('Failed to fetch profile');
        const data = await res.json();

        setFormData({
          name: data.name || '', email: data.email || '', phone: data.phone || '',
          location: data.location || '', specialization: data.specialization || '',
          experience: data.experience || '', bio: data.bio || '',
          profilePicture: data.profilePicture || '',
          linkedin: data.socials?.linkedin || '', github: data.socials?.github || '',
          twitter: data.socials?.twitter || '', website: data.socials?.website || '',
        });

        if (data.profilePicture) setImagePreview(data.profilePicture);

        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        sessionStorage.setItem('currentUser', JSON.stringify({ ...currentUser, name: data.name, profilePicture: data.profilePicture }));

        if (data.stats) {
          setStats({
            totalSubmissions: data.stats.totalSubmissions || 0,
            interviews: data.stats.interviews || 0,
            offers: data.stats.offers || 0,
            joined: data.stats.joined || 0,
            successRate: data.stats.totalSubmissions
              ? Math.round((data.stats.joined / data.stats.totalSubmissions) * 100) : 0
          });
        }
      } catch (error) {
        toast({ title: "Error", description: error.message || "Failed to load profile", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Image must be smaller than 5MB.", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid file type", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target?.result;
      setImagePreview(base64String);
      setFormData(prev => ({ ...prev, profilePicture: base64String }));
    };
    reader.onerror = () => toast({ title: "Error", description: "Failed to read image file.", variant: "destructive" });
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!formData.name || !formData.email) {
      toast({ title: "Validation Error", description: "Name and Email are required.", variant: "destructive" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({ title: "Validation Error", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: formData.name, email: formData.email, phone: formData.phone,
        location: formData.location, specialization: formData.specialization,
        experience: formData.experience, bio: formData.bio,
        profilePicture: formData.profilePicture,
        socials: { linkedin: formData.linkedin, github: formData.github, twitter: formData.twitter, website: formData.website }
      };
      const res = await fetch(`${API_URL}/recruiters/profile`, {
        method: 'PUT', headers: getAuthHeader(), body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update profile");

      setFormData(prev => ({ ...prev, profilePicture: data.profilePicture || prev.profilePicture }));
      setImagePreview(data.profilePicture || imagePreview);
      toast({ title: "Success", description: "Profile updated successfully!" });
      setIsEditing(false);

      const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      sessionStorage.setItem('currentUser', JSON.stringify({ ...currentUser, name: data.name, email: data.email, profilePicture: data.profilePicture }));
      window.dispatchEvent(new Event('storage'));
    } catch (error) {
      toast({ title: "Error", description: error.message || "Could not update profile.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setImagePreview(formData.profilePicture);
    setIsEditing(false);
  };

  const triggerFileInput = () => { if (isEditing) fileInputRef.current?.click(); };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  // Shared input classes
  const inputCls = (disabled) =>
    `w-full px-3 py-2 rounded-lg border text-sm outline-none transition ${disabled ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-background border-border focus:ring-2 focus:ring-primary'}`;

  const Field = ({ label, children }) => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground mt-1">Manage your personal information</p>
          </div>
          <button
            onClick={() => isEditing ? handleCancelEdit() : setIsEditing(true)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${isEditing ? 'border border-border bg-background hover:bg-muted' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
          >
            <Edit className="h-4 w-4" />
            {isEditing ? 'Cancel Editing' : 'Edit Profile'}
          </button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">Profile Details</TabsTrigger>
            <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Profile Picture Card */}
              <div className="lg:col-span-1 h-fit rounded-xl border border-border bg-card shadow-sm p-6 flex flex-col items-center space-y-4">
                <h3 className="font-semibold text-foreground self-start">Profile Picture</h3>
                <div className="relative group cursor-pointer" onClick={triggerFileInput}>
                  <Avatar className="w-32 h-32 border-4 border-muted">
                    <AvatarImage src={imagePreview || formData.profilePicture} className="object-cover" />
                    <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                      {getInitials(formData.name || user?.name || 'User')}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="text-white h-8 w-8" />
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                </div>
                {isEditing && (
                  <p className="text-xs text-muted-foreground text-center">Click to upload new image<br />(Max 5MB, JPG/PNG)</p>
                )}
                <div className="text-center">
                  <h3 className="text-xl font-semibold">{formData.name || user?.name || 'Your Name'}</h3>
                  <p className="text-sm text-muted-foreground">{formData.specialization || 'Recruiter'}</p>
                  {user?.role === 'admin' && <Badge className="mt-2">Admin</Badge>}
                </div>
              </div>

              {/* Info Forms */}
              <div className="lg:col-span-2 space-y-6">

                {/* Basic Information */}
                <div className="rounded-xl border border-border bg-card shadow-sm p-6">
                  <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                    <User className="h-5 w-5 text-primary" /> Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Full Name *">
                      <input className={inputCls(!isEditing)} value={formData.name} onChange={e => handleInputChange('name', e.target.value)} disabled={!isEditing} placeholder="Enter your full name" />
                    </Field>
                    <Field label="Email *">
                      <input type="email" className={inputCls(!isEditing)} value={formData.email} onChange={e => handleInputChange('email', e.target.value)} disabled={!isEditing} placeholder="your.email@example.com" />
                    </Field>
                    <Field label="Phone">
                      <input className={inputCls(!isEditing)} value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} disabled={!isEditing} placeholder="+1 (555) 123-4567" />
                    </Field>
                    <Field label="Location">
                      <input className={inputCls(!isEditing)} value={formData.location} onChange={e => handleInputChange('location', e.target.value)} disabled={!isEditing} placeholder="City, Country" />
                    </Field>
                    <div className="col-span-1 md:col-span-2 space-y-1">
                      <label className="text-sm font-medium">Bio</label>
                      <Textarea value={formData.bio} onChange={e => handleInputChange('bio', e.target.value)} disabled={!isEditing} rows={3} placeholder="Tell us about yourself..." />
                    </div>
                  </div>
                </div>

                {/* Professional Information */}
                <div className="rounded-xl border border-border bg-card shadow-sm p-6">
                  <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Briefcase className="h-5 w-5 text-primary" /> Professional Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Specialization">
                      <input className={inputCls(!isEditing)} value={formData.specialization} onChange={e => handleInputChange('specialization', e.target.value)} disabled={!isEditing} placeholder="e.g., Tech Recruiting" />
                    </Field>
                    <Field label="Years of Experience">
                      <input className={inputCls(!isEditing)} value={formData.experience} onChange={e => handleInputChange('experience', e.target.value)} disabled={!isEditing} placeholder="e.g., 5 years" />
                    </Field>
                  </div>
                </div>

                {/* Social Links */}
                <div className="rounded-xl border border-border bg-card shadow-sm p-6">
                  <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Globe className="h-5 w-5 text-primary" /> Social Links
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label={<span className="flex items-center gap-2"><Linkedin className="h-4 w-4" /> LinkedIn</span>}>
                      <input className={inputCls(!isEditing)} value={formData.linkedin} onChange={e => handleInputChange('linkedin', e.target.value)} disabled={!isEditing} placeholder="linkedin.com/in/yourprofile" />
                    </Field>
                    <Field label={<span className="flex items-center gap-2"><Github className="h-4 w-4" /> GitHub</span>}>
                      <input className={inputCls(!isEditing)} value={formData.github} onChange={e => handleInputChange('github', e.target.value)} disabled={!isEditing} placeholder="github.com/yourprofile" />
                    </Field>
                    <Field label={<span className="flex items-center gap-2"><Twitter className="h-4 w-4" /> Twitter</span>}>
                      <input className={inputCls(!isEditing)} value={formData.twitter} onChange={e => handleInputChange('twitter', e.target.value)} disabled={!isEditing} placeholder="twitter.com/yourprofile" />
                    </Field>
                    <Field label={<span className="flex items-center gap-2"><Globe className="h-4 w-4" /> Website</span>}>
                      <input className={inputCls(!isEditing)} value={formData.website} onChange={e => handleInputChange('website', e.target.value)} disabled={!isEditing} placeholder="yourwebsite.com" />
                    </Field>
                  </div>
                </div>

                {/* Save Buttons */}
                {isEditing && (
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={handleCancelEdit}
                      disabled={loading}
                      className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
                    >
                      {loading ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                      ) : (
                        <><CheckCircle className="h-4 w-4" /> Save Changes</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {[
                { label: 'Total Submissions', value: stats.totalSubmissions, color: 'text-blue-600' },
                { label: 'Interviews Scheduled', value: stats.interviews, color: 'text-purple-600' },
                { label: 'Successful Placements', value: stats.joined, color: 'text-green-600' },
                { label: 'Success Rate', value: `${stats.successRate}%`, color: 'text-orange-600' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-border bg-card shadow-sm p-6 text-center">
                  <div className={`text-2xl font-bold ${color}`}>{value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{label}</div>
                </div>
              ))}
            </div>

            {/* Funnel Efficiency */}
            <div className="rounded-xl border border-border bg-card shadow-sm p-6">
              <h3 className="font-semibold text-foreground flex items-center gap-2 mb-6">
                <TrendingUp className="h-5 w-5" /> Recruitment Funnel Efficiency
              </h3>
              <div className="space-y-6">
                {[
                  {
                    label: 'Submission to Interview',
                    value: stats.totalSubmissions ? (stats.interviews / stats.totalSubmissions) * 100 : 0,
                    color: 'bg-blue-100'
                  },
                  {
                    label: 'Interview to Offer',
                    value: stats.interviews ? (stats.offers / stats.interviews) * 100 : 0,
                    color: 'bg-purple-100'
                  },
                  {
                    label: 'Overall Success Rate',
                    value: stats.successRate,
                    color: 'bg-green-100'
                  },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="flex justify-between mb-1 text-sm font-medium">
                      <span>{label}</span>
                      <span>{Math.round(value)}%</span>
                    </div>
                    <Progress value={value} className={`h-3 ${color}`} />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

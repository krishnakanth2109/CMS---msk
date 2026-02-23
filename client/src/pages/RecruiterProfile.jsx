import { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User, Briefcase, Camera, CheckCircle, TrendingUp,
  Edit, Loader2, Globe, Linkedin, Github, Twitter,
  Phone, MapPin, Calendar, Hash
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ─── Session helpers ───────────────────────────────────────────────────────────
// AuthContext stores in sessionStorage key 'currentUser':
//   { _id, email, username, role, firebaseUid, idToken, refreshToken, sessionExpiry }
// idToken  = current Firebase Bearer token (auto-refreshed every ~55 min by AuthContext)
// _id      = MongoDB ObjectId – we use this for display/reference only;
//            the backend protect middleware reads the idToken to identify the user.
const getSession = () => {
  try { return JSON.parse(sessionStorage.getItem('currentUser') || '{}'); }
  catch { return {}; }
};
const getAuthHeader = () => {
  const { idToken } = getSession();
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken || ''}` };
};
// ──────────────────────────────────────────────────────────────────────────────

export default function RecruiterProfile() {
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const [profileLoading, setProfileLoading] = useState(true);
  const [statsLoading,   setStatsLoading]   = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [isEditing,      setIsEditing]      = useState(false);
  const [activeTab,      setActiveTab]      = useState('profile');
  const [imagePreview,   setImagePreview]   = useState('');

  // profile = committed state (what backend currently has)
  const [profile, setProfile] = useState({
    _id: '', firstName: '', lastName: '', email: '', username: '',
    phone: '', location: '', specialization: '', experience: '',
    bio: '', profilePicture: '', role: 'recruiter', recruiterId: '', createdAt: '',
    socials: { linkedin: '', github: '', twitter: '', website: '' },
  });

  // draft = working copy; diverges from profile only while isEditing === true
  const [draft, setDraft] = useState({ ...profile });

  const [stats, setStats] = useState({
    totalSubmissions: 0, interviews: 0, offers: 0, joined: 0, rejected: 0, successRate: 0,
  });

  // ── 1. GET /api/recruiters/profile ────────────────────────────────────────
  // protect middleware extracts Bearer idToken → looks up MongoDB user → returns full doc
  useEffect(() => {
    (async () => {
      setProfileLoading(true);
      try {
        const res = await fetch(`${API_URL}/recruiters/profile`, { headers: getAuthHeader() });
        if (!res.ok) throw new Error('Failed to fetch profile');
        const d = await res.json();

        const fetched = {
          _id:            d._id            || '',
          firstName:      d.firstName      || '',
          lastName:       d.lastName       || '',
          email:          d.email          || '',
          username:       d.username       || '',
          phone:          d.phone          || '',
          location:       d.location       || '',
          specialization: d.specialization || '',
          experience:     d.experience     || '',
          bio:            d.bio            || '',
          profilePicture: d.profilePicture || '',
          role:           d.role           || 'recruiter',
          recruiterId:    d.recruiterId    || '',
          createdAt:      d.createdAt      || '',
          socials: {
            linkedin: d.socials?.linkedin || '',
            github:   d.socials?.github   || '',
            twitter:  d.socials?.twitter  || '',
            website:  d.socials?.website  || '',
          },
        };
        setProfile(fetched);
        setDraft(fetched);
        if (d.profilePicture) setImagePreview(d.profilePicture);

        // Keep sessionStorage in sync so Sidebar / Header show correct name & avatar
        const session = getSession();
        sessionStorage.setItem('currentUser', JSON.stringify({
          ...session, firstName: d.firstName, lastName: d.lastName, profilePicture: d.profilePicture,
        }));
      } catch (err) {
        toast({ title: 'Error loading profile', description: err.message || 'Please refresh.', variant: 'destructive' });
      } finally {
        setProfileLoading(false);
      }
    })();
  }, []);

  // ── 2. GET /api/recruiters/profile/stats ──────────────────────────────────
  // Returns candidate counts for the logged-in recruiter grouped by pipeline stage.
  // See recruiterRoutes.js addition below.
  useEffect(() => {
    (async () => {
      setStatsLoading(true);
      try {
        const res = await fetch(`${API_URL}/recruiters/profile/stats`, { headers: getAuthHeader() });
        if (!res.ok) return;
        const d = await res.json();
        const total = d.totalSubmissions || 0;
        setStats({
          totalSubmissions: total,
          interviews:  d.interviews || 0,
          offers:      d.offers     || 0,
          joined:      d.joined     || 0,
          rejected:    d.rejected   || 0,
          successRate: total > 0 ? Math.round(((d.joined || 0) / total) * 100) : 0,
        });
      } catch { /* non-critical */ } finally { setStatsLoading(false); }
    })();
  }, []);

  // ── Image → base64 (Cloudinary upload handled by recruiterController.updateUserProfile) ─
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 5MB.', variant: 'destructive' }); return;
    }
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid type', description: 'Upload an image file.', variant: 'destructive' }); return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result;
      setImagePreview(b64);
      setDraft(prev => ({ ...prev, profilePicture: b64 }));
    };
    reader.readAsDataURL(file);
  };

  const setField  = (k, v) => setDraft(prev => ({ ...prev, [k]: v }));
  const setSocial = (k, v) => setDraft(prev => ({ ...prev, socials: { ...prev.socials, [k]: v } }));

  // ── 3. PUT /api/recruiters/profile ────────────────────────────────────────
  const handleSave = async () => {
    if (!draft.firstName.trim() || !draft.lastName.trim()) {
      toast({ title: 'Validation', description: 'First and last name are required.', variant: 'destructive' }); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) {
      toast({ title: 'Validation', description: 'Enter a valid email address.', variant: 'destructive' }); return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/recruiters/profile`, {
        method: 'PUT', headers: getAuthHeader(),
        body: JSON.stringify({
          firstName:      draft.firstName.trim(),
          lastName:       draft.lastName.trim(),
          email:          draft.email.trim(),
          phone:          draft.phone,
          location:       draft.location,
          specialization: draft.specialization,
          experience:     draft.experience,
          bio:            draft.bio,
          profilePicture: draft.profilePicture, // base64 → Cloudinary in recruiterController
          socials:        draft.socials,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Failed to update profile');

      const saved = {
        ...draft,
        profilePicture: d.profilePicture || draft.profilePicture,
        firstName:      d.firstName      || draft.firstName,
        lastName:       d.lastName       || draft.lastName,
        email:          d.email          || draft.email,
      };
      setProfile(saved);
      setDraft(saved);
      setImagePreview(d.profilePicture || imagePreview);

      const session = getSession();
      sessionStorage.setItem('currentUser', JSON.stringify({
        ...session, firstName: d.firstName, lastName: d.lastName,
        email: d.email, profilePicture: d.profilePicture,
      }));
      window.dispatchEvent(new Event('storage')); // trigger Sidebar/Header refresh

      toast({ title: 'Saved!', description: 'Profile updated successfully.' });
      setIsEditing(false);
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Could not save.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleCancelEdit = () => { setDraft({ ...profile }); setImagePreview(profile.profilePicture); setIsEditing(false); };

  // Helpers
  const displayName = (fn, ln) => `${fn} ${ln}`.trim() || 'Your Name';
  const initials    = (fn, ln) => ((fn?.[0] || '') + (ln?.[0] || '')).toUpperCase() || 'U';
  const joinedDate  = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';

  // While editing show draft values, while viewing show committed profile values
  const val    = (k) => isEditing ? draft[k]               : profile[k];
  const social = (k) => isEditing ? (draft.socials?.[k] || '') : (profile.socials?.[k] || '');

  const inp = (ro) =>
    `w-full px-3 py-2 rounded-lg border text-sm outline-none transition
     ${ro ? 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200'
           : 'bg-white border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`;

  const Field = ({ label, children }) => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );

  if (profileLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-slate-500">Loading your profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
            <p className="text-slate-500 mt-1">Manage your personal and professional information</p>
          </div>
          <button
            onClick={() => isEditing ? handleCancelEdit() : setIsEditing(true)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition shrink-0
              ${isEditing ? 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            <Edit className="h-4 w-4" />
            {isEditing ? 'Cancel Editing' : 'Edit Profile'}
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="profile"     className="data-[state=active]:bg-slate-100">Profile Details</TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-slate-100">Performance Metrics</TabsTrigger>
          </TabsList>

          {/* ══════════════════ PROFILE TAB ══════════════════════════════ */}
          <TabsContent value="profile">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left — Avatar card */}
              <div className="lg:col-span-1 h-fit rounded-xl border border-slate-200 bg-white shadow-sm p-6 flex flex-col items-center space-y-4">
                <h3 className="font-semibold text-slate-900 self-start text-sm">Profile Picture</h3>

                <div className={`relative group ${isEditing ? 'cursor-pointer' : ''}`}
                  onClick={() => isEditing && fileInputRef.current?.click()}>
                  <Avatar className="w-32 h-32 border-4 border-slate-100">
                    <AvatarImage src={imagePreview} className="object-cover" />
                    <AvatarFallback className="text-2xl font-bold bg-blue-50 text-blue-600">
                      {isEditing ? initials(draft.firstName, draft.lastName)
                                 : initials(profile.firstName, profile.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="text-white h-8 w-8" />
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                </div>
                {isEditing && <p className="text-xs text-slate-400 text-center">Click to upload · Max 5MB · JPG/PNG</p>}

                {/* Name + role badges */}
                <div className="text-center w-full">
                  <h3 className="text-lg font-bold text-slate-900">
                    {isEditing ? displayName(draft.firstName, draft.lastName)
                               : displayName(profile.firstName, profile.lastName)}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {(isEditing ? draft.specialization : profile.specialization) || 'Recruiter'}
                  </p>
                  <div className="flex justify-center flex-wrap gap-2 mt-2">
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs">
                      {profile.role === 'admin' ? 'Admin' : 'Recruiter'}
                    </Badge>
                    {profile.recruiterId && (
                      <Badge variant="outline" className="text-slate-400 border-slate-200 text-xs">
                        <Hash className="h-2.5 w-2.5 mr-0.5" />{profile.recruiterId}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Quick-info pills — view mode only */}
                {!isEditing && (
                  <div className="w-full space-y-2 pt-3 border-t border-slate-100">
                    {profile.email && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
                        <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{profile.email}</span>
                      </div>
                    )}
                    {profile.phone && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span>{profile.phone}</span>
                      </div>
                    )}
                    {profile.location && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span>{profile.location}</span>
                      </div>
                    )}
                    {profile.experience && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Briefcase className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span>{profile.experience} experience</span>
                      </div>
                    )}
                    {joinedDate && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span>Joined {joinedDate}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Social links — view mode only */}
                {!isEditing && Object.values(profile.socials || {}).some(Boolean) && (
                  <div className="w-full pt-3 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-2">
                    {[
                      { key: 'linkedin', Icon: Linkedin, color: 'text-blue-600',  label: 'LinkedIn' },
                    
                      { key: 'twitter',  Icon: Twitter,  color: 'text-sky-500',   label: 'Twitter' },
                 
                    ].filter(({ key }) => profile.socials?.[key]).map(({ key, Icon, color, label }) => {
                      const href = profile.socials[key].startsWith('http')
                        ? profile.socials[key] : `https://${profile.socials[key]}`;
                      return (
                        <a key={key} href={href} target="_blank" rel="noopener noreferrer"
                          className={`flex items-center gap-1 text-xs ${color} hover:underline`}>
                          <Icon className="h-3.5 w-3.5" />{label}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right — Forms */}
              <div className="lg:col-span-2 space-y-6">

                {/* Basic Information */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                    <User className="h-5 w-5 text-blue-600" /> Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="First Name *">
                      <input className={inp(!isEditing)} value={val('firstName')}
                        onChange={e => setField('firstName', e.target.value)} disabled={!isEditing} placeholder="First name" />
                    </Field>
                    <Field label="Last Name *">
                      <input className={inp(!isEditing)} value={val('lastName')}
                        onChange={e => setField('lastName', e.target.value)} disabled={!isEditing} placeholder="Last name" />
                    </Field>
                    <Field label="Email *">
                      <input type="email" className={inp(!isEditing)} value={val('email')}
                        onChange={e => setField('email', e.target.value)} disabled={!isEditing} placeholder="you@example.com" />
                    </Field>
                    <Field label="Phone">
                      <input className={inp(!isEditing)} value={val('phone')}
                        onChange={e => setField('phone', e.target.value)} disabled={!isEditing} placeholder="+1 (555) 123-4567" />
                    </Field>
                    <Field label="Location">
                      <input className={inp(!isEditing)} value={val('location')}
                        onChange={e => setField('location', e.target.value)} disabled={!isEditing} placeholder="City, Country" />
                    </Field>
                    <div className="col-span-1 md:col-span-2 space-y-1">
                      <label className="text-sm font-medium text-slate-700">Bio</label>
                      <Textarea value={val('bio')} onChange={e => setField('bio', e.target.value)}
                        disabled={!isEditing} rows={3} placeholder="Tell us about yourself…"
                        className={`text-sm resize-none ${!isEditing ? 'bg-slate-50 cursor-not-allowed opacity-70' : 'focus:ring-blue-500'}`} />
                    </div>
                  </div>
                </div>

                {/* Professional Information */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                    <Briefcase className="h-5 w-5 text-blue-600" /> Professional Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Specialization">
                      <input className={inp(!isEditing)} value={val('specialization')}
                        onChange={e => setField('specialization', e.target.value)} disabled={!isEditing} placeholder="e.g., Tech Recruiting" />
                    </Field>
                    <Field label="Years of Experience">
                      <input className={inp(!isEditing)} value={val('experience')}
                        onChange={e => setField('experience', e.target.value)} disabled={!isEditing} placeholder="e.g., 5 years" />
                    </Field>
                  </div>
                </div>

                {/* Social Links */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                    <Globe className="h-5 w-5 text-blue-600" /> Social Links
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: 'linkedin', Icon: Linkedin, label: 'LinkedIn', ph: 'linkedin.com/in/you' },
               
                      { key: 'twitter',  Icon: Twitter,  label: 'Twitter',  ph: 'twitter.com/you' },
         
                    ].map(({ key, Icon, label, ph }) => (
                      <Field key={key} label={<span className="flex items-center gap-1"><Icon className="h-3.5 w-3.5" />{label}</span>}>
                        <input className={inp(!isEditing)} value={social(key)}
                          onChange={e => setSocial(key, e.target.value)} disabled={!isEditing} placeholder={ph} />
                      </Field>
                    ))}
                  </div>
                </div>

                {/* Save / Cancel */}
                {isEditing && (
                  <div className="flex justify-end gap-3">
                    <button onClick={handleCancelEdit} disabled={saving}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50">
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
                      {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                              : <><CheckCircle className="h-4 w-4" />Save Changes</>}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ══════════════════ PERFORMANCE TAB ══════════════════════════ */}
          <TabsContent value="performance">
            {statsLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
              </div>
            ) : (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                  {[
                    { label: 'Submissions',  value: stats.totalSubmissions,  color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-100' },
                    { label: 'In Interview', value: stats.interviews,        color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
                    { label: 'Offers',       value: stats.offers,            color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100' },
                    { label: 'Joined',       value: stats.joined,            color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
                    { label: 'Success Rate', value: `${stats.successRate}%`, color: 'text-teal-600',   bg: 'bg-teal-50',   border: 'border-teal-100' },
                  ].map(({ label, value, color, bg, border }) => (
                    <div key={label} className={`rounded-xl border ${border} ${bg} p-5 text-center`}>
                      <div className={`text-2xl font-bold ${color}`}>{value}</div>
                      <div className="text-xs text-slate-500 mt-1 font-medium leading-tight">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Funnel Progress Bars */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 mb-6">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-6">
                    <TrendingUp className="h-5 w-5 text-blue-600" /> Recruitment Funnel
                  </h3>
                  <div className="space-y-5">
                    {[
                      { label: 'Submission → Interview', pct: stats.totalSubmissions > 0 ? (stats.interviews / stats.totalSubmissions) * 100 : 0, count: `${stats.interviews} of ${stats.totalSubmissions}`, color: 'text-purple-600' },
                      { label: 'Interview → Offer',      pct: stats.interviews > 0 ? (stats.offers / stats.interviews) * 100 : 0,               count: `${stats.offers} of ${stats.interviews}`,       color: 'text-green-600' },
                      { label: 'Offer → Joined',         pct: stats.offers > 0 ? (stats.joined / stats.offers) * 100 : 0,                       count: `${stats.joined} of ${stats.offers}`,           color: 'text-orange-600' },
                      { label: 'Overall Success Rate',   pct: stats.successRate,                                                                  count: `${stats.joined} of ${stats.totalSubmissions}`, color: 'text-blue-600' },
                    ].map(({ label, pct, count, color }) => (
                      <div key={label}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-sm font-medium text-slate-700">{label}</span>
                          <span className="text-sm">
                            <span className={`font-bold ${color}`}>{Math.round(pct)}%</span>
                            <span className="text-slate-400 text-xs ml-2">({count})</span>
                          </span>
                        </div>
                        <Progress value={pct} className="h-2.5 bg-slate-100" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pipeline Breakdown */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Pipeline Breakdown</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Submitted', value: stats.totalSubmissions, dot: 'bg-blue-500' },
                      { label: 'Interview', value: stats.interviews,       dot: 'bg-purple-500' },
                      { label: 'Offer',     value: stats.offers,           dot: 'bg-green-500' },
                      { label: 'Joined',    value: stats.joined,           dot: 'bg-orange-500' },
                    ].map(({ label, value, dot }) => {
                      const pct = stats.totalSubmissions > 0
                        ? Math.round((value / stats.totalSubmissions) * 100) : 0;
                      return (
                        <div key={label} className="rounded-lg border border-slate-100 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-slate-500">{label}</span>
                            <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                          </div>
                          <div className="text-2xl font-bold text-slate-900">{value}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{pct}% of total</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
import { useState, useRef, useEffect } from 'react';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, Mail, Phone, Briefcase, Camera, CheckCircle,
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
    name: '',
    email: '',
    phone: '',
    location: '',
    specialization: '',
    experience: '',
    bio: '',
    profilePicture: '',
    linkedin: '',
    github: '',
    twitter: '',
    website: '',
  });

  const [stats, setStats] = useState({
    totalSubmissions: 0,
    interviews: 0,
    offers: 0,
    joined: 0,
    successRate: 0
  });

  const getAuthHeader = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
  });

  // Fetch Profile Data
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/recruiters/profile`, { 
          headers: getAuthHeader() 
        });
        
        if (!res.ok) {
          throw new Error('Failed to fetch profile');
        }
        
        const data = await res.json();
        
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          location: data.location || '',
          specialization: data.specialization || '',
          experience: data.experience || '',
          bio: data.bio || '',
          profilePicture: data.profilePicture || '',
          linkedin: data.socials?.linkedin || '',
          github: data.socials?.github || '',
          twitter: data.socials?.twitter || '',
          website: data.socials?.website || '',
        });
        
        // Set initial image preview
        if (data.profilePicture) {
          setImagePreview(data.profilePicture);
        }
        
        // Update session storage
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        sessionStorage.setItem('currentUser', JSON.stringify({ 
          ...currentUser, 
          name: data.name,
          profilePicture: data.profilePicture 
        }));
        
        // Set stats if available
        if (data.stats) {
          setStats({
            totalSubmissions: data.stats.totalSubmissions || 0,
            interviews: data.stats.interviews || 0,
            offers: data.stats.offers || 0,
            joined: data.stats.joined || 0,
            successRate: data.stats.totalSubmissions 
              ? Math.round((data.stats.joined / data.stats.totalSubmissions) * 100) 
              : 0
          });
        }
        
      } catch (error) {
        console.error("Profile fetch error:", error);
        toast({ 
          title: "Error", 
          description: error.message || "Failed to load profile", 
          variant: "destructive" 
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    
    if (!file) return;
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({ 
        title: "File too large", 
        description: "Image must be smaller than 5MB.", 
        variant: "destructive" 
      });
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ 
        title: "Invalid file type", 
        description: "Please upload an image file.", 
        variant: "destructive" 
      });
      return;
    }
    
    // Read and convert to base64
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const base64String = e.target?.result;
      setImagePreview(base64String);
      setFormData(prev => ({ ...prev, profilePicture: base64String }));
    };
    
    reader.onerror = () => {
      toast({ 
        title: "Error", 
        description: "Failed to read image file.", 
        variant: "destructive" 
      });
    };
    
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    // Validation
    if (!formData.name || !formData.email) {
      toast({ 
        title: "Validation Error", 
        description: "Name and Email are required.", 
        variant: "destructive" 
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({ 
        title: "Validation Error", 
        description: "Please enter a valid email address.", 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        specialization: formData.specialization,
        experience: formData.experience,
        bio: formData.bio,
        profilePicture: formData.profilePicture, 
        socials: {
          linkedin: formData.linkedin,
          github: formData.github,
          twitter: formData.twitter,
          website: formData.website
        }
      };

      const res = await fetch(`${API_URL}/recruiters/profile`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update profile");
      }

      // Success - update local state with response
      setFormData(prev => ({
        ...prev,
        profilePicture: data.profilePicture || prev.profilePicture
      }));
      
      setImagePreview(data.profilePicture || imagePreview);
      
      toast({ 
        title: "Success", 
        description: "Profile updated successfully!" 
      });
      
      setIsEditing(false);
      
      // Update session storage with new data
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      const updatedUser = { 
        ...currentUser, 
        name: data.name, 
        email: data.email,
        profilePicture: data.profilePicture
      };
      
      sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
      
      // Trigger storage event to update other components
      window.dispatchEvent(new Event('storage'));

    } catch (error) {
      console.error('Profile update error:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Could not update profile.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset image preview to saved profile picture
    setImagePreview(formData.profilePicture);
    setIsEditing(false);
  };

  const triggerFileInput = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
              <p className="text-muted-foreground mt-1">Manage your personal information</p>
            </div>
            <Button 
              onClick={() => isEditing ? handleCancelEdit() : setIsEditing(true)} 
              variant={isEditing ? "outline" : "default"}
            >
              <Edit className="h-4 w-4 mr-2" />
              {isEditing ? 'Cancel Editing' : 'Edit Profile'}
            </Button>
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
                <Card className="lg:col-span-1 h-fit">
                  <CardHeader>
                    <CardTitle>Profile Picture</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center space-y-4">
                    <div 
                      className="relative group cursor-pointer" 
                      onClick={triggerFileInput}
                    >
                      <Avatar className="w-32 h-32 border-4 border-muted">
                        <AvatarImage 
                          src={imagePreview || formData.profilePicture} 
                          className="object-cover" 
                        />
                        <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                          {getInitials(formData.name || user?.name || 'User')}
                        </AvatarFallback>
                      </Avatar>
                      
                      {isEditing && (
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="text-white h-8 w-8" />
                        </div>
                      )}
                      
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageUpload} 
                        accept="image/*" 
                        className="hidden" 
                      />
                    </div>
                    
                    {isEditing && (
                      <p className="text-xs text-muted-foreground text-center">
                        Click to upload new image<br />
                        (Max 5MB, JPG/PNG)
                      </p>
                    )}
                    
                    <div className="text-center">
                      <h3 className="text-xl font-semibold">
                        {formData.name || user?.name || 'Your Name'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formData.specialization || 'Recruiter'}
                      </p>
                      {user?.role === 'admin' && (
                        <Badge className="mt-2">Admin</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Info Forms */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Basic Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Basic Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name *</Label>
                        <Input 
                          value={formData.name} 
                          onChange={e => handleInputChange('name', e.target.value)} 
                          disabled={!isEditing}
                          placeholder="Enter your full name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input 
                          type="email"
                          value={formData.email} 
                          onChange={e => handleInputChange('email', e.target.value)} 
                          disabled={!isEditing}
                          placeholder="your.email@example.com"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input 
                          value={formData.phone} 
                          onChange={e => handleInputChange('phone', e.target.value)} 
                          disabled={!isEditing}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Input 
                          value={formData.location} 
                          onChange={e => handleInputChange('location', e.target.value)} 
                          disabled={!isEditing}
                          placeholder="City, Country"
                        />
                      </div>
                      
                      <div className="col-span-1 md:col-span-2 space-y-2">
                        <Label>Bio</Label>
                        <Textarea 
                          value={formData.bio} 
                          onChange={e => handleInputChange('bio', e.target.value)} 
                          disabled={!isEditing} 
                          rows={3}
                          placeholder="Tell us about yourself..."
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Professional Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        Professional Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Specialization</Label>
                        <Input 
                          value={formData.specialization} 
                          onChange={e => handleInputChange('specialization', e.target.value)} 
                          disabled={!isEditing}
                          placeholder="e.g., Tech Recruiting"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Years of Experience</Label>
                        <Input 
                          value={formData.experience} 
                          onChange={e => handleInputChange('experience', e.target.value)} 
                          disabled={!isEditing}
                          placeholder="e.g., 5 years"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Social Links */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-primary" />
                        Social Links
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex gap-2 items-center">
                          <Linkedin className="h-4 w-4" />
                          LinkedIn
                        </Label>
                        <Input 
                          value={formData.linkedin} 
                          onChange={e => handleInputChange('linkedin', e.target.value)} 
                          disabled={!isEditing}
                          placeholder="linkedin.com/in/yourprofile"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="flex gap-2 items-center">
                          <Github className="h-4 w-4" />
                          GitHub
                        </Label>
                        <Input 
                          value={formData.github} 
                          onChange={e => handleInputChange('github', e.target.value)} 
                          disabled={!isEditing}
                          placeholder="github.com/yourprofile"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="flex gap-2 items-center">
                          <Twitter className="h-4 w-4" />
                          Twitter
                        </Label>
                        <Input 
                          value={formData.twitter} 
                          onChange={e => handleInputChange('twitter', e.target.value)} 
                          disabled={!isEditing}
                          placeholder="twitter.com/yourprofile"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="flex gap-2 items-center">
                          <Globe className="h-4 w-4" />
                          Website
                        </Label>
                        <Input 
                          value={formData.website} 
                          onChange={e => handleInputChange('website', e.target.value)} 
                          disabled={!isEditing}
                          placeholder="yourwebsite.com"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Save Buttons */}
                  {isEditing && (
                    <div className="flex justify-end gap-3">
                      <Button 
                        variant="outline" 
                        onClick={handleCancelEdit}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSaveProfile} 
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.totalSubmissions}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Submissions
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {stats.interviews}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Interviews Scheduled
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.joined}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Successful Placements
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {stats.successRate}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Success Rate
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Funnel Efficiency */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Recruitment Funnel Efficiency
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-1 text-sm font-medium">
                      <span>Submission to Interview</span>
                      <span>
                        {stats.totalSubmissions 
                          ? Math.round((stats.interviews / stats.totalSubmissions) * 100) 
                          : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={stats.totalSubmissions 
                        ? (stats.interviews / stats.totalSubmissions) * 100 
                        : 0} 
                      className="h-3 bg-blue-100" 
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1 text-sm font-medium">
                      <span>Interview to Offer</span>
                      <span>
                        {stats.interviews 
                          ? Math.round((stats.offers / stats.interviews) * 100) 
                          : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={stats.interviews 
                        ? (stats.offers / stats.interviews) * 100 
                        : 0} 
                      className="h-3 bg-purple-100" 
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1 text-sm font-medium">
                      <span>Overall Success Rate</span>
                      <span>{stats.successRate}%</span>
                    </div>
                    <Progress 
                      value={stats.successRate} 
                      className="h-3 bg-green-100" 
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
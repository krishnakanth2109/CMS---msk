import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Plus, Search, Edit, Download, Phone, Mail,
  Building, Briefcase, Loader2, Ban, List, LayoutGrid,
  Calendar, GraduationCap, Award, UserCircle, Star, Target, 
  MessageSquare, Linkedin, MessageCircle, Eye, IndianRupee, Upload, FileUp, FileText, X, CheckSquare,
  Trash2, AlertTriangle, FileSpreadsheet
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function RecruiterCandidates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const = useSearchParams();
  
  // --- State Management ---
  const = useState([]);
  const = useState([]);
  const = useState([]); 
  const = useState(true);
  const = useState(null);
  const = useState(false);

  // Filters & Views
  const = useState('');
  const = useState('all');
  const = useState('table');
  const = useState(null); 
  const = useState([]);
  
  // Status Update Cascading Dropdown
  const = useState(null);
  const = useState('');
  const = useState('');
  const = useState('');
  
  // Remarks Inline Editing
  const = useState(null);
  const = useState('');
  
  // Dialogs
  const = useState(false);
  const = useState(false);
  const = useState(false);
  const = useState(null);
  const = useState(false);

  // Delete State
  const = useState(false);
  const = useState(false);

  // Import Excel State
  const = useState(false);
  const = useState(null);
  const = useState(false);
  const = useState(null);

  const = useState({});

  const standardSources =;
  
  const allStatuses =;

  const = useState(false);

  const initialFormState = {
    name: '', email: '', contact: '', dateOfBirth: '', gender: '', linkedin: '',
    currentLocation: '', preferredLocation: '',
    position: '', client: '', industry: '', currentCompany: '', skills: '',
    totalExperience: '', relevantExperience: '',
    education: '',
    ctc: '', ectc: '', 
    takeHomeSalary: '',
    currentTakeHome: '',
    expectedTakeHome: '',
    noticePeriod: '',
    servingNoticePeriod: 'false',
    noticePeriodDays: '',
    offersInHand: 'false',
    offerPackage: '',
    source: 'Portal', 
    status:, 
    rating: '0', assignedJobId: '',
    dateAdded: new Date().toISOString().split('T'),
    notes: '', remarks: '',
    active: true
  };
  
  const = useState(initialFormState);

  // --- Resume Upload Handler ---
  const handleResumeUpload = async (event) => {
    const file = event.target.files?.;
    if (!file) return;

    const allowedTypes =;
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Invalid File Type', description: 'Please upload a PDF or DOC/DOCX file', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'Resume must be less than 5MB', variant: 'destructive' });
      return;
    }

    setIsParsingResume(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('resume', file);

      const response = await fetch(`${API_URL}/candidates/parse-resume`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('authToken')}` },
        body: uploadFormData
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.message || 'Failed to parse resume');

      if (result.success && result.data) {
        const cleanContact = result.data.contact ? result.data.contact.replace(/\D/g, '').slice(0, 10) : '';
        const cleanTotalExp = result.data.totalExperience ? String(result.data.totalExperience).replace(//g, '') : '';

        setFormData(prev => ({
          ...prev,
          name: result.data.name || prev.name,
          email: result.data.email || prev.email,
          contact: cleanContact || prev.contact,
          skills: result.data.skills || prev.skills,
          totalExperience: cleanTotalExp || prev.totalExperience,
          education: result.data.education || prev.education,
          currentLocation: result.data.currentLocation || prev.currentLocation,
          currentCompany: result.data.currentCompany || prev.currentCompany,
        }));

        toast({ title: 'Resume Parsed Successfully', description: 'Form fields have been auto-filled.', duration: 5000 });
      }

    } catch (error) {
      console.error('Resume parsing error:', error);
      toast({ title: 'Parsing Failed', description: error.message || 'Could not extract data', variant: 'destructive' });
    } finally {
      setIsParsingResume(false);
      event.target.value = '';
    }
  };

  // --- Fetch Data ---
  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { 'Authorization': `Bearer ${sessionStorage.getItem('authToken')}` };

      const = await Promise.all();

      if (candRes.ok && jobRes.ok && clientRes.ok) {
        const allCandidates = await candRes.json();
        const allJobs = await jobRes.json();
        const allClients = await clientRes.json();

        // Filter for specific recruiter candidates
        const myCandidates = allCandidates.filter((c) =>
          (c.recruiterId === user?.id || (typeof c.recruiterId === 'object' && c.recruiterId._id === user?.id))
        );

        myCandidates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Ensure status is treated as array even if legacy data is string
        const fixedCandidates = myCandidates.map((c) => ({
            ...c,
            status: Array.isArray(c.status) ? c.status :
        }));

        setCandidates(fixedCandidates);
        setJobs(allJobs);
        setClients(allClients);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load data" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  },[]);

  // --- Handle Query Parameter for Status Filter ---
  useEffect(() => {
    const status = searchParams.get('status');
    if (status) {
      setActiveStatFilter(status);
      setStatusFilter('all');
    }
  },);

  const uniquePositions = useMemo(() => {
    const positions = jobs.map(j => j.position).filter(Boolean);
    return Array.from(new Set(positions));
  },);

  // --- Form Handling ---
  const handleInputChange = (key, value) => {
    let newValue = value;
    if (key === 'contact') {
      newValue = value.replace(/\D/g, ''); 
      if (newValue.length > 10) return; 
    }
    if (.includes(key)) {
       if (!/^\d*\.?\d*$/.test(value)) return;
    }
    setFormData(prev => ({ ...prev,: newValue }));
    if (errors) setErrors(prev => { const n = { ...prev }; delete n; return n; });
  };

  // --- UPDATED Status Handlers with "Select All" Logic ---
  const addStatus = (newStatus) => {
    if (newStatus === 'SELECT_ALL') {
      setFormData(prev => ({ ...prev, status: }));
    } else {
      if (!formData.status.includes(newStatus)) {
        setFormData(prev => ({ ...prev, status: }));
      }
    }
  };

  const removeStatus = (statusToRemove) => {
    setFormData(prev => ({ 
      ...prev, 
      status: prev.status.filter(s => s !== statusToRemove) 
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    const data = formData;
    if (!data.name.trim()) newErrors.name = "Name is required";
    else if (!/^*$/.test(data.name)) newErrors.name = "Name must start with Uppercase";
    
    if (!data.email.trim()) newErrors.email = "Email is required";
    
    if (!data.contact.trim()) newErrors.contact = "Phone is required";
    else if (data.contact.length !== 10) newErrors.contact = "Phone must be exactly 10 digits";

    if (!data.position.trim()) newErrors.position = "Position is required";
    if (!data.client.trim()) newErrors.client = "Client is required";
    if (!data.skills.toString().trim()) newErrors.skills = "Skills are required";

    if (isCustomSource && !data.source.trim()) newErrors.source = "Please specify source";

    if (data.servingNoticePeriod === 'true' && !data.noticePeriodDays.trim()) newErrors.noticePeriodDays = "Please specify days";
    if (data.offersInHand === 'true' && !data.offerPackage.trim()) newErrors.offerPackage = "Please specify package amount";
    
    if (data.status.length === 0) newErrors.status = "At least one status is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- Stats Calculation Logic ---
  const stats = useMemo(() => {
    const countStatus = (s) => candidates.filter(c => 
        Array.isArray(c.status) ? c.status.includes(s) : c.status === s
    ).length;

    return {
      total: candidates.length,
      turnups: countStatus('Turnups'),
      noShow: countStatus('No Show'),
      yetToAttend: countStatus('Yet to attend'),
      selected: countStatus('Selected'),
      rejected: countStatus('Rejected'),
      hold: countStatus('Hold'),
      joined: countStatus('Joined'),
      pipeline: countStatus('Pipeline'),
      backout: countStatus('Backout'),
      sharedProfiles: countStatus('Shared Profiles'),
    };
  },);

  // --- Filter Logic ---
  const getFilteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const searchMatch = 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.candidateId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (Array.isArray(c.skills) && c.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase())));

      const currentStatusArr = Array.isArray(c.status) ? c.status :;
      
      let statCardMatch = true;
      if (activeStatFilter) {
        statCardMatch = currentStatusArr.includes(activeStatFilter);
      }

      const statusDropdownMatch = statusFilter === 'all' || currentStatusArr.includes(statusFilter);
      return searchMatch && statusDropdownMatch && statCardMatch;
    });
  },);

  // --- Exports & Utils ---
  const handleExport = () => {
    if (getFilteredCandidates.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }
    const headers =;
    const escapeCsv = (str) => str ? `"${String(str).replace(/"/g, '""')}"` : '""';
    const rows = getFilteredCandidates.map(c =>);
    const csvContent =.join('\n');
    const blob = new Blob(, { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `candidates_export_${new Date().toISOString().split('T')}.csv`;
    link.click();
  };

  const getStatusBadgeVariant = (status) => {
    if (status === 'Joined' || status === 'Selected') return 'default'; 
    if (status === 'Rejected' || status === 'Backout' || status === 'No Show') return 'destructive';
    if (status === 'Hold' || status === 'Yet to attend' || status === 'Turnups') return 'secondary';
    return 'outline';
  };

  const getInitials = (n) => n.split(' ').map(i => i).join('').toUpperCase().substring(0,2);
  const getCandidateId = (c) => c.candidateId || c._id.substring(c._id.length - 6).toUpperCase();
  const formatSkills = (skills) => !skills ? 'N/A' : Array.isArray(skills) ? skills.slice(0, 3).join(', ') + (skills.length > 3 ? '...' : '') : skills.length > 50 ? skills.substring(0, 50) + '...' : skills;
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
  
  const toggleSelectCandidate = (id) => setSelectedCandidates(prev => prev.includes(id) ? prev.filter(cid => cid !== id) :);
  const selectAllCandidates = () => setSelectedCandidates(selectedCandidates.length === getFilteredCandidates.length ?[] : getFilteredCandidates.map(c => c._id));
  
  const getAssignedJobTitle = (jobId) => {
    if(!jobId) return 'Not Assigned';
    if(typeof jobId === 'object') return `${jobId.position} (${jobId.clientName})`;
    const job = jobs.find(j => j._id === jobId);
    return job ? `${job.position} (${job.clientName})` : jobId;
  };

  // --- Dialog Handlers ---
  const openViewDialog = (c) => {
    setViewingCandidate(c);
    setIsViewDialogOpen(true);
  };

  const openEditDialog = (c) => {
    setErrors({});
    setSelectedCandidateId(c._id);
    const isStandard = standardSources.includes(c.source || 'Portal');
    setIsCustomSource(!isStandard);

    setFormData({
      name: c.name || '', email: c.email || '', contact: c.contact || '',
      dateOfBirth: c.dateOfBirth ? new Date(c.dateOfBirth).toISOString().split('T') : '',
      gender: c.gender || '', linkedin: c.linkedin || '',
      currentLocation: c.currentLocation || '', preferredLocation: c.preferredLocation || '',
      position: c.position || '', client: c.client || '', industry: c.industry || '',
      currentCompany: c.currentCompany || '', skills: Array.isArray(c.skills) ? c.skills.join(', ') : c.skills || '',
      totalExperience: c.totalExperience ? String(c.totalExperience) : '',
      relevantExperience: c.relevantExperience ? String(c.relevantExperience) : '',
      education: c.education || '', 
      ctc: c.ctc ? String(c.ctc) : '', 
      ectc: c.ectc ? String(c.ectc) : '', 
      takeHomeSalary: c.takeHomeSalary ? String(c.takeHomeSalary) : '',
      currentTakeHome: '', 
      expectedTakeHome: '',
      noticePeriod: c.noticePeriod ? String(c.noticePeriod) : '',
      servingNoticePeriod: c.servingNoticePeriod ? 'true' : 'false',
      noticePeriodDays: c.noticePeriodDays || '',
      offersInHand: c.offersInHand ? 'true' : 'false',
      offerPackage: c.offerPackage || '',
      source: c.source || 'Portal', 
      status: Array.isArray(c.status) ? c.status :, 
      rating: c.rating?.toString() || '0',
      assignedJobId: typeof c.assignedJobId === 'object' ? c.assignedJobId._id : c.assignedJobId || '',
      dateAdded: c.dateAdded ? new Date(c.dateAdded).toISOString().split('T') : '',
      notes: c.notes || '', remarks: c.remarks || '', active: c.active !== false
    });
    setIsEditDialogOpen(true);
  };

  // --- API Handlers ---
  const handleSave = async (isEdit) => {
    if (!validateForm()) {
      toast({ title: "Validation Error", description: "Please fix form errors", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const headers = { 'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`, 'Content-Type': 'application/json' };
      
      const payload = {
        ...formData,
        assignedJobId: typeof formData.assignedJobId === 'object' ? formData.assignedJobId._id : formData.assignedJobId,
        recruiterId: user?.id,
        recruiterName: user?.name,
        skills: formData.skills.split(',').map((s) => s.trim()),
        rating: parseInt(formData.rating) || 0
      };

      const url = isEdit ? `${API_URL}/candidates/${selectedCandidateId}` : `${API_URL}/candidates`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });

      if (res.ok) {
        toast({ title: "Success", description: `Candidate ${isEdit ? 'updated' : 'added'} successfully` });
        setIsAddDialogOpen(false); 
        setIsEditDialogOpen(false);
        fetchData();
        setFormData(initialFormState);
      } else { throw new Error(); }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Operation failed" });
    } finally { setIsSubmitting(false); }
  };

  const toggleActiveStatus = async (id, currentStatus) => {
    if(!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'}?`)) return;
    try {
      const headers = { 'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`, 'Content-Type': 'application/json' };
      await fetch(`${API_URL}/candidates/${id}`, { method: 'PUT', headers, body: JSON.stringify({ active: !currentStatus }) });
      toast({ title: "Status Updated" });
      fetchData();
    } catch (error) { toast({ variant: "destructive", title: "Error" }); }
  };

  // --- Bulk Delete Handler ---
  const handleBulkDelete = async () => {
    if (selectedCandidates.length === 0) return;
    
    setIsDeleting(true);
    try {
      const headers = { 'Authorization': `Bearer ${sessionStorage.getItem('authToken')}` };
      
      // Execute all deletes concurrently
      const deletePromises = selectedCandidates.map(id => 
        fetch(`${API_URL}/candidates/${id}`, { method: 'DELETE', headers })
      );

      await Promise.all(deletePromises);

      toast({ title: "Deleted", description: `${selectedCandidates.length} candidate(s) deleted successfully` });
      setSelectedCandidates([]);
      fetchData();
      setIsDeleteConfirmOpen(false);
    } catch (error) {
      console.error("Delete error", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete one or more candidates" });
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Excel Import Handler ---
  const handleImportExcel = async () => {
    if (!importFile) {
      toast({ title: 'No file selected', description: 'Please select an Excel file to import', variant: 'destructive' });
      return;
    }
    setIsImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const response = await fetch(`${API_URL}/candidates/bulk-import`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('authToken')}` },
        body: fd,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Import failed');

      // Upsert response: { imported, created, updated, duplicates, total, errors[] }
      const successCount = result.imported ?? 0;
      const createdCount = result.created ?? successCount;
      const updatedCount = result.updated ?? 0;
      const failCount    = Math.max(0, (result.total ?? 0) - successCount);
      const errorMessages = (result.errors ||[]).map((e) =>
        typeof e === 'string' ? e : `Row ${e.row} (${e.candidate}): ${e.error}`
      );

      setImportResult({ success: successCount, failed: failCount, errors: errorMessages });

      if (successCount > 0) {
        const parts =[];
        if (createdCount > 0) parts.push(`${createdCount} new added`);
        if (updatedCount > 0) parts.push(`${updatedCount} existing updated`);
        toast({ title: 'Import Successful', description: parts.join(', ') + '.' });
        fetchData();
      } else {
        toast({ title: 'Nothing Imported', description: result.message || 'No candidates were added.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Import Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleWhatsApp = (c) => {
    if (!c.contact) return;
    let phone = c.contact.replace(/\D/g, ''); 
    if (phone.length === 10) phone = '91' + phone;
    const firstName = c.name.split(' ');
    const message = `Hi ${firstName}, this is regarding your job application for the ${c.position} position at ${c.client}. Are you available?`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <DashboardSidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w- mx-auto space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div><h1 className="text-3xl font-bold">My Candidates</h1><p className="text-slate-500">Manage pipeline</p></div>
            <div className="flex gap-3">
              {/* Delete Button */}
              {selectedCandidates.length > 0 && (
                <Button 
                  variant="destructive" 
                  onClick={() => setIsDeleteConfirmOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4"/> Delete ({selectedCandidates.length})
                </Button>
              )}
              
              <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4"/> Export</Button>
              <Button variant="outline" className="border-green-500 text-green-700 hover:bg-green-50" onClick={() => { setIsImportDialogOpen(true); setImportFile(null); setImportResult(null); }}>
                <FileSpreadsheet className="mr-2 h-4 w-4"/> Import Excel
              </Button>
              <Button className="bg-blue-600" onClick={() => { setFormData(initialFormState); setErrors({}); setIsAddDialogOpen(true); setIsCustomSource(false); }}>
                <Plus className="mr-2 h-4 w-4"/> Add Candidate
              </Button>
            </div>
          </div>

          {/* --- Stats Grid --- */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard 
              title="Overall Submissions" 
              value={stats.total} 
              color="blue" 
              active={activeStatFilter === null} 
              onClick={() => { setActiveStatFilter(null); setStatusFilter('all'); }} 
            />
            <StatCard 
              title="Turnups" 
              value={stats.turnups} 
              color="cyan" 
              active={activeStatFilter === 'Turnups'} 
              onClick={() => { setActiveStatFilter('Turnups'); setStatusFilter('all'); }} 
            />
            <StatCard 
              title="No Show" 
              value={stats.noShow} 
              color="indigo" 
              active={activeStatFilter === 'No Show'} 
              onClick={() => { setActiveStatFilter('No Show'); setStatusFilter('all'); }} 
            />
            <StatCard 
              title="Yet to attend" 
              value={stats.yetToAttend} 
              color="purple" 
              active={activeStatFilter === 'Yet to attend'} 
              onClick={() => { setActiveStatFilter('Yet to attend'); setStatusFilter('all'); }} 
            />
            <StatCard 
              title="Selected" 
              value={stats.selected} 
              color="green" 
              active={activeStatFilter === 'Selected'} 
              onClick={() => { setActiveStatFilter('Selected'); setStatusFilter('all'); }} 
            />
            <StatCard 
              title="Rejected" 
              value={stats.rejected} 
              color="red" 
              active={activeStatFilter === 'Rejected'} 
              onClick={() => { setActiveStatFilter('Rejected'); setStatusFilter('all'); }} 
            />
            <StatCard 
              title="Hold" 
              value={stats.hold} 
              color="amber" 
              active={activeStatFilter === 'Hold'} 
              onClick={() => { setActiveStatFilter('Hold'); setStatusFilter('all'); }} 
            />
            <StatCard 
              title="Pipeline" 
              value={stats.pipeline} 
              color="orange" 
              active={activeStatFilter === 'Pipeline'} 
              onClick={() => setActiveStatFilter('Pipeline')} 
            />
            <StatCard 
              title="Joined" 
              value={stats.joined} 
              color="emerald" 
              active={activeStatFilter === 'Joined'} 
              onClick={() => setActiveStatFilter('Joined')} 
            />
            <StatCard 
              title="Backout" 
              value={stats.backout} 
              color="red" 
              active={activeStatFilter === 'Backout'} 
              onClick={() => { setActiveStatFilter('Backout'); setStatusFilter('all'); }} 
            />
            <StatCard 
              title="Shared Profiles" 
              value={stats.sharedProfiles} 
              color="cyan" 
              active={activeStatFilter === 'Shared Profiles'} 
              onClick={() => { setActiveStatFilter('Shared Profiles'); setStatusFilter('all'); }} 
            />
          </div>

          <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400"/>
                <Input placeholder="Search name, ID or skills..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-"><SelectValue placeholder="Filter Status"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {allStatuses.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex bg-slate-100 rounded-lg p-1">
                  <Button variant="ghost" size="sm" className={viewMode === 'table' ? 'bg-white shadow' : ''} onClick={() => setViewMode('table')}><List className="h-4 w-4"/></Button>
                  <Button variant="ghost" size="sm" className={viewMode === 'grid' ? 'bg-white shadow' : ''} onClick={() => setViewMode('grid')}><LayoutGrid className="h-4 w-4"/></Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Table/Grid Views */}
          {viewMode === 'table' ? (
            <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-semibold border-b">
                    <tr>
                      <th className="p-4 w-12"><input type="checkbox" checked={getFilteredCandidates.length > 0 && selectedCandidates.length === getFilteredCandidates.length} onChange={selectAllCandidates} className="h-4 w-4 rounded border-slate-300"/></th>
                      <th className="p-3">S.No</th>
                      <th className="p-3">ID</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Client</th>
                      <th className="p-3">Skills</th> 
                      <th className="p-3">Date Added</th>
                      <th className="p-3">Experience</th>
                      <th className="p-3">CTC / ECTC</th>
                      <th className="p-3">Notice</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Remarks</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {getFilteredCandidates.map((c, index) => (
                      <tr key={c._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 pl-4"><input type="checkbox" checked={selectedCandidates.includes(c._id)} onChange={() => toggleSelectCandidate(c._id)} className="h-4 w-4 rounded"/></td>
                        <td className="p-3 text-slate-500">{index + 1}</td>
                        <td className="p-3 font-mono text-xs text-blue-600 font-bold cursor-pointer" onClick={() => { navigator.clipboard.writeText(getCandidateId(c)); toast({title: "Copied ID"}); }}>{getCandidateId(c)}</td>
                        <td className="p-3"><div className="flex items-center gap-2"><Avatar className="h-8 w-8"><AvatarFallback>{getInitials(c.name)}</AvatarFallback></Avatar><span className="font-semibold">{c.name}</span></div></td>
                        <td className="p-3 text-sm text-slate-600"><div className="flex items-center gap-2">{c.contact} <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-green-600" onClick={() => handleWhatsApp(c)}><MessageCircle className="h-3.5 w-3.5"/></Button></div></td>
                        <td className="p-3 text-sm text-slate-600"><span className="truncate max-w- block" title={c.email}>{c.email}</span></td>
                        <td className="p-3 text-slate-600">{c.client}</td>
                        <td className="p-3 text-xs text-slate-600 max-w- truncate" title={Array.isArray(c.skills) ? c.skills.join(', ') : c.skills}>{formatSkills(c.skills)}</td>
                        <td className="p-3 text-sm text-slate-600">{formatDate(c.dateAdded)}</td>
                        <td className="p-3 text-sm">{c.totalExperience} Yrs</td>
                        <td className="p-3 text-xs"><div>{c.ctc || '-'}</div><div className="text-green-600">{c.ectc || '-'}</div></td>
                        <td className="p-3 text-sm"><Badge variant="outline">{c.noticePeriod || '-'}</Badge></td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(c.status) ? c.status.map(s => (
                              <Badge key={s} variant={getStatusBadgeVariant(s)} className="text- px-1 py-0">{s}</Badge>
                            )) : <Badge variant={getStatusBadgeVariant(c.status)}>{c.status}</Badge>}
                          </div>
                        </td>
                        <td className="p-3 text-xs text-slate-500 truncate max-w-">{c.remarks}</td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openViewDialog(c)}><Eye className="h-3.5 w-3.5"/></Button>
                            <Button size="sm" variant="ghost" onClick={() => openEditDialog(c)}><Edit className="h-3.5 w-3.5 text-blue-600"/></Button>
                            <Button size="sm" variant="ghost" onClick={() => toggleActiveStatus(c._id, c.active !== false)}><Ban className="h-3.5 w-3.5 text-red-600"/></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getFilteredCandidates.map(c => (
                    <Card key={c._id} className="hover:shadow-lg transition-all group">
                        <CardContent className="p-6">
                            <div className="flex justify-between mb-4">
                                <div className="flex gap-3">
                                    <Avatar><AvatarFallback>{getInitials(c.name)}</AvatarFallback></Avatar>
                                    <div>
                                        <h3 className="font-bold">{c.name}</h3>
                                        <p className="text-sm text-blue-600 font-mono">{getCandidateId(c)}</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1 justify-end max-w-">
                                  {Array.isArray(c.status) ? c.status.slice(0, 2).map(s => (
                                    <Badge key={s} variant={getStatusBadgeVariant(s)} className="text-">{s}</Badge>
                                  )) : <Badge variant={getStatusBadgeVariant(c.status)}>{c.status}</Badge>}
                                  {Array.isArray(c.status) && c.status.length > 2 && <span className="text-xs text-slate-500">+{c.status.length - 2}</span>}
                                </div>
                            </div>
                            <div className="space-y-2 text-sm text-slate-600">
                                <div className="flex items-center gap-2"><Building className="h-4 w-4"/> {c.client}</div>
                                <div className="flex items-center gap-2"><Award className="h-4 w-4"/> {formatSkills(c.skills)}</div>
                                <div className="flex items-center gap-2"><Mail className="h-4 w-4"/> {c.email}</div>
                                <div className="flex items-center gap-2"><Phone className="h-4 w-4"/> {c.contact}</div>
                            </div>
                            <div className="mt-4 flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => setViewingCandidate(c)}>View</Button>
                                <Button variant="outline" className="flex-1" onClick={() => openEditDialog(c)}>Edit</Button>
                                <Button variant="outline" className="text-green-600 hover:bg-green-50" onClick={() => handleWhatsApp(c)}><MessageCircle className="h-4 w-4"/></Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5"/> Confirm Deletion
             </DialogTitle>
             <DialogDescription>
               Are you sure you want to delete <strong>{selectedCandidates.length}</strong> selected candidate(s)? This action cannot be undone.
             </DialogDescription>
           </DialogHeader>
           <DialogFooter>
             <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} disabled={isDeleting}>Cancel</Button>
             <Button variant="destructive" onClick={handleBulkDelete} disabled={isDeleting}>
               {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Delete
             </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Candidate Dialog */}
      <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => { if(!open) { setIsAddDialogOpen(false); setIsEditDialogOpen(false); } }}>
        <DialogContent className="max-w-6xl max-h- overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{isEditDialogOpen ? 'Edit Candidate' : 'Add New Candidate'}</DialogTitle>
            </DialogHeader>
            {!isEditDialogOpen && (
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 bg-slate-50 dark:bg-slate-900/50 mb-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full"><FileUp className="h-6 w-6 text-blue-600" /></div>
                  <div className="text-center">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Upload Resume to Auto-Fill</h3>
                    <p className="text-sm text-slate-500 mb-3">Upload PDF or DOC/DOCX file (max 5MB)</p>
                  </div>
                  <label htmlFor="resume-upload-recruiter">
                    <input id="resume-upload-recruiter" type="file" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} className="hidden" disabled={isParsingResume} />
                    <Button type="button" variant="outline" disabled={isParsingResume} onClick={() => document.getElementById('resume-upload-recruiter')?.click()}>
                      {isParsingResume ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Parsing...</> : <><Upload className="mr-2 h-4 w-4" />Choose File</>}
                    </Button>
                  </label>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
              
              <div className="md:col-span-3 font-semibold border-b pb-1 text-slate-500 flex items-center gap-2"><UserCircle className="h-4 w-4"/> Personal Information</div>
              
              <div className="space-y-2">
                <Label className={errors.name ? "text-red-500" : ""}>Full Name *</Label>
                <Input value={formData.name} onChange={e => handleInputChange('name', e.target.value)} className={errors.name ? "border-red-500" : ""} placeholder="Starts with Uppercase"/>
                {errors.name && <span className="text-xs text-red-500">{errors.name}</span>}
              </div>
              <div className="space-y-2">
                <Label className={errors.email ? "text-red-500" : ""}>Email *</Label>
                <Input value={formData.email} onChange={e => handleInputChange('email', e.target.value)} className={errors.email ? "border-red-500" : ""} placeholder="user@domain.com"/>
                {errors.email && <span className="text-xs text-red-500">{errors.email}</span>}
              </div>
              <div className="space-y-2">
                <Label className={errors.contact ? "text-red-500" : ""}>Phone *</Label>
                <Input value={formData.contact} onChange={e => handleInputChange('contact', e.target.value)} className={errors.contact ? "border-red-500" : ""} placeholder="10 Digits Only"/>
                {errors.contact && <span className="text-xs text-red-500">{errors.contact}</span>}
              </div>
              
              <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={formData.dateOfBirth} onChange={e => handleInputChange('dateOfBirth', e.target.value)}/></div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={formData.gender} onValueChange={val => handleInputChange('gender', val)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>LinkedIn</Label>
                <div className="relative"><Linkedin className="absolute left-2 top-2.5 h-4 w-4 text-slate-400"/><Input className="pl-8" value={formData.linkedin} onChange={e => handleInputChange('linkedin', e.target.value)} placeholder="Profile URL"/></div>
              </div>
              <div className="space-y-2"><Label>Current Location</Label><Input value={formData.currentLocation} onChange={e => handleInputChange('currentLocation', e.target.value)}/></div>
              <div className="space-y-2"><Label>Preferred Location</Label><Input value={formData.preferredLocation} onChange={e => handleInputChange('preferredLocation', e.target.value)}/></div>

              <div className="md:col-span-3 font-semibold border-b pb-1 text-slate-500 mt-4 flex items-center gap-2"><Briefcase className="h-4 w-4"/> Professional Information</div>
              
              <div className="space-y-2">
                <Label className={errors.position ? "text-red-500" : ""}>Position *</Label>
                <Select value={formData.position} onValueChange={(val) => handleInputChange('position', val)}>
                    <SelectTrigger className={errors.position ? "border-red-500" : ""}><SelectValue placeholder="Select Position" /></SelectTrigger>
                    <SelectContent>{uniquePositions.map((pos) => (<SelectItem key={pos} value={pos}>{pos}</SelectItem>))}</SelectContent>
                </Select>
                {errors.position && <span className="text-xs text-red-500">{errors.position}</span>}
              </div>

              <div className="space-y-2">
                <Label className={errors.client ? "text-red-500" : ""}>Client *</Label>
                <Select value={formData.client} onValueChange={(val) => handleInputChange('client', val)}>
                    <SelectTrigger className={errors.client ? "border-red-500" : ""}><SelectValue placeholder="Select Client" /></SelectTrigger>
                    <SelectContent>{clients.map((client) => (<SelectItem key={client._id} value={client.companyName}>{client.companyName}</SelectItem>))}</SelectContent>
                </Select>
                {errors.client && <span className="text-xs text-red-500">{errors.client}</span>}
              </div>

              <div className="space-y-2"><Label>Current Company</Label><Input value={formData.currentCompany} onChange={e => handleInputChange('currentCompany', e.target.value)}/></div>
              <div className="space-y-2"><Label>Industry</Label><Input value={formData.industry} onChange={e => handleInputChange('industry', e.target.value)}/></div>
              <div className="md:col-span-2 space-y-2">
                <Label className={errors.skills ? "text-red-500" : ""}>Skills (comma separated) *</Label>
                <Input value={formData.skills} onChange={e => handleInputChange('skills', e.target.value)} className={errors.skills ? "border-red-500" : ""}/>
                {errors.skills && <span className="text-xs text-red-500">{errors.skills}</span>}
              </div>

              <div className="md:col-span-3 font-semibold text-slate-500 border-b pb-1 mt-4 flex items-center gap-2"><GraduationCap className="h-4 w-4"/> Education</div>
              <div className="md:col-span-3 space-y-1"><Label>Qualification</Label><Input value={formData.education} onChange={e => handleInputChange('education', e.target.value)} placeholder="e.g. B.Tech from IIT Delhi"/></div>

              <div className="md:col-span-3 font-semibold text-slate-500 border-b pb-1 mt-4 flex items-center gap-2"><IndianRupee className="h-4 w-4"/> Experience & Pay</div>
              <div className="space-y-2"><Label>Total Exp (Yrs)</Label><Input value={formData.totalExperience} onChange={e => handleInputChange('totalExperience', e.target.value)} placeholder="Numbers only"/></div>
              <div className="space-y-2"><Label>Relevant Exp (Yrs)</Label><Input value={formData.relevantExperience} onChange={e => handleInputChange('relevantExperience', e.target.value)} placeholder="Numbers only"/></div>
              
              <div className="space-y-2">
                 <Label>Serving Notice?</Label>
                 <Select value={formData.servingNoticePeriod} onValueChange={(val) => handleInputChange('servingNoticePeriod', val)}>
                     <SelectTrigger><SelectValue/></SelectTrigger>
                     <SelectContent><SelectItem value="false">No</SelectItem><SelectItem value="true">Yes</SelectItem></SelectContent>
                 </Select>
              </div>

              {formData.servingNoticePeriod === 'true' && (
                <div className="space-y-2">
                    <Label className={errors.noticePeriodDays ? "text-red-500" : ""}>Days Remaining *</Label>
                    <Input value={formData.noticePeriodDays} onChange={e => handleInputChange('noticePeriodDays', e.target.value)} placeholder="e.g. 30" />
                    {errors.noticePeriodDays && <span className="text-xs text-red-500">{errors.noticePeriodDays}</span>}
                </div>
              )}

              <div className="space-y-2"><Label>Current CTC (Lakhs)</Label><Input value={formData.ctc} onChange={e => handleInputChange('ctc', e.target.value)} placeholder="Numbers only"/></div>
              <div className="space-y-2"><Label>Expected CTC (Lakhs)</Label><Input value={formData.ectc} onChange={e => handleInputChange('ectc', e.target.value)} placeholder="Numbers only"/></div>
              
              <div className="space-y-2">
                  <Label>Offers in Hand?</Label>
                  <Select value={formData.offersInHand} onValueChange={(val) => handleInputChange('offersInHand', val)}>
                     <SelectTrigger><SelectValue/></SelectTrigger>
                     <SelectContent><SelectItem value="false">No</SelectItem><SelectItem value="true">Yes</SelectItem></SelectContent>
                  </Select>
               </div>
               
               <div className="space-y-2">
                 <Label> Current Take Home (Thousands)</Label>
                 <Input 
                   value={formData.currentTakeHome} 
                   onChange={e => handleInputChange('currentTakeHome', e.target.value)} 
                   placeholder="Numbers only"
                  />
               </div>
               <div className="space-y-2">
                 <Label> Expected Take Home (Thousands)</Label>
                 <Input 
                   value={formData.expectedTakeHome} 
                   onChange={e => handleInputChange('expectedTakeHome', e.target.value)} 
                   placeholder="Numbers only"
                  />
               </div>
               <div className="space-y-2"><Label>Reason For Change</Label><Textarea value={formData.notes} onChange={e => handleInputChange('notes', e.target.value)} className="w-full border rounded-md p-2 h-10 text-sm"
  placeholder="Reason for changing"/></div>

               {formData.offersInHand === 'true' && (
                 <div className="space-y-2">
                    <Label className={errors.offerPackage ? "text-red-500" : ""}>Package Amount *</Label>
                    <Input value={formData.offerPackage} onChange={e => handleInputChange('offerPackage', e.target.value)} placeholder="e.g. 15 LPA" />
                    {errors.offerPackage && <span className="text-xs text-red-500">{errors.offerPackage}</span>}
                 </div>
               )}

              <div className="md:col-span-3 font-semibold text-slate-500 border-b pb-1 mt-4 flex items-center gap-2"><Target className="h-4 w-4"/> Recruitment Details</div>
              <div className="space-y-2">
                 <Label>Source</Label>
                 <Select value={isCustomSource ? 'Other' : formData.source} onValueChange={v => { if(v==='Other'){setIsCustomSource(true);handleInputChange('source','')}else{setIsCustomSource(false);handleInputChange('source',v)} }}>
                    <SelectTrigger><SelectValue placeholder="Source"/></SelectTrigger>
                    <SelectContent>{standardSources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}<SelectItem value="Other">Other</SelectItem></SelectContent>
                 </Select>
                 {isCustomSource && <Input className="mt-1" value={formData.source} onChange={e => handleInputChange('source', e.target.value)} placeholder="Enter Source"/>}
              </div>
              <div className="space-y-2">
                <Label>Assigned Job</Label>
                <Select value={typeof formData.assignedJobId === 'object' ? formData.assignedJobId._id : formData.assignedJobId || ''} onValueChange={val => handleInputChange('assignedJobId', val)}>
                  <SelectTrigger><SelectValue placeholder="Select Job" /></SelectTrigger>
                  <SelectContent>{jobs.map(j => <SelectItem key={j._id} value={j._id}>{j.position} - {j.clientName}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {/* --- UPDATED: Status Multi-Select --- */}
              <div className="space-y-2">
                <Label className={errors.status ? "text-red-500" : ""}>Status (Multi-select)</Label>
                
                {/* Box showing selected options */}
                <div className={`border rounded-md p-2 min-h- flex flex-wrap gap-2 bg-white dark:bg-slate-900 ${errors.status ? 'border-red-500' : ''}`}>
                  {formData.status.length > 0 ? (
                    formData.status.map(status => (
                      <Badge key={status} variant="secondary" className="flex items-center gap-1">
                        {status}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-red-500" 
                          onClick={() => removeStatus(status)}
                        />
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400 p-1">No status selected</span>
                  )}
                </div>

                {/* Dropdown with key={} force reset trick */}
                <Select 
                  key={formData.status.length} // Forces component reset after selection
                  onValueChange={addStatus}
                >
                    <SelectTrigger>
                      <SelectValue placeholder="Add a status..." />
                    </SelectTrigger>
                    <SelectContent>
                        {/* ✅ Added Select All Option */}
                        <SelectItem value="SELECT_ALL" className="font-bold border-b border-slate-200 mb-1 text-blue-600">
                           <div className="flex items-center gap-2"><CheckSquare className="h-4 w-4"/> Select All</div>
                        </SelectItem>
                        {allStatuses.map(status => (
                            <SelectItem key={status} value={status} disabled={formData.status.includes(status)}>
                              {status}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.status && <span className="text-xs text-red-500">{errors.status}</span>}
              </div>
              
              <div className="space-y-2"><Label>Rating</Label><Select value={formData.rating} onValueChange={v => handleInputChange('rating', v)}><SelectTrigger><SelectValue placeholder="Rate"/></SelectTrigger><SelectContent>{.map(r=><SelectItem key={r} value={r.toString()}>{r} Stars</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Date Added</Label><Input type="date" value={formData.dateAdded} onChange={e => handleInputChange('dateAdded', e.target.value)}/></div>
              <div className="md:col-span-3 space-y-2 mt-2"><Label>Remarks</Label><Textarea value={formData.remarks} onChange={e => handleInputChange('remarks', e.target.value)}/></div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); setIsEditDialogOpen(false); }}>Cancel</Button>
                <Button onClick={() => handleSave(isEditDialogOpen)} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} {isEditDialogOpen ? "Update" : "Save"}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Import Excel Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={(open) => { setIsImportDialogOpen(open); if (!open) { setImportFile(null); setImportResult(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-green-600"/> Import Candidates from Excel</DialogTitle>
            <DialogDescription>
              Upload an Excel file (.xlsx / .xls) to bulk-import candidates. Download the template below to ensure the correct column format.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Template Download */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p className="font-semibold mb-1">Required Excel Columns:</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                name, email, contact, position, client, skills (comma-separated), totalExperience, ctc, ectc, noticePeriod, currentCompany, currentLocation, source, status
              </p>
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto text-blue-600 mt-1"
                onClick={() => {
                  const headers =;
                  const exampleRow =;
                  const csv =.join('\n');
                  const blob = new Blob(, { type: 'text/csv' });
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = 'candidate_import_template.csv';
                  a.click();
                }}
              >
                ↓ Download Template (CSV)
              </Button>
            </div>

            {/* File Upload */}
            <div
              className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
              onClick={() => document.getElementById('excel-import-input')?.click()}
            >
              <FileSpreadsheet className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              {importFile ? (
                <div>
                  <p className="font-semibold text-green-700">{importFile.name}</p>
                  <p className="text-xs text-slate-500">{(importFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="text-slate-600 font-medium">Click to choose Excel file</p>
                  <p className="text-xs text-slate-400 mt-1">.xlsx or .xls, max 10MB</p>
                </div>
              )}
              <input
                id="excel-import-input"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => { setImportFile(e.target.files?. || null); setImportResult(null); }}
              />
            </div>

            {/* Import Results */}
            {importResult && (
              <div className={`rounded-lg p-4 text-sm ${importResult.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                <p className="font-semibold text-green-700">✅ {importResult.success} candidate(s) processed successfully</p>
                {importResult.failed > 0 && (
                  <div className="mt-2">
                    <p className="font-semibold text-red-600">❌ {importResult.failed} rows failed</p>
                    <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-red-600 space-y-1">
                      {importResult.errors.map((err, i) => <li key={i}>• {err}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={!importFile || isImporting}
              onClick={handleImportExcel}
            >
              {isImporting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Importing...</> : <><FileSpreadsheet className="mr-2 h-4 w-4"/> Import Now</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog Logic */}
      {viewingCandidate && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h- overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-3">
                <Avatar className="h-10 w-10"><AvatarFallback className="bg-blue-600 text-white">{getInitials(viewingCandidate.name)}</AvatarFallback></Avatar>
                {viewingCandidate.name} 
                <div className="ml-auto flex flex-wrap gap-2">
                  {Array.isArray(viewingCandidate.status) ? 
                    viewingCandidate.status.map(s => <Badge key={s} variant={getStatusBadgeVariant(s)}>{s}</Badge>) : 
                    <Badge variant={getStatusBadgeVariant(viewingCandidate.status)}>{viewingCandidate.status}</Badge>
                  }
                </div>
              </DialogTitle>
              <DialogDescription className="font-mono text-blue-600 text-sm">ID: {getCandidateId(viewingCandidate)}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                   <h3 className="font-semibold text-slate-800 border-b pb-2 flex items-center gap-2"><UserCircle className="h-4 w-4"/> Personal Information</h3>
                   <div className="grid grid-cols-2 gap-y-3 text-sm">
                      <div><Label className="text-xs text-slate-500">Email</Label><div>{viewingCandidate.email}</div></div>
                      <div>
                          <Label className="text-xs text-slate-500">Phone</Label>
                          <div className="flex items-center gap-2">
                             <div>{viewingCandidate.contact}</div>
                             <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-green-600" onClick={() => handleWhatsApp(viewingCandidate)}><MessageCircle className="h-3.5 w-3.5" /></Button>
                          </div>
                      </div>
                      <div><Label className="text-xs text-slate-500">Date of Birth</Label><div>{formatDate(viewingCandidate.dateOfBirth)}</div></div>
                      <div><Label className="text-xs text-slate-500">Gender</Label><div>{viewingCandidate.gender || '-'}</div></div>
                      <div className="col-span-2"><Label className="text-xs text-slate-500">LinkedIn</Label><div>{viewingCandidate.linkedin ? <a href={viewingCandidate.linkedin} target="_blank" className="text-blue-600 hover:underline flex items-center gap-1"><Linkedin className="h-3 w-3"/> {viewingCandidate.linkedin}</a> : '-'}</div></div>
                      <div><Label className="text-xs text-slate-500">Current Location</Label><div>{viewingCandidate.currentLocation || '-'}</div></div>
                      <div><Label className="text-xs text-slate-500">Preferred Location</Label><div>{viewingCandidate.preferredLocation || '-'}</div></div>
                   </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                   <h3 className="font-semibold text-slate-800 border-b pb-2 flex items-center gap-2"><Briefcase className="h-4 w-4"/> Professional Details</h3>
                   <div className="grid grid-cols-2 gap-y-3 text-sm">
                      <div><Label className="text-xs text-slate-500">Position</Label><div>{viewingCandidate.position}</div></div>
                      <div><Label className="text-xs text-slate-500">Client</Label><div>{viewingCandidate.client}</div></div>
                      <div><Label className="text-xs text-slate-500">Industry</Label><div>{viewingCandidate.industry || '-'}</div></div>
                      <div><Label className="text-xs text-slate-500">Current Company</Label><div>{viewingCandidate.currentCompany || '-'}</div></div>
                      <div className="col-span-2"><Label className="text-xs text-slate-500">Skills</Label><div className="flex flex-wrap gap-1 mt-1">{Array.isArray(viewingCandidate.skills) ? viewingCandidate.skills.map(s => <Badge key={s} variant="outline" className="bg-white">{s}</Badge>) : viewingCandidate.skills}</div></div>
                   </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                   <h3 className="font-semibold text-slate-800 border-b pb-2 flex items-center gap-2"><IndianRupee className="h-4 w-4"/> Experience & Compensation</h3>
                   <div className="grid grid-cols-2 gap-y-3 text-sm">
                      <div><Label className="text-xs text-slate-500">Total Exp</Label><div>{viewingCandidate.totalExperience} Years</div></div>
                      <div><Label className="text-xs text-slate-500">Relevant Exp</Label><div>{viewingCandidate.relevantExperience} Years</div></div>
                      <div><Label className="text-xs text-slate-500">Current CTC</Label><div>{viewingCandidate.ctc}</div></div>
                      <div><Label className="text-xs text-slate-500">Expected CTC</Label><div>{viewingCandidate.ectc}</div></div>
                      
                      {/* --- Added Take Home Salary View --- */}
                      <div><Label className="text-xs text-slate-500">Take Home Salary</Label><div>{viewingCandidate.takeHomeSalary || '-'}</div></div>

                      {viewingCandidate.servingNoticePeriod && (
                        <div><Label className="text-xs text-slate-500">Notice Period</Label><div className="text-amber-600 font-medium">Serving ({viewingCandidate.noticePeriodDays} days left)</div></div>
                      )}
                      
                      {viewingCandidate.offersInHand && (
                        <div><Label className="text-xs text-slate-500">Offers</Label><div className="text-green-600 font-medium">Yes ({viewingCandidate.offerPackage})</div></div>
                      )}
                   </div>
                </div>
                <div className="col-span-1 md:col-span-2 bg-slate-50 p-4 rounded-lg space-y-3">
                   <h3 className="font-semibold text-slate-800 border-b pb-2 flex items-center gap-2"><Target className="h-4 w-4"/> Recruitment Metadata</h3>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 text-sm">
                      <div><Label className="text-xs text-slate-500">Source</Label><div>{viewingCandidate.source}</div></div>
                      <div><Label className="text-xs text-slate-500">Assigned Job</Label><div>{getAssignedJobTitle(viewingCandidate.assignedJobId)}</div></div>
                      <div><Label className="text-xs text-slate-500">Recruiter</Label><div>{viewingCandidate.recruiterName || 'Self'}</div></div>
                      <div><Label className="text-xs text-slate-500">Date Added</Label><div>{formatDate(viewingCandidate.dateAdded)}</div></div>
                      <div><Label className="text-xs text-slate-500">Rating</Label><div className="flex items-center gap-1">{viewingCandidate.rating} <Star className="h-3 w-3 fill-yellow-400 text-yellow-400"/></div></div>
                      {Array.isArray(viewingCandidate.status) && viewingCandidate.status.includes('Rejected') && <div className="col-span-2 text-red-600"><Label className="text-xs text-red-400">Rejection Reason</Label><div>{viewingCandidate.rejectionReason}</div></div>}
                   </div>
                </div>
                <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                        <Label className="text-xs font-semibold text-yellow-700 flex items-center gap-2 mb-2"><FileText className="h-3 w-3"/>Remarks</Label>
                        <p className="text-sm text-yellow-900 whitespace-pre-wrap">{viewingCandidate.notes || 'No internal notes.'}</p>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
                <Button onClick={() => { setIsViewDialogOpen(false); openEditDialog(viewingCandidate); }}>Edit Candidate</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

const StatCard = ({ title, value, color, active, onClick }) => {
  const styles = {
    blue:   "border-l-blue-500 text-blue-600 bg-blue-50/50",
    cyan:   "border-l-cyan-500 text-cyan-600 bg-cyan-50/50",
    purple: "border-l-purple-500 text-purple-600 bg-purple-50/50",
    indigo: "border-l-indigo-500 text-indigo-600 bg-indigo-50/50",
    rose:   "border-l-rose-500 text-rose-600 bg-rose-50/50",
    green:  "border-l-green-500 text-green-600 bg-green-50/50",
    emerald:"border-l-emerald-500 text-emerald-600 bg-emerald-50/50",
    red:    "border-l-red-500 text-red-600 bg-red-50/50",
    orange: "border-l-orange-500 text-orange-600 bg-orange-50/50",
    amber:  "border-l-amber-500 text-amber-600 bg-amber-50/50",
  };

  const currentStyle = styles || styles.blue;
  
  return (
    <div 
      onClick={onClick} 
      className={`
        p-4 rounded-lg shadow-sm border border-slate-200 border-l-4 
        cursor-pointer hover:shadow-md transition-all relative overflow-hidden
        bg-white
        ${currentStyle}
        ${active ? 'ring-2 ring-blue-400 ring-offset-1' : ''}
      `}
    >
        <div className="flex justify-between items-center relative z-10">
            <div>
              <h3 className="text-2xl font-bold">{value}</h3>
              <p className="text-sm font-medium opacity-80">{title}</p>
            </div>
        </div>
        
        {/* Visual indicator dot */}
        {active && (
          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600" />
        )}
      
        {/* Bottom accent line */}
        <div className={`absolute bottom-0 left-0 h-1 bg-current transition-all duration-300 opacity-20 ${active ? 'w-full' : 'w-0 group-hover:w-1/3'}`} />
    </div>
  );
};
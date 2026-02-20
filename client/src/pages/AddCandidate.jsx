import { useState, useEffect, useMemo, useRef } from 'react';
import { DashboardSidebar } from '@/components/DashboardSidebar';
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search, Filter, Download, User, Phone, Mail, Building,
  Plus, Edit, Eye, LayoutGrid, List,
  FileText, Loader2, Award, MessageCircle, Users,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:5000';

const StatCard = ({ title, value, color, active, onClick }) => {
  const colors = {
    blue: 'border-l-blue-500 bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-900',
    green: 'border-l-green-500 bg-gradient-to-r from-green-50 to-white dark:from-green-900/20 dark:to-slate-900',
    slate: 'border-l-slate-500 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/20 dark:to-slate-900',
    orange: 'border-l-orange-500 bg-gradient-to-r from-orange-50 to-white dark:from-orange-900/20 dark:to-slate-900',
    purple: 'border-l-purple-500 bg-gradient-to-r from-purple-50 to-white dark:from-purple-900/20 dark:to-slate-900',
    teal: 'border-l-teal-500 bg-gradient-to-r from-teal-50 to-white dark:from-teal-900/20 dark:to-slate-900',
    red: 'border-l-red-500 bg-gradient-to-r from-red-50 to-white dark:from-red-900/20 dark:to-slate-900'
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 border-l-4 ${colors[color]} ${onClick ? 'cursor-pointer hover:shadow-md transition-all' : ''} ${active ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
    >
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{value}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
    </div>
  );
};

export default function AdminCandidates() {
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const [candidates, setCandidates] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [recruiterFilter, setRecruiterFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table');
  const [activeStatFilter, setActiveStatFilter] = useState(null);

  const [sortConfig, setSortConfig] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const [isBulkAssignDialogOpen, setIsBulkAssignDialogOpen] = useState(false);
  const [bulkRecruiterId, setBulkRecruiterId] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [viewCandidate, setViewCandidate] = useState(null);

  const [errors, setErrors] = useState({});
  const [resumeFile, setResumeFile] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact: '',
    position: '',
    skills: '',
    client: '',
    status: 'Submitted',
    recruiterId: '',
    assignedJobId: '',
    totalExperience: '',
    relevantExperience: '',
    ctc: '',
    ectc: '',
    servingNoticePeriod: 'false',
    noticePeriodDays: '',
    offersInHand: 'false',
    offerPackage: '',
    notes: '',
    dateAdded: new Date().toISOString().split('T')[0],
  });

  const getAuthHeader = () => ({
    Authorization: `Bearer ${sessionStorage.getItem('authToken')}`
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resCand, resRec] = await Promise.all([
        fetch(`${API_URL}/candidates`, { headers: { 'Content-Type': 'application/json', ...getAuthHeader() } }),
        fetch(`${API_URL}/recruiters`, { headers: { 'Content-Type': 'application/json', ...getAuthHeader() } })
      ]);

      if (resCand.ok) {
        const data = await resCand.json();
        const safe = Array.isArray(data) ? data : [];
        const mapped = safe.map(c => ({ ...c, id: c._id }));
        mapped.sort((a, b) =>
          new Date(b.createdAt || b.dateAdded) - new Date(a.createdAt || a.dateAdded)
        );
        setCandidates(mapped);
      }

      if (resRec.ok) {
        const data = await resRec.json();
        setRecruiters(Array.isArray(data) ? data.map(r => ({ ...r, id: r._id })) : []);
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to fetch data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const validateForm = () => {
    const e = {};
    const d = formData;

    if (!d.name.trim()) e.name = "Full Name required";
    if (!d.email.trim()) e.email = "Email required";
    if (!d.contact.trim() || d.contact.length !== 10) e.contact = "10 digit phone";
    if (!d.position.trim()) e.position = "Position required";
    if (!d.client.trim()) e.client = "Client required";
    if (!d.skills.trim()) e.skills = "Skills required";
    if (!d.recruiterId) e.recruiterId = "Assign recruiter";

    if (d.servingNoticePeriod === 'true' && !d.noticePeriodDays)
      e.noticePeriodDays = "Enter days";
    if (d.offersInHand === 'true' && !d.offerPackage)
      e.offerPackage = "Enter package";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc')
      direction = 'desc';
    setSortConfig({ key, direction });
  };

  const filteredCandidates = useMemo(() => {
    let result = candidates.filter(c => {
      const name = c.name || '';
      const email = c.email || '';
      const id = c.candidateId || '';
      const client = c.client || '';
      const status = c.status || '';

      const matchSearch =
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'all' || status === statusFilter;
      const recId = typeof c.recruiterId === 'object' ? c.recruiterId?._id : c.recruiterId;
      const matchRec = recruiterFilter === 'all' || recId === recruiterFilter;

      return matchSearch && matchStatus && matchRec;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const av = a[sortConfig.key] || '';
        const bv = b[sortConfig.key] || '';
        if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1;
        if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [candidates, searchTerm, statusFilter, recruiterFilter, sortConfig]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      const copy = { ...errors };
      delete copy[field];
      setErrors(copy);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const url = isEditMode
        ? `${API_URL}/candidates/${selectedCandidateId}`
        : `${API_URL}/candidates`;

      const res = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error();
      toast({ title: 'Success', description: 'Saved' });
      setIsDialogOpen(false);
      fetchData();
    } catch {
      toast({ title: 'Error', description: 'Save failed', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = n => n ? n.split(' ').map(i => i[0]).join('').toUpperCase().slice(0,2) : 'CN';
  const getCandidateId = c => c?.candidateId || '...';

  const stats = useMemo(() => ({
    total: candidates.length,
    active: candidates.filter(c => c.active !== false).length,
    submitted: candidates.filter(c => c.status === 'Submitted').length,
    interview: candidates.filter(c => (c.status || '').includes('Interview')).length,
    offer: candidates.filter(c => c.status === 'Offer').length,
    joined: candidates.filter(c => c.status === 'Joined').length,
    rejected: candidates.filter(c => c.status === 'Rejected').length
  }), [candidates]);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <DashboardSidebar />
      <main className="flex-1 p-6">
        <div className="space-y-6 max-w-[1800px] mx-auto">

          <div className="flex justify-between">
            <div>
              <h1 className="text-3xl font-bold">Candidate Database</h1>
              <p className="text-slate-500">Manage candidates</p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4"/> Add Candidate
            </Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
            <StatCard title="Total" value={stats.total} color="blue"/>
            <StatCard title="Active" value={stats.active} color="green"/>
            <StatCard title="Submitted" value={stats.submitted} color="slate"/>
            <StatCard title="Interview" value={stats.interview} color="orange"/>
            <StatCard title="Offer" value={stats.offer} color="purple"/>
            <StatCard title="Joined" value={stats.joined} color="teal"/>
            <StatCard title="Rejected" value={stats.rejected} color="red"/>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin"/>
            </div>
          ) : (
            <Card>
              <CardContent>
                {filteredCandidates.map(c => (
                  <div key={c.id} className="flex items-center gap-3 py-2 border-b">
                    <Avatar>
                      <AvatarFallback>{getInitials(c.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs text-blue-600">{getCandidateId(c)}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { setViewCandidate(c); setIsViewDialogOpen(true); }}>
                      <Eye className="h-4 w-4"/>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}
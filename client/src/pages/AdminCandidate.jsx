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
        const safeData = Array.isArray(data) ? data : [];
        const mappedCandidates = safeData.map(c => ({ ...c, id: c._id }));
        mappedCandidates.sort(
          (a, b) =>
            new Date(b.createdAt || b.dateAdded).getTime() -
            new Date(a.createdAt || a.dateAdded).getTime()
        );
        setCandidates(mappedCandidates);
      }

      if (resRec.ok) {
        const data = await resRec.json();
        setRecruiters(Array.isArray(data) ? data.map(r => ({ ...r, id: r._id })) : []);
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to fetch data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const validateForm = () => {
    const newErrors = {};
    const data = formData;

    if (!data.name.trim()) newErrors.name = 'Full Name is required';
    else if (!/^[A-Z][a-zA-Z\s]*$/.test(data.name))
      newErrors.name = 'Name must start with uppercase and alphabets only';

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!data.email.trim()) newErrors.email = 'Email is required';
    else if (!emailRegex.test(data.email)) newErrors.email = 'Invalid email';

    if (!data.contact.trim()) newErrors.contact = 'Phone required';
    else if (data.contact.length !== 10) newErrors.contact = 'Phone must be 10 digits';

    if (!data.position.trim()) newErrors.position = 'Position required';
    if (!data.client.trim()) newErrors.client = 'Client required';
    if (!data.skills.trim()) newErrors.skills = 'Skills required';
    if (!data.recruiterId) newErrors.recruiterId = 'Assign recruiter';

    if (data.servingNoticePeriod === 'true' && !data.noticePeriodDays)
      newErrors.noticePeriodDays = 'Specify days';

    if (data.offersInHand === 'true' && !data.offerPackage)
      newErrors.offerPackage = 'Specify package';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSort = key => {
    let direction = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc')
      direction = 'desc';
    setSortConfig({ key, direction });
  };

  const filteredCandidates = useMemo(() => {
    let result = candidates.filter(c => {
      const cName = c.name || '';
      const cEmail = c.email || '';
      const cCandId = c.candidateId || '';
      const cClient = c.client || '';
      const cStatus = c.status || '';

      const matchesSearch =
        cName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cCandId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cClient.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || cStatus === statusFilter;

      const cRecruiterId =
        c.recruiterId && typeof c.recruiterId === 'object'
          ? c.recruiterId._id
          : c.recruiterId;

      const matchesRecruiter =
        recruiterFilter === 'all' || cRecruiterId === recruiterFilter;

      let statCardMatch = true;
      if (activeStatFilter) {
        if (activeStatFilter === 'submitted') statCardMatch = cStatus === 'Submitted';
        if (activeStatFilter === 'interview') statCardMatch = cStatus.includes('Interview');
        if (activeStatFilter === 'offer') statCardMatch = cStatus === 'Offer';
        if (activeStatFilter === 'active') statCardMatch = c.active !== false;
      }

      return matchesSearch && matchesStatus && matchesRecruiter && statCardMatch;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = sortConfig.key === 'candidateId'
          ? a.candidateId
          : a[sortConfig.key];
        const bValue = sortConfig.key === 'candidateId'
          ? b.candidateId
          : b[sortConfig.key];

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [candidates, searchTerm, statusFilter, recruiterFilter, activeStatFilter, sortConfig]);

  const handleSelectAll = checked => {
    if (checked) setSelectedIds(filteredCandidates.map(c => c._id || c.id));
    else setSelectedIds([]);
  };

  const handleSelectOne = (id, checked) => {
    if (checked) setSelectedIds(prev => [...prev, id]);
    else setSelectedIds(prev => prev.filter(x => x !== id));
  };

  const handleWhatsApp = c => {
    if (!c.contact) return;
    let phone = c.contact.replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;
    const name = c.name || 'Candidate';
    const client = c.client || 'our client';
    const msg = `Hi ${name.split(' ')[0]}, regarding your job application at ${client}.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const copyCandidateId = id => {
    navigator.clipboard.writeText(id);
    toast({ title: 'Copied ID', description: id });
  };

  const getInitials = n =>
    n ? n.split(' ').map(i => i[0]).join('').toUpperCase().substring(0, 2) : 'CN';

  const getCandidateId = c => (c ? c.candidateId : '...');
  const getSkillsText = skills =>
    !skills ? 'N/A' : Array.isArray(skills) ? skills.join(', ') : skills;

  const stats = useMemo(() => ({
    total: candidates.length,
    active: candidates.filter(c => c.active !== false).length,
    submitted: candidates.filter(c => c.status === 'Submitted').length,
    interview: candidates.filter(c => (c.status || '').includes('Interview')).length,
    offer: candidates.filter(c => c.status === 'Offer').length,
    joined: candidates.filter(c => c.status === 'Joined').length,
    rejected: candidates.filter(c => c.status === 'Rejected').length
  }), [candidates]);

  /* JSX below unchanged */
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <DashboardSidebar />
      {/* UI unchanged */}
    </div>
  );
}
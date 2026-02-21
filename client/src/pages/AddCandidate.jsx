import { useState, useEffect, useMemo, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import {
  Search, Plus, Eye, Loader2, MessageCircle,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ── ENV Config ────────────────────────────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

// ── Helpers ───────────────────────────────────────────────────────────────────
const inputCls = (err) =>
  `w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 ${
    err ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'
  } bg-white dark:bg-slate-800`;

const getAuthHeader = () => {
  try {
    const stored = sessionStorage.getItem('currentUser');
    const token = stored ? JSON.parse(stored)?.idToken : null;
    return {
      Authorization: `Bearer ${token || ''}`,
      'Content-Type': 'application/json',
    };
  } catch {
    return { 'Content-Type': 'application/json' };
  }
};

// ── StatCard ──────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, color, active, onClick }) => {
  const colors = {
    blue:   'border-l-blue-500 bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-900',
    green:  'border-l-green-500 bg-gradient-to-r from-green-50 to-white dark:from-green-900/20 dark:to-slate-900',
    slate:  'border-l-slate-500 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/20 dark:to-slate-900',
    orange: 'border-l-orange-500 bg-gradient-to-r from-orange-50 to-white dark:from-orange-900/20 dark:to-slate-900',
    purple: 'border-l-purple-500 bg-gradient-to-r from-purple-50 to-white dark:from-purple-900/20 dark:to-slate-900',
    teal:   'border-l-teal-500 bg-gradient-to-r from-teal-50 to-white dark:from-teal-900/20 dark:to-slate-900',
    red:    'border-l-red-500 bg-gradient-to-r from-red-50 to-white dark:from-red-900/20 dark:to-slate-900',
  };
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 border-l-4 ${colors[color]} ${
        onClick ? 'cursor-pointer hover:shadow-md transition-all' : ''
      } ${active ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
    >
      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{value}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const getInitials = (name = '') =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);

const getCandidateId = (c) =>
  c.candidateId || c._id?.substring(c._id.length - 6).toUpperCase();

const ALL_STATUSES = [
  'Submitted', 'Shared Profiles', 'Yet to attend', 'Turnups',
  'No Show', 'Selected', 'Joined', 'Rejected', 'Hold', 'Backout',
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminCandidates() {
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  // Data
  const [candidates, setCandidates]   = useState([]);
  const [recruiters, setRecruiters]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters / sort
  const [searchTerm, setSearchTerm]           = useState('');
  const [statusFilter, setStatusFilter]       = useState('all');
  const [recruiterFilter, setRecruiterFilter] = useState('all');
  const [activeStatFilter, setActiveStatFilter] = useState(null);
  const [sortConfig, setSortConfig]           = useState(null);
  const [selectedIds, setSelectedIds]         = useState([]);

  // Dialogs
  const [isDialogOpen, setIsDialogOpen]           = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen]   = useState(false);
  const [isEditMode, setIsEditMode]               = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [viewCandidate, setViewCandidate]         = useState(null);
  const [errors, setErrors]                       = useState({});

  // Form
  const initialFormData = {
    name: '', email: '', contact: '', position: '', skills: '', client: '',
    status: 'Submitted', recruiterId: '', assignedJobId: '',
    totalExperience: '', relevantExperience: '', ctc: '', ectc: '',
    servingNoticePeriod: 'false', noticePeriodDays: '',
    offersInHand: 'false', offerPackage: '', notes: '',
    dateAdded: new Date().toISOString().split('T')[0],
  };
  const [formData, setFormData] = useState(initialFormData);

  // ── Data Fetching ──────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeader();
      const [resCand, resRec] = await Promise.all([
        fetch(`${API_URL}/candidates`, { headers }),
        fetch(`${API_URL}/recruiters`, { headers }),
      ]);

      if (resCand.ok) {
        const data = await resCand.json();
        const safe = Array.isArray(data) ? data : [];
        const mapped = safe.map((c) => ({ ...c, id: c._id }));
        mapped.sort((a, b) => new Date(b.createdAt || b.dateAdded) - new Date(a.createdAt || a.dateAdded));
        setCandidates(mapped);
      } else {
        toast({ title: 'Error', description: 'Failed to fetch candidates', variant: 'destructive' });
      }

      if (resRec.ok) {
        const data = await resRec.json();
        setRecruiters(Array.isArray(data) ? data.map((r) => ({ ...r, id: r._id })) : []);
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Network error. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Form Helpers ───────────────────────────────────────────────────────────
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validateForm = () => {
    const e = {};
    const d = formData;
    if (!d.name.trim())                                           e.name            = 'Full Name required';
    if (!d.email.trim())                                          e.email           = 'Email required';
    if (!d.contact.trim() || d.contact.length !== 10)            e.contact         = '10 digit phone required';
    if (!d.position.trim())                                       e.position        = 'Position required';
    if (!d.client.trim())                                         e.client          = 'Client required';
    if (!d.skills.trim())                                         e.skills          = 'Skills required';
    if (d.servingNoticePeriod === 'true' && !d.noticePeriodDays) e.noticePeriodDays = 'Enter days remaining';
    if (d.offersInHand === 'true' && !d.offerPackage)            e.offerPackage    = 'Enter offer package';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const url    = isEditMode
        ? `${API_URL}/candidates/${selectedCandidateId}`
        : `${API_URL}/candidates`;
      const method = isEditMode ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        skills: formData.skills.split(',').map((s) => s.trim()),
        offersInHand: formData.offersInHand === 'true',
        servingNoticePeriod: formData.servingNoticePeriod === 'true',
      };

      const res = await fetch(url, {
        method,
        headers: getAuthHeader(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Operation failed');
      }

      toast({ title: 'Success', description: `Candidate ${isEditMode ? 'updated' : 'added'} successfully` });
      setIsDialogOpen(false);
      setFormData(initialFormData);
      setErrors({});
      fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this candidate?')) return;
    try {
      const res = await fetch(`${API_URL}/candidates/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error('Delete failed');
      toast({ title: 'Deleted', description: 'Candidate removed successfully' });
      fetchData();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // ── Dialogs ────────────────────────────────────────────────────────────────
  const openAddDialog = () => {
    setIsEditMode(false);
    setSelectedCandidateId(null);
    setFormData(initialFormData);
    setErrors({});
    setIsDialogOpen(true);
  };

  const openEditDialog = (c) => {
    setIsEditMode(true);
    setSelectedCandidateId(c._id);
    setFormData({
      name:               c.name || '',
      email:              c.email || '',
      contact:            c.contact || '',
      position:           c.position || '',
      skills:             Array.isArray(c.skills) ? c.skills.join(', ') : c.skills || '',
      client:             c.client || '',
      status:             Array.isArray(c.status) ? c.status[0] : c.status || 'Submitted',
      recruiterId:        typeof c.recruiterId === 'object' ? c.recruiterId?._id : c.recruiterId || '',
      assignedJobId:      c.assignedJobId || '',
      totalExperience:    c.totalExperience || '',
      relevantExperience: c.relevantExperience || '',
      ctc:                c.ctc || '',
      ectc:               c.ectc || '',
      servingNoticePeriod: c.servingNoticePeriod ? 'true' : 'false',
      noticePeriodDays:   c.noticePeriodDays || '',
      offersInHand:       c.offersInHand ? 'true' : 'false',
      offerPackage:       c.offerPackage || '',
      notes:              c.notes || '',
      dateAdded:          c.dateAdded ? new Date(c.dateAdded).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setErrors({});
    setIsDialogOpen(true);
  };

  // ── Sorting ────────────────────────────────────────────────────────────────
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ field }) => {
    if (!sortConfig || sortConfig.key !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1 text-blue-500" />
      : <ArrowDown className="h-3 w-3 ml-1 text-blue-500" />;
  };

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredCandidates = useMemo(() => {
    let result = candidates.filter((c) => {
      const name   = c.name || '';
      const email  = c.email || '';
      const id     = c.candidateId || '';
      const client = c.client || '';
      const statusArr = Array.isArray(c.status) ? c.status : [c.status || ''];

      const matchSearch =
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === 'all' || statusArr.includes(statusFilter);
      const recId = typeof c.recruiterId === 'object' ? c.recruiterId?._id : c.recruiterId;
      const matchRec = recruiterFilter === 'all' || recId === recruiterFilter;

      let statMatch = true;
      if (activeStatFilter) {
        statMatch = statusArr.includes(activeStatFilter);
      }

      return matchSearch && matchStatus && matchRec && statMatch;
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
  }, [candidates, searchTerm, statusFilter, recruiterFilter, activeStatFilter, sortConfig]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const count = (s) => candidates.filter((c) => {
      const arr = Array.isArray(c.status) ? c.status : [c.status || ''];
      return arr.includes(s);
    }).length;
    return {
      total:         candidates.length,
      submitted:     count('Submitted'),
      selected:      count('Selected'),
      joined:        count('Joined'),
      rejected:      count('Rejected'),
      turnups:       count('Turnups'),
      noShow:        count('No Show'),
    };
  }, [candidates]);

  // ── Bulk Selection ─────────────────────────────────────────────────────────
  const toggleSelect = (id) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.length === filteredCandidates.length
      ? []
      : filteredCandidates.map((c) => c._id));

  const handleBulkDelete = async () => {
    if (!selectedIds.length || !confirm(`Delete ${selectedIds.length} candidate(s)?`)) return;
    try {
      await Promise.all(
        selectedIds.map((id) => fetch(`${API_URL}/candidates/${id}`, { method: 'DELETE', headers: getAuthHeader() }))
      );
      toast({ title: 'Deleted', description: `${selectedIds.length} candidate(s) removed` });
      setSelectedIds([]);
      fetchData();
    } catch {
      toast({ title: 'Error', description: 'Bulk delete failed', variant: 'destructive' });
    }
  };

  // ── WhatsApp ───────────────────────────────────────────────────────────────
  const handleWhatsApp = (c) => {
    if (!c.contact) return;
    let phone = c.contact.replace(/\D/g, '');
    if (phone.length === 10) phone = '91' + phone;
    const msg = `Hi ${c.name.split(' ')[0]}, this is regarding your job application for the ${c.position} position at ${c.client}. Are you available?`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 p-6 overflow-y-auto bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-[1800px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">All Candidates</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage all candidates across recruiters</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition"
              >
                Delete ({selectedIds.length})
              </button>
            )}
            <button
              onClick={openAddDialog}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" /> Add Candidate
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard title="Total" value={stats.total} color="blue" active={activeStatFilter === null} onClick={() => { setActiveStatFilter(null); setStatusFilter('all'); }} />
          <StatCard title="Submitted" value={stats.submitted} color="slate" active={activeStatFilter === 'Submitted'} onClick={() => { setActiveStatFilter('Submitted'); setStatusFilter('all'); }} />
          <StatCard title="Turnups" value={stats.turnups} color="teal" active={activeStatFilter === 'Turnups'} onClick={() => { setActiveStatFilter('Turnups'); setStatusFilter('all'); }} />
          <StatCard title="No Show" value={stats.noShow} color="orange" active={activeStatFilter === 'No Show'} onClick={() => { setActiveStatFilter('No Show'); setStatusFilter('all'); }} />
          <StatCard title="Selected" value={stats.selected} color="green" active={activeStatFilter === 'Selected'} onClick={() => { setActiveStatFilter('Selected'); setStatusFilter('all'); }} />
          <StatCard title="Joined" value={stats.joined} color="purple" active={activeStatFilter === 'Joined'} onClick={() => { setActiveStatFilter('Joined'); setStatusFilter('all'); }} />
          <StatCard title="Rejected" value={stats.rejected} color="red" active={activeStatFilter === 'Rejected'} onClick={() => { setActiveStatFilter('Rejected'); setStatusFilter('all'); }} />
        </div>

        {/* Filters */}
        <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, email, ID or client..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={recruiterFilter}
                onChange={(e) => setRecruiterFilter(e.target.value)}
                className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Recruiters</option>
                {recruiters.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm bg-white dark:bg-slate-900">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <p className="text-lg font-medium">No candidates found</p>
              <p className="text-sm mt-1">Try adjusting your filters or add a new candidate.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filteredCandidates.length && filteredCandidates.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </th>
                    <th className="px-4 py-3 w-12">#</th>
                    {[
                      { label: 'ID',         key: 'candidateId' },
                      { label: 'Name',       key: 'name' },
                      { label: 'Phone',      key: 'contact' },
                      { label: 'Position',   key: 'position' },
                      { label: 'Status',     key: 'status' },
                      { label: 'Recruiter',  key: 'recruiterName' },
                    ].map(({ label, key }) => (
                      <th
                        key={key}
                        className="px-4 py-3 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none"
                        onClick={() => handleSort(key)}
                      >
                        <span className="flex items-center">
                          {label} <SortIcon field={key} />
                        </span>
                      </th>
                    ))}
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCandidates.map((c, idx) => {
                    const statusArr = Array.isArray(c.status) ? c.status : [c.status || 'Submitted'];
                    const recName   = typeof c.recruiterId === 'object'
                      ? c.recruiterId?.name
                      : recruiters.find((r) => r.id === c.recruiterId)?.name || '-';

                    return (
                      <tr key={c._id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${selectedIds.includes(c._id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(c._id)}
                            onChange={() => toggleSelect(c._id)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{idx + 1}</td>
                        <td
                          className="px-4 py-3 font-mono text-xs text-blue-600 font-bold cursor-pointer hover:underline"
                          onClick={() => { navigator.clipboard.writeText(getCandidateId(c)); toast({ title: 'Copied!' }); }}
                        >
                          {getCandidateId(c)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                              {getInitials(c.name)}
                            </div>
                            <div>
                              <div className="font-medium text-slate-900 dark:text-white">{c.name}</div>
                              <div className="text-xs text-slate-400">{c.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{c.contact || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-white">{c.position || '-'}</div>
                          <div className="text-xs text-slate-400">{c.client || '-'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {statusArr.map((s) => (
                              <span
                                key={s}
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  s === 'Joined'   ? 'bg-green-100 text-green-800' :
                                  s === 'Selected' ? 'bg-purple-100 text-purple-800' :
                                  s === 'Rejected' || s === 'Backout' || s === 'No Show' ? 'bg-red-100 text-red-800' :
                                  s === 'Turnups'  ? 'bg-teal-100 text-teal-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">{recName}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleWhatsApp(c)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition"
                              title="WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => { setViewCandidate(c); setIsViewDialogOpen(true); }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openEditDialog(c)}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition text-xs font-medium"
                              title="Edit"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(c._id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition text-xs font-medium"
                              title="Delete"
                            >
                              Del
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Dialog ──────────────────────────────────────────────── */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {isEditMode ? 'Edit Candidate' : 'Add Candidate'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">Fill in the candidate details below.</p>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Full Name *',          field: 'name' },
                { label: 'Email *',              field: 'email',   type: 'email' },
                { label: 'Phone (10 digits) *',  field: 'contact' },
                { label: 'Position *',           field: 'position' },
                { label: 'Client *',             field: 'client' },
                { label: 'Skills (comma sep.) *', field: 'skills' },
                { label: 'Total Experience',     field: 'totalExperience' },
                { label: 'Relevant Experience',  field: 'relevantExperience' },
                { label: 'Current CTC',          field: 'ctc' },
                { label: 'Expected CTC',         field: 'ectc' },
              ].map(({ label, field, type }) => (
                <div key={field}>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">{label}</label>
                  <input
                    type={type || 'text'}
                    value={formData[field]}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                    className={inputCls(errors[field])}
                  />
                  {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]}</p>}
                </div>
              ))}

              {/* Status */}
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className={inputCls(false)}
                >
                  {ALL_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>

              {/* Recruiter */}
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Recruiter</label>
                <select
                  value={formData.recruiterId}
                  onChange={(e) => handleInputChange('recruiterId', e.target.value)}
                  className={inputCls(errors.recruiterId)}
                >
                  <option value="">Select Recruiter</option>
                  {recruiters.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                {errors.recruiterId && <p className="text-xs text-red-500 mt-1">{errors.recruiterId}</p>}
              </div>

              {/* Serving Notice Period */}
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Serving Notice Period?</label>
                <select
                  value={formData.servingNoticePeriod}
                  onChange={(e) => handleInputChange('servingNoticePeriod', e.target.value)}
                  className={inputCls(false)}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>

              {formData.servingNoticePeriod === 'true' && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Days Remaining *</label>
                  <input
                    type="text"
                    value={formData.noticePeriodDays}
                    onChange={(e) => handleInputChange('noticePeriodDays', e.target.value)}
                    className={inputCls(errors.noticePeriodDays)}
                    placeholder="e.g. 30"
                  />
                  {errors.noticePeriodDays && <p className="text-xs text-red-500 mt-1">{errors.noticePeriodDays}</p>}
                </div>
              )}

              {/* Offers In Hand */}
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Offers In Hand?</label>
                <select
                  value={formData.offersInHand}
                  onChange={(e) => handleInputChange('offersInHand', e.target.value)}
                  className={inputCls(false)}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>

              {formData.offersInHand === 'true' && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Offer Package *</label>
                  <input
                    type="text"
                    value={formData.offerPackage}
                    onChange={(e) => handleInputChange('offerPackage', e.target.value)}
                    className={inputCls(errors.offerPackage)}
                    placeholder="e.g. 15 LPA"
                  />
                  {errors.offerPackage && <p className="text-xs text-red-500 mt-1">{errors.offerPackage}</p>}
                </div>
              )}

              {/* Date Added */}
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Date Added</label>
                <input
                  type="date"
                  value={formData.dateAdded}
                  onChange={(e) => handleInputChange('dateAdded', e.target.value)}
                  className={inputCls(false)}
                />
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">Notes</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => { setIsDialogOpen(false); setErrors({}); }}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Saving...' : isEditMode ? 'Update Candidate' : 'Add Candidate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Dialog ────────────────────────────────────────────────────── */}
      {isViewDialogOpen && viewCandidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{viewCandidate.name}</h2>
                <p className="text-xs font-mono text-blue-600 mt-0.5">{getCandidateId(viewCandidate)}</p>
              </div>
              <button
                onClick={() => setIsViewDialogOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none p-1"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-3 text-sm">
              {[
                ['Email',         viewCandidate.email],
                ['Phone',         viewCandidate.contact],
                ['Position',      viewCandidate.position],
                ['Client',        viewCandidate.client],
                ['Status',        Array.isArray(viewCandidate.status) ? viewCandidate.status.join(', ') : viewCandidate.status],
                ['Skills',        Array.isArray(viewCandidate.skills) ? viewCandidate.skills.join(', ') : viewCandidate.skills],
                ['Total Exp',     viewCandidate.totalExperience ? `${viewCandidate.totalExperience} yrs` : null],
                ['Relevant Exp',  viewCandidate.relevantExperience ? `${viewCandidate.relevantExperience} yrs` : null],
                ['Current CTC',   viewCandidate.ctc],
                ['Expected CTC',  viewCandidate.ectc],
                ['Notice Period', viewCandidate.noticePeriod],
                ['Offers In Hand', viewCandidate.offersInHand ? `Yes — ${viewCandidate.offerPackage || ''}` : 'No'],
                ['Notes',         viewCandidate.notes],
              ].map(([label, val]) => val ? (
                <div key={label} className="flex gap-2">
                  <span className="font-medium text-slate-600 dark:text-slate-400 w-32 flex-shrink-0">{label}:</span>
                  <span className="text-slate-900 dark:text-white">{val}</span>
                </div>
              ) : null)}
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => { setIsViewDialogOpen(false); openEditDialog(viewCandidate); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                Edit
              </button>
              <button
                onClick={() => setIsViewDialogOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
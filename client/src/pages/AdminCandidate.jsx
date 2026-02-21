import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, MessageCircle, Loader2, ArrowUpDown, ArrowUp, ArrowDown
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
    name: '', email: '', contact: '', position: '', skills: '', client: '',
    status: 'Submitted', recruiterId: '', assignedJobId: '',
    totalExperience: '', relevantExperience: '', ctc: '', ectc: '',
    servingNoticePeriod: 'false', noticePeriodDays: '',
    offersInHand: 'false', offerPackage: '', notes: '',
    dateAdded: new Date().toISOString().split('T')[0],
  });

  const getAuthHeader = () => {
    try {
      const stored = sessionStorage.getItem('currentUser');
      const token = stored ? JSON.parse(stored)?.idToken : null;
      return { Authorization: `Bearer ${token || ''}` };
    } catch {
      return {};
    }
  };

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

  useEffect(() => { fetchData(); }, []);

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
      const matchesRecruiter = recruiterFilter === 'all' || cRecruiterId === recruiterFilter;

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
        const aValue = sortConfig.key === 'candidateId' ? a.candidateId : a[sortConfig.key];
        const bValue = sortConfig.key === 'candidateId' ? b.candidateId : b[sortConfig.key];
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

  return (
    <div className="flex-1 p-4 md:p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Candidates</h1>
            <p className="text-slate-500">Manage all candidate records</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          <StatCard title="Total" value={stats.total} color="blue" onClick={() => setActiveStatFilter(null)} active={activeStatFilter === null} />
          <StatCard title="Active" value={stats.active} color="green" onClick={() => setActiveStatFilter('active')} active={activeStatFilter === 'active'} />
          <StatCard title="Submitted" value={stats.submitted} color="slate" onClick={() => setActiveStatFilter('submitted')} active={activeStatFilter === 'submitted'} />
          <StatCard title="Interview" value={stats.interview} color="orange" onClick={() => setActiveStatFilter('interview')} active={activeStatFilter === 'interview'} />
          <StatCard title="Offer" value={stats.offer} color="purple" onClick={() => setActiveStatFilter('offer')} active={activeStatFilter === 'offer'} />
          <StatCard title="Joined" value={stats.joined} color="teal" />
          <StatCard title="Rejected" value={stats.rejected} color="red" />
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, client..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="Submitted">Submitted</option>
            <option value="L1 Interview">L1 Interview</option>
            <option value="L2 Interview">L2 Interview</option>
            <option value="Offer">Offer</option>
            <option value="Joined">Joined</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select
            value={recruiterFilter}
            onChange={e => setRecruiterFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none"
          >
            <option value="all">All Recruiters</option>
            {recruiters.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      onChange={e => handleSelectAll(e.target.checked)}
                      checked={selectedIds.length === filteredCandidates.length && filteredCandidates.length > 0}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('candidateId')}>
                    <span className="flex items-center gap-1">
                      ID
                      {sortConfig?.key === 'candidateId'
                        ? sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                    </span>
                  </th>
                  <th className="px-4 py-3 cursor-pointer" onClick={() => handleSort('name')}>
                    <span className="flex items-center gap-1">
                      Name
                      {sortConfig?.key === 'name'
                        ? sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                    </span>
                  </th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Position / Client</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Recruiter</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">No candidates found.</td>
                  </tr>
                ) : filteredCandidates.map(c => (
                  <tr key={c._id || c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c._id || c.id)}
                        onChange={e => handleSelectOne(c._id || c.id, e.target.checked)}
                        className="rounded"
                      />
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-xs text-slate-500 cursor-pointer"
                      onClick={() => copyCandidateId(c.candidateId)}
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
                      <div className="font-medium">{c.position || '-'}</div>
                      <div className="text-xs text-slate-400">{c.client || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.status === 'Joined' ? 'bg-green-100 text-green-800' :
                        c.status === 'Offer' ? 'bg-purple-100 text-purple-800' :
                        c.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                        c.status?.includes('Interview') ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {c.status || 'Submitted'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {typeof c.recruiterId === 'object'
                        ? c.recruiterId?.name
                        : recruiters.find(r => r.id === c.recruiterId)?.name || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleWhatsApp(c)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-md"
                        title="WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
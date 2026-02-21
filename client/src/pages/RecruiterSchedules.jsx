import React, { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar, Clock, MapPin, Video, Phone, Building, Search,
  Calendar as CalendarIcon, List, Grid, Eye, Plus, Download,
  CheckCircle2, AlertCircle, X, Loader2, Mail, Briefcase,
  DollarSign, GraduationCap, FileText, UserCircle, Target, Users, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// --- Helpers ---
function getStatusBadge(status) {
  const base = "px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5";
  if (status.includes("L1")) return <span className={`${base} bg-blue-100 text-blue-800`}><Zap className="h-3 w-3" />{status}</span>;
  if (status.includes("L2")) return <span className={`${base} bg-purple-100 text-purple-800`}><Target className="h-3 w-3" />{status}</span>;
  if (status.includes("Final")) return <span className={`${base} bg-green-100 text-green-800`}><CheckCircle2 className="h-3 w-3" />{status}</span>;
  if (status.includes("HR")) return <span className={`${base} bg-pink-100 text-pink-800`}><Users className="h-3 w-3" />{status}</span>;
  return <span className={`${base} bg-gray-100 text-gray-800`}><Calendar className="h-3 w-3" />{status}</span>;
}

function getPriorityBadge(priority) {
  const base = "px-2 py-1 rounded-full text-xs font-medium capitalize border";
  const colors = { high: "bg-red-100 text-red-800 border-red-200", medium: "bg-yellow-100 text-yellow-800 border-yellow-200", low: "bg-green-100 text-green-800 border-green-200" };
  return <span className={`${base} ${colors[priority || 'medium']}`}>{priority} Priority</span>;
}

function getTimeStatus(interviewDate) {
  const now = new Date();
  const interviewTime = new Date(interviewDate);
  const diffMs = interviewTime.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffMs < 0) return { status: "completed", text: "Completed", color: "text-gray-500", bg: "bg-gray-100" };
  else if (diffHours <= 24) return { status: "urgent", text: "Within 24h", color: "text-red-600", bg: "bg-red-100" };
  else if (diffDays <= 3) return { status: "upcoming", text: "Upcoming", color: "text-orange-600", bg: "bg-orange-100" };
  else return { status: "scheduled", text: "Scheduled", color: "text-green-600", bg: "bg-green-100" };
}

const StatCard = ({ title, value, icon, gradient, onClick, description }) => (
  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="cursor-pointer" onClick={onClick}>
    <div className={`${gradient} text-white rounded-xl shadow-lg overflow-hidden p-5`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-white/90 text-sm font-medium mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {description && <p className="text-white/70 text-xs mt-1">{description}</p>}
        </div>
        <div className="flex items-center gap-2">{icon}</div>
      </div>
    </div>
  </motion.div>
);

export default function RecruiterSchedules() {
  const [interviews, setInterviews] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedInterview, setSelectedInterview] = useState(null);
  const [selectedCandidateFullDetails, setSelectedCandidateFullDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [selectedRecruiterId, setSelectedRecruiterId] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatFilter, setActiveStatFilter] = useState(null);
  const [showNewInterviewForm, setShowNewInterviewForm] = useState(false);

  const [newInterviewForm, setNewInterviewForm] = useState({
    candidateId: "", candidateName: "", candidateEmail: "", candidatePhone: "", position: "",
    status: "L1 Interview", interviewDate: new Date().toISOString().split('T')[0], interviewTime: "10:00",
    interviewType: "Virtual", location: "Remote", duration: "60", recruiterId: "",
    notes: "", priority: "medium", meetingLink: ""
  });
  const [formErrors, setFormErrors] = useState({});

  const getAuthHeader = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resInterviews, resCandidates, resRecruiters] = await Promise.all([
        fetch(`${API_URL}/interviews`, { headers: getAuthHeader() }),
        fetch(`${API_URL}/candidates`, { headers: getAuthHeader() }),
        fetch(`${API_URL}/recruiters`, { headers: getAuthHeader() })
      ]);

      if (resInterviews.ok) {
        const data = await resInterviews.json();
        setInterviews(data.map((item) => ({
          id: item._id, interviewId: item.interviewId,
          candidateIdRaw: item.candidateId?._id || item.candidateId,
          candidateName: item.candidateId?.name || "Unknown",
          candidateEmail: item.candidateId?.email || "",
          candidatePhone: item.candidateId?.phone || "",
          position: item.candidateId?.position || "N/A",
          status: item.round || "Scheduled",
          interviewDate: item.interviewDate, interviewType: item.type,
          recruiterId: item.recruiterId?._id, recruiterName: item.recruiterId?.name || "Unknown",
          clientName: item.jobId?.clientName || "N/A",
          notes: item.notes, priority: item.priority, meetingLink: item.meetingLink,
        })));
      }
      if (resCandidates.ok) setCandidates(await resCandidates.json());
      if (resRecruiters.ok) setRecruiters(await resRecruiters.json());
    } catch (error) {
      console.error("Failed to fetch data", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredInterviews = useMemo(() => {
    let filtered = interviews;
    if (selectedRecruiterId) filtered = filtered.filter(i => i.recruiterId === selectedRecruiterId);
    if (statusFilter !== "all") filtered = filtered.filter(i => i.status === statusFilter);
    if (priorityFilter !== "all") filtered = filtered.filter(i => i.priority === priorityFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(i => i.candidateName.toLowerCase().includes(q) || (i.interviewId || '').toLowerCase().includes(q));
    }
    const now = new Date();
    if (activeStatFilter === 'upcoming') filtered = filtered.filter(i => new Date(i.interviewDate) >= now);
    if (activeStatFilter === 'highPriority') filtered = filtered.filter(i => i.priority === 'high');
    if (activeStatFilter === 'completed') filtered = filtered.filter(i => new Date(i.interviewDate) < now);
    if (activeStatFilter === 'today') filtered = filtered.filter(i => new Date(i.interviewDate).toDateString() === now.toDateString());

    const latestMap = new Map();
    filtered.forEach(interview => {
      const cId = interview.candidateIdRaw;
      const existing = latestMap.get(cId);
      if (!existing || new Date(interview.interviewDate) > new Date(existing.interviewDate)) latestMap.set(cId, interview);
    });
    return Array.from(latestMap.values()).sort((a, b) => new Date(b.interviewDate).getTime() - new Date(a.interviewDate).getTime());
  }, [interviews, selectedRecruiterId, statusFilter, priorityFilter, searchQuery, activeStatFilter]);

  const interviewStats = useMemo(() => {
    const now = new Date();
    return {
      total: interviews.length,
      upcoming: interviews.filter(i => new Date(i.interviewDate) >= now).length,
      completed: interviews.filter(i => new Date(i.interviewDate) < now).length,
      highPriority: interviews.filter(i => i.priority === "high").length,
      today: interviews.filter(i => new Date(i.interviewDate).toDateString() === now.toDateString()).length,
      virtual: interviews.filter(i => i.interviewType === "Virtual").length
    };
  }, [interviews]);

  const handleViewInterview = async (interview) => {
    setSelectedInterview(interview);
    setSelectedCandidateFullDetails(null);
    setLoadingDetails(true);
    try {
      const response = await fetch(`${API_URL}/candidates/${interview.candidateIdRaw}`, { headers: getAuthHeader() });
      if (response.ok) setSelectedCandidateFullDetails(await response.json());
      else toast.error("Could not fetch extended candidate details.");
    } catch {
      toast.error("Network error while fetching details.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!newInterviewForm.candidateName || !/^[a-zA-Z\s]+$/.test(newInterviewForm.candidateName)) errors.candidateName = "Name must contain only characters.";
    if (!newInterviewForm.candidateEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newInterviewForm.candidateEmail)) errors.candidateEmail = "Invalid email format.";
    if (!newInterviewForm.candidatePhone || !/^\d{10}$/.test(newInterviewForm.candidatePhone)) errors.candidatePhone = "Phone must be exactly 10 digits.";
    if (!newInterviewForm.recruiterId) errors.recruiterId = "Please select a recruiter.";
    const selectedDate = new Date(newInterviewForm.interviewDate);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (selectedDate < today) errors.interviewDate = "Date cannot be in the past.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNewInterviewChange = (e) => {
    const { name, value } = e.target;
    if (name === 'candidateName' && !/^[a-zA-Z\s]*$/.test(value)) return;
    if (name === 'candidatePhone' && !/^\d*$/.test(value)) return;
    if (name === 'candidatePhone' && value.length > 10) return;
    setNewInterviewForm(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleCandidateSelect = (e) => {
    const selectedId = e.target.value;
    const candidate = candidates.find(c => c._id === selectedId || c.id === selectedId);
    if (candidate) {
      setNewInterviewForm(prev => ({
        ...prev, candidateId: selectedId, candidateName: candidate.name,
        candidateEmail: candidate.email, candidatePhone: candidate.contact || candidate.phone || "",
        position: candidate.position,
        recruiterId: typeof candidate.recruiterId === 'object' ? candidate.recruiterId._id : candidate.recruiterId || prev.recruiterId
      }));
      setFormErrors({});
    }
  };

  const handleSubmitNewInterview = async () => {
    if (!validateForm()) { toast.error("Please fix validation errors."); return; }
    try {
      const response = await fetch(`${API_URL}/interviews`, {
        method: 'POST', headers: getAuthHeader(), body: JSON.stringify(newInterviewForm)
      });
      if (response.ok) {
        toast.success("Interview scheduled successfully");
        setShowNewInterviewForm(false);
        fetchData();
        setNewInterviewForm({
          candidateId: "", candidateName: "", candidateEmail: "", candidatePhone: "", position: "",
          status: "L1 Interview", interviewDate: new Date().toISOString().split('T')[0], interviewTime: "10:00",
          interviewType: "Virtual", location: "Remote", duration: "60", recruiterId: "",
          notes: "", priority: "medium", meetingLink: ""
        });
      }
    } catch {
      toast.error("Failed to schedule interview");
    }
  };

  const inputCls = (err) => `w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 ${err ? 'border-red-500' : 'border-gray-300'}`;

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Interview Schedules</h1>
            <p className="text-gray-500">Manage your hiring timeline</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg shadow-sm text-sm font-medium hover:bg-gray-50 transition">
              <Download className="h-4 w-4" /> Export
            </button>
            <button
              onClick={() => { setFormErrors({}); setShowNewInterviewForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md text-sm font-medium transition"
            >
              <Plus className="h-4 w-4" /> New Interview
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <StatCard title="Total" value={interviewStats.total} icon={<Calendar />} gradient="bg-purple-600" onClick={() => setActiveStatFilter('total')} />
          <StatCard title="Upcoming" value={interviewStats.upcoming} icon={<Clock />} gradient="bg-green-600" onClick={() => setActiveStatFilter('upcoming')} />
          <StatCard title="High Priority" value={interviewStats.highPriority} icon={<AlertCircle />} gradient="bg-red-600" onClick={() => setActiveStatFilter('highPriority')} />
          <StatCard title="Completed" value={interviewStats.completed} icon={<CheckCircle2 />} gradient="bg-blue-600" onClick={() => setActiveStatFilter('completed')} />
          <StatCard title="Today" value={interviewStats.today} icon={<CalendarIcon />} gradient="bg-orange-600" onClick={() => setActiveStatFilter('today')} />
          <StatCard title="Virtual" value={interviewStats.virtual} icon={<Video />} gradient="bg-indigo-600" onClick={() => setActiveStatFilter('virtual')} />
        </div>

        {/* Filter Bar */}
        <div className="rounded-xl border border-gray-200 bg-white dark:bg-gray-900 p-4 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search interviews..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-3 items-center w-full md:w-auto">
              <select className="p-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500" value={selectedRecruiterId} onChange={(e) => setSelectedRecruiterId(e.target.value)}>
                <option value="">All Recruiters</option>
                {recruiters.map(r => <option key={r._id || r.id} value={r._id || r.id}>{r.name}</option>)}
              </select>
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button onClick={() => setViewMode("grid")} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}><Grid className="h-4 w-4" /></button>
                <button onClick={() => setViewMode("list")} className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}><List className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>
        ) : (
          <AnimatePresence mode="wait">
            {filteredInterviews.length === 0 ? (
              <div className="text-center py-20 text-gray-500">No interviews found.</div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredInterviews.map((interview) => (
                  <InterviewGridCard key={interview.id} interview={interview} onView={() => handleViewInterview(interview)} />
                ))}
              </div>
            ) : (
              <InterviewListView interviews={filteredInterviews} onView={handleViewInterview} />
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Modals */}
      {showNewInterviewForm && (
        <NewInterviewModal
          form={newInterviewForm} errors={formErrors} onChange={handleNewInterviewChange}
          onCandidateSelect={handleCandidateSelect} onSubmit={handleSubmitNewInterview}
          onClose={() => setShowNewInterviewForm(false)} recruiters={recruiters} candidates={candidates}
          onGenerateMeetingLink={() => setNewInterviewForm(p => ({ ...p, meetingLink: `https://meet.google.com/${Math.random().toString(36).substring(7)}` }))}
        />
      )}

      {selectedInterview && (
        <InterviewDetailModal
          interview={selectedInterview} candidateFull={selectedCandidateFullDetails}
          loading={loadingDetails} onClose={() => setSelectedInterview(null)}
        />
      )}
    </main>
  );
}

// --- Sub Components ---

function InterviewGridCard({ interview, onView }) {
  const timeStatus = getTimeStatus(interview.interviewDate);
  return (
    <div className="rounded-xl border bg-white dark:bg-gray-900 hover:shadow-lg transition-shadow cursor-pointer border-l-4" style={{ borderLeftColor: timeStatus.status === 'urgent' ? '#ef4444' : '#3b82f6' }}>
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10"><AvatarFallback>{interview.candidateName.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
            <div>
              <h3 className="font-bold text-lg">{interview.candidateName}</h3>
              <p className="text-sm text-gray-500">{interview.position}</p>
            </div>
          </div>
          {getStatusBadge(interview.status)}
        </div>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /> {new Date(interview.interviewDate).toLocaleString()}</div>
          <div className="flex items-center gap-2"><UserCircle className="h-4 w-4 text-gray-400" /> {interview.recruiterName}</div>
          <div className="flex items-center gap-2"><Building className="h-4 w-4 text-gray-400" /> {interview.clientName}</div>
        </div>
        <div className="pt-4 border-t flex justify-between items-center">
          {getPriorityBadge(interview.priority)}
          <button onClick={onView} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition">View Details</button>
        </div>
      </div>
    </div>
  );
}

function InterviewListView({ interviews, onView }) {
  return (
    <div className="rounded-xl border bg-white dark:bg-gray-900 overflow-x-auto shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-100 dark:bg-gray-800">
          <tr>
            {["Candidate", "Position", "Date", "Recruiter", "Status", "Actions"].map(h => (
              <th key={h} className="p-4 font-medium text-gray-600 dark:text-gray-300">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {interviews.map(i => (
            <tr key={i.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              <td className="p-4 font-medium">{i.candidateName}</td>
              <td className="p-4">{i.position}</td>
              <td className="p-4">{new Date(i.interviewDate).toLocaleDateString()}</td>
              <td className="p-4">{i.recruiterName}</td>
              <td className="p-4">{getStatusBadge(i.status)}</td>
              <td className="p-4">
                <button onClick={() => onView(i)} className="p-2 rounded-lg hover:bg-gray-100 transition">
                  <Eye className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InterviewDetailModal({ interview, candidateFull, loading, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="p-6 border-b flex justify-between items-start bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-2xl">
          <div className="flex gap-4 items-center">
            <Avatar className="h-16 w-16 border-2 border-white/50">
              <AvatarFallback className="text-blue-700 font-bold text-xl bg-white">{interview.candidateName.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{interview.candidateName}</h2>
              <div className="flex gap-2 text-blue-100 items-center mt-1">
                <Briefcase className="h-4 w-4" />
                <span>{interview.position} at {interview.clientName}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-0 flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              <p>Fetching candidate profile...</p>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left Column */}
              <div className="space-y-6">
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                  <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-3"><UserCircle className="h-4 w-4" /> Contact Info</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded"><Mail className="h-4 w-4 text-blue-500" /> <span className="truncate">{candidateFull?.email || interview.candidateEmail}</span></div>
                    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded"><Phone className="h-4 w-4 text-green-500" /> {candidateFull?.contact || candidateFull?.phone || interview.candidatePhone}</div>
                    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded"><MapPin className="h-4 w-4 text-red-500" /> {candidateFull?.currentLocation || "Remote"}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                  <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-3"><Target className="h-4 w-4" /> Professional Stats</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-blue-50 p-2 rounded"><p className="text-xs text-blue-600 uppercase font-bold">Total Exp</p><p className="font-semibold">{candidateFull?.totalExperience || "N/A"} Years</p></div>
                    <div className="bg-purple-50 p-2 rounded"><p className="text-xs text-purple-600 uppercase font-bold">Relevant</p><p className="font-semibold">{candidateFull?.relevantExperience || "N/A"} Years</p></div>
                    <div className="bg-green-50 p-2 rounded"><p className="text-xs text-green-600 uppercase font-bold">Current CTC</p><p className="font-semibold">{candidateFull?.ctc || "N/A"}</p></div>
                    <div className="bg-emerald-50 p-2 rounded"><p className="text-xs text-emerald-600 uppercase font-bold">Expected</p><p className="font-semibold">{candidateFull?.ectc || "N/A"}</p></div>
                    <div className="col-span-2 bg-orange-50 p-2 rounded flex justify-between items-center">
                      <span className="text-xs text-orange-600 uppercase font-bold">Notice Period</span>
                      <span className="font-bold text-orange-700">{candidateFull?.noticePeriod || "Immediate"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="lg:col-span-2 space-y-6">

                <div className="rounded-xl border-l-4 border-l-blue-500 border border-gray-200 bg-white shadow-sm p-4 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 uppercase">Interview Date</p>
                    <p className="font-medium flex items-center gap-2"><Calendar className="h-4 w-4 text-blue-600" /> {new Date(interview.interviewDate).toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 uppercase">Recruiter</p>
                    <p className="font-medium flex items-center gap-2"><UserCircle className="h-4 w-4 text-blue-600" /> {interview.recruiterName}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 uppercase mb-1">Meeting Link</p>
                    {interview.meetingLink ? (
                      <a href={interview.meetingLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-2 bg-blue-50 p-2 rounded border border-blue-100">
                        <Video className="h-4 w-4" /> {interview.meetingLink}
                      </a>
                    ) : <span className="text-gray-400 italic">No link provided</span>}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                  <h3 className="font-semibold text-gray-700 mb-3">Skills & Expertise</h3>
                  <div className="flex flex-wrap gap-2">
                    {candidateFull?.skills ? (
                      (Array.isArray(candidateFull.skills) ? candidateFull.skills : candidateFull.skills.split(',')).map((skill, i) => (
                        <Badge key={i} variant="secondary" className="px-3 py-1">{skill.trim()}</Badge>
                      ))
                    ) : <span className="text-gray-400 text-sm">No specific skills listed.</span>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-2"><FileText className="h-4 w-4" /> Interview Notes</h3>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded min-h-[80px]">{interview.notes || "No notes added for this interview."}</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-2"><FileText className="h-4 w-4" /> Candidate Notes</h3>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded min-h-[80px]">{candidateFull?.notes || "No internal notes on candidate."}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-white dark:bg-gray-800 rounded-b-2xl flex justify-end">
          <button onClick={onClose} className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Close</button>
        </div>
      </motion.div>
    </div>
  );
}

function NewInterviewModal({ form, errors, onChange, onCandidateSelect, onGenerateMeetingLink, onSubmit, onClose, recruiters, candidates }) {
  const inputCls = (err) => `w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 ${err ? 'border-red-500' : 'border-gray-300'}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center bg-blue-600 text-white rounded-t-xl">
          <h2 className="text-xl font-bold">Schedule Interview</h2>
          <button onClick={onClose}><X className="h-6 w-6" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Select Candidate *</label>
            <select className="w-full p-2 border border-gray-300 rounded-lg bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" onChange={onCandidateSelect} value={form.candidateId}>
              <option value="">-- Choose a Candidate --</option>
              {candidates.map((c) => <option key={c._id || c.id} value={c._id || c.id}>{c.name} ({c.email})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Candidate Name</label>
              <input name="candidateName" value={form.candidateName} onChange={onChange} disabled={!!form.candidateId} className={inputCls(errors.candidateName)} />
              {errors.candidateName && <p className="text-xs text-red-500 mt-1">{errors.candidateName}</p>}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Email</label>
              <input name="candidateEmail" value={form.candidateEmail} onChange={onChange} disabled={!!form.candidateId} className={inputCls(errors.candidateEmail)} />
              {errors.candidateEmail && <p className="text-xs text-red-500 mt-1">{errors.candidateEmail}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Date</label>
              <input type="date" name="interviewDate" value={form.interviewDate} onChange={onChange} className={inputCls(errors.interviewDate)} />
              {errors.interviewDate && <p className="text-xs text-red-500 mt-1">{errors.interviewDate}</p>}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Time</label>
              <input type="time" name="interviewTime" value={form.interviewTime} onChange={onChange} className={inputCls(false)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Recruiter</label>
              <select name="recruiterId" value={form.recruiterId} onChange={onChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select</option>
                {recruiters.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
              </select>
              {errors.recruiterId && <p className="text-xs text-red-500 mt-1">{errors.recruiterId}</p>}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Round</label>
              <select name="status" value={form.status} onChange={onChange} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>L1 Interview</option>
                <option>L2 Interview</option>
                <option>Final Interview</option>
                <option>HR Interview</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Link</label>
            <div className="flex gap-2">
              <input name="meetingLink" value={form.meetingLink} onChange={onChange} className={inputCls(false)} />
              <button onClick={onGenerateMeetingLink} className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition whitespace-nowrap">Generate</button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Notes</label>
            <Textarea name="notes" value={form.notes} onChange={onChange} />
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-3 bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition">Cancel</button>
          <button onClick={onSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">Schedule</button>
        </div>
      </motion.div>
    </div>
  );
}

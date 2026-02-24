import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Briefcase, ClipboardList, Calendar, TrendingUp, 
  CheckCircle2, ArrowUpRight, ArrowDownRight, UserCheck, 
  X, Mail, XCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useToast } from '@/hooks/use-toast';

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const API_URL  = `${BASE_URL}/api`;

// --- Components ---

function ProfessionalStatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend = 0, 
  description, 
  onClick,
  borderColor = "border-blue-200 dark:border-blue-800",
  iconColor = "text-blue-600 dark:text-blue-400"
}) {
  const isPositive = trend > 0;
  const isNegative = trend < 0;
  
  return (
    <div 
      onClick={onClick}
      className={`
        relative bg-white dark:bg-gray-800 
        border ${borderColor} 
        rounded-xl p-3 md:p-4 
        shadow-sm hover:shadow-md 
        transition-all duration-300 
        cursor-pointer hover:scale-[1.02]
        group overflow-hidden
        h-28 md:h-32 flex flex-col justify-between
        ${onClick ? 'hover:border-2 hover:border-blue-400 dark:hover:border-blue-600 hover:border-solid' : ''}
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 to-white/50 dark:from-gray-900/30 dark:to-gray-800/30 rounded-xl"></div>
      
      <div className="relative z-10 h-full flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
              {title}
            </p>
            <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mt-1 truncate">
              {value}
            </h3>
          </div>
          
          <div className={`
            p-1.5 md:p-2 rounded-lg ml-1 md:ml-2 flex-shrink-0
            bg-blue-50 dark:bg-blue-900/20 
            border border-blue-100 dark:border-blue-800/50
            group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30
            transition-colors
          `}>
            <Icon className={`w-4 h-4 md:w-5 md:h-5 ${iconColor}`} />
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-2 md:pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-1 md:space-x-2">
            {trend !== 0 && (
              <>
                {isPositive ? (
                  <ArrowUpRight className="w-3 h-3 text-green-500 flex-shrink-0" />
                ) : isNegative ? (
                  <ArrowDownRight className="w-3 h-3 text-red-500 flex-shrink-0" />
                ) : null}
                <span className={`text-xs font-medium ${
                  isPositive ? 'text-green-600' : 
                  isNegative ? 'text-red-600' : 
                  'text-gray-500'
                }`}>
                  {trend > 0 ? '+' : ''}{trend}%
                </span>
              </>
            )}
            {description && !trend && (
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {description}
              </span>
            )}
          </div>
          
          {onClick && (
            <div className="text-xs text-blue-500 dark:text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              →
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Main Dashboard Component ---

export default function RecruiterDashboard() {
  const { currentUser, authHeaders } = useAuth();
  const user = currentUser;
  const navigate = useNavigate();
  const { toast } = useToast();

  // Data State
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAuthHeader = async () => {
    const h = await authHeaders();
    return { 'Content-Type': 'application/json', ...h };
  };

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const headers = await getAuthHeader();

        const [candRes, jobRes, intRes] = await Promise.all([
          fetch(`${API_URL}/candidates`, { headers }),
          fetch(`${API_URL}/jobs`, { headers }),
          fetch(`${API_URL}/interviews`, { headers })
        ]);

        if (candRes.ok && jobRes.ok && intRes.ok) {
          const rawCandidates = await candRes.json();
          const rawJobs = await jobRes.json();
          const rawInterviews = await intRes.json();

          const currentUserId = user?._id || user?.id;
          const currentUserName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || '';

          const processedCandidates = rawCandidates
            .map((c) => ({
              id: c._id || c.id,
              name: c.name || 'Unknown',
              email: c.email || 'N/A',
              position: c.position || 'N/A',
              status: c.status || 'Submitted',
              recruiterId: c.recruiterId?._id || c.recruiterId,
              createdAt: c.createdAt,
              client: c.client?.name || c.client?.companyName || (typeof c.client === 'string' ? c.client : c.currentCompany) || 'N/A'
            }));

          const myJobs = rawJobs
            .filter((j) => {
              return j.primaryRecruiter === currentUserName ||
                    j.secondaryRecruiter === currentUserName ||
                    j.assignedRecruiter === currentUserId ||
                    j.recruiterId === currentUserId;
            })
            .map((j) => ({
              id: j._id || j.id || '',
              title: j.title || 'Untitled Job',
              client: j.client?.name || j.client?.companyName || (typeof j.client === 'string' ? j.client : 'Unknown Client'),
              location: j.location || 'Remote',
              jobCode: j.jobCode || 'N/A',
              createdAt: j.createdAt || new Date().toISOString(),
              skills: '',
              salaryBudget: '',
              comments: '',
              primaryRecruiter: j.primaryRecruiter,
              secondaryRecruiter: j.secondaryRecruiter,
              assignedRecruiter: j.assignedRecruiter,
              recruiterId: j.recruiterId,
            }));

          const processedInterviews = rawInterviews.map((i) => {
             const candidateIdObj = typeof i.candidateId === 'object' && i.candidateId !== null ? i.candidateId : null;
             return {
               id: i._id || i.id || '',
               candidateId: candidateIdObj ? candidateIdObj._id || candidateIdObj.id || '' : i.candidateId || '',
               candidateName: candidateIdObj?.name || i.candidateName || 'Unknown Candidate',
               candidateEmail: candidateIdObj?.email || i.candidateEmail || 'N/A',
               position: i.position || 'N/A',
               status: (new Date(i.interviewDate || i.date) < new Date() ? 'completed' : 'scheduled'),
               interviewDate: i.interviewDate || i.date || new Date().toISOString(),
               interviewType: i.type || i.interviewType || 'virtual',
               duration: i.duration || 60,
               notes: i.notes || '',
               meetingLink: i.meetingLink || '',
               feedback: i.feedback || '',
               rating: i.rating || 0,
               createdAt: i.createdAt || new Date().toISOString()
             };
           });

          setCandidates(processedCandidates);
          setJobs(myJobs);
          setInterviews(processedInterviews);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast({ title: "Error", description: "Failed to load dashboard data", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchData();
  }, [user, toast]);

  // --- Filtering Logic ---
  const filteredCandidates = useMemo(() => candidates, [candidates]);
  
  const filteredJobs = useMemo(() => jobs, [jobs]);
  
  const filteredInterviews = useMemo(() => {
    return [...interviews].sort((a, b) => new Date(a.interviewDate).getTime() - new Date(b.interviewDate).getTime());
  }, [interviews]);

  // --- Stats Calculation ---
  const candidateStats = useMemo(() => {
    const total = filteredCandidates.length;

    // Helper to check array/string statuses correctly
    const hasStatus = (statusVal, targets) => {
      const statusArr = Array.isArray(statusVal) ? statusVal : [statusVal || ''];
      return targets.some(t => statusArr.includes(t));
    };

    // Helper for partial matching (e.g. "L1 Interview")
    const hasPartialStatus = (statusVal, targetStr) => {
      const s = Array.isArray(statusVal) ? statusVal.join(' ') : (statusVal || '');
      return s.includes(targetStr);
    };

    const submitted = filteredCandidates.filter(c => hasStatus(c.status, ['Submitted', 'Pending'])).length;
    const interview = filteredCandidates.filter(c => hasPartialStatus(c.status, 'Interview')).length;
    const offer = filteredCandidates.filter(c => hasStatus(c.status, ['Offer'])).length;
    const joined = filteredCandidates.filter(c => hasStatus(c.status, ['Joined'])).length;
    
    // Fixed counting logic for these metrics
    const rejected = filteredCandidates.filter(c => hasStatus(c.status, ['Rejected'])).length;
    const selected = filteredCandidates.filter(c => hasStatus(c.status, ['Selected'])).length;
    const hold = filteredCandidates.filter(c => hasStatus(c.status, ['Hold'])).length;

    const successRate = total > 0 ? ((joined / total) * 100).toFixed(1) : '0';

    return { total, submitted, interview, offer, joined, rejected, selected, hold, successRate };
  }, [filteredCandidates]);

  const interviewStats = useMemo(() => {
    const totalInterviews = interviews.length;
    const completionRate = 0; 
    return { totalInterviews, completionRate };
  }, [interviews]);

  const jobStats = useMemo(() => ({ totalAssignedJobs: filteredJobs.length }), [filteredJobs]);

  // --- Chart Data ---
  const pipelineData = useMemo(() => [{
    name: 'Pipeline',
    Submitted: candidateStats.submitted,
    Interview: candidateStats.interview,
    Offer: candidateStats.offer,
    Joined: candidateStats.joined,
    Rejected: candidateStats.rejected,
  }], [candidateStats]);

  // Navigation
  const handleNavigateToCandidates = (status) => {
    if (status) {
      navigate(`/recruiter/candidates?status=${status}`);
    } else {
      navigate('/recruiter/candidates');
    }
  };
  const handleNavigateToAssignments = () => navigate('/recruiter/assignments');
  const handleNavigateToSchedules = () => navigate('/recruiter/schedules');
  const handleNavigateToMessages = () => navigate('/recruiter/messages');

  const getUserGreeting = () => {
    const name = user?.firstName || user?.name?.split(' ')[0] || '';
    return name ? `Welcome back, ${name}!` : "Welcome back!";
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white">{label || 'Data Point'}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.fill }}>
              {entry.name}: <span className="font-semibold">{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 dark:from-blue-400 dark:via-purple-400 dark:to-blue-200">
                Recruiter Dashboard
              </h1>
              <p className="text-base md:text-lg font-medium text-gray-800 dark:text-gray-200 mt-1">
                {getUserGreeting()}
              </p>
            </div>
          </div>
        </div>

        {/* KPI Row 1 */}
        <div className="grid gap-3 md:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <ProfessionalStatCard title="Total Candidates" value={candidateStats.total} icon={Users} trend={0} onClick={() => handleNavigateToCandidates()} borderColor="border-blue-200 dark:border-blue-800" iconColor="text-blue-600 dark:text-blue-400" />
          <ProfessionalStatCard title="Assigned Jobs" value={jobStats.totalAssignedJobs} icon={Briefcase} trend={0} onClick={handleNavigateToAssignments} borderColor="border-green-200 dark:border-green-800" iconColor="text-green-600 dark:text-green-400" />
          <ProfessionalStatCard title="Interviews" value={interviewStats.totalInterviews} icon={Calendar} trend={0} onClick={handleNavigateToSchedules} borderColor="border-purple-200 dark:border-purple-800" iconColor="text-purple-600 dark:text-purple-400" />
          <ProfessionalStatCard title="Average Time Period" value={`${candidateStats.successRate}%`} icon={TrendingUp} trend={parseFloat(candidateStats.successRate) > 0 ? 1 : 0} borderColor="border-indigo-200 dark:border-indigo-800" iconColor="text-indigo-600 dark:text-indigo-400" />
        </div>

        {/* KPI Row 2 */}
        <div className="grid gap-3 md:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <ProfessionalStatCard title="Selected" value={candidateStats.selected} icon={ClipboardList} onClick={() => handleNavigateToCandidates('Selected')} borderColor="border-blue-200 dark:border-blue-800" iconColor="text-blue-600 dark:text-blue-400" />
          <ProfessionalStatCard title="Rejected" value={candidateStats.rejected} icon={XCircle} onClick={() => handleNavigateToCandidates('Rejected')} borderColor="border-red-200 dark:border-red-800" iconColor="text-red-600 dark:text-red-400" />
          <ProfessionalStatCard title="Hold" value={candidateStats.hold} icon={CheckCircle2} onClick={() => handleNavigateToCandidates('Hold')} borderColor="border-purple-200 dark:border-purple-800" iconColor="text-purple-600 dark:text-purple-400" />
          <ProfessionalStatCard title="Joined" value={candidateStats.joined} icon={UserCheck} onClick={() => handleNavigateToCandidates('Joined')} borderColor="border-emerald-200 dark:border-emerald-800" iconColor="text-emerald-600 dark:text-emerald-400" />
        </div>

        {/* Charts Section */}
        <div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-2">
          <div className="p-4 md:p-6 shadow-lg rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-base md:text-lg font-semibold text-gray-800 dark:text-white mb-4">Candidate Pipeline</h3>
            <div className="h-64 md:h-72 lg:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="Submitted" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Interview" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Offer" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Joined" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Rejected" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
          </div>
          <div className="p-4 md:p-6 shadow-lg rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Upcoming Interviews</h3>
              <button onClick={handleNavigateToSchedules} className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Calendar</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 font-medium">
                  <tr><th className="p-3">Candidate</th><th className="p-3">Date</th><th className="p-3">Type</th></tr>
                </thead>
                <tbody>
                  {filteredInterviews.slice(0, 5).map(i => (
                    <tr key={i.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50">
                      <td className="p-3 font-medium">{i.candidateName}</td>
                      <td className="p-3">
                        <div className="font-medium">{new Date(i.interviewDate).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">{new Date(i.interviewDate).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                      </td>
                      <td className="p-3"><span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">{i.interviewType}</span></td>
                    </tr>
                  ))}
                  {filteredInterviews.length === 0 && <tr><td colSpan={3} className="p-4 text-center">No upcoming interviews</td></tr>}
                </tbody>
              </table>
            </div>
          </div> 

        
        </div>

        {/* Quick Access Tables */}
        <div className="grid gap-4 lg:gap-6 grid-cols-1">
          <div className="p-4 md:p-6 shadow-lg rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Recent Candidates</h3>
              <button onClick={() => handleNavigateToCandidates()} className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 font-medium">
                  <tr><th className="p-3">Name</th><th className="p-3">Position</th><th className="p-3">Status</th><th className="p-3">Clients</th></tr>
                </thead>
                <tbody>
                  {filteredCandidates.slice(0, 5).map(c => (
                    <tr key={c.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-3 font-medium">{c.name}</td>
                      <td className="p-3 text-gray-600 dark:text-gray-300">{c.position}</td>
                      <td className="p-3">
                        <span className={clsx("px-2 py-1 rounded-full text-xs font-medium", 
                          (Array.isArray(c.status) ? c.status.includes('Joined') : c.status === 'Joined') ? "bg-green-100 text-green-800" : 
                          (Array.isArray(c.status) ? c.status.includes('Rejected') : c.status === 'Rejected') ? "bg-red-100 text-red-800" : 
                          (Array.isArray(c.status) ? c.status.includes('Offer') : c.status === 'Offer') ? "bg-purple-100 text-purple-800" : 
                          (Array.isArray(c.status) ? c.status.some(s => s.includes('Interview')) : (c.status || '').includes('Interview')) ? "bg-amber-100 text-amber-800" : 
                          "bg-blue-100 text-blue-800" 
                        )}>{Array.isArray(c.status) ? c.status[0] : c.status}</span>
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-300 font-medium">
                        {c.client}
                      </td>
                    </tr>
                  ))}
                  {filteredCandidates.length === 0 && <tr><td colSpan={4} className="p-4 text-center">No candidates found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <button onClick={() => handleNavigateToCandidates()} className="h-auto py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg flex flex-col items-center gap-3 hover:from-blue-700 hover:to-blue-800 transition-all">
            <Users className="w-6 h-6"/>
            <div className="text-center"><div className="font-semibold text-lg">My Candidates</div><div className="text-sm opacity-90">Manage pipeline</div></div>
          </button>
          <button onClick={handleNavigateToAssignments} className="h-auto py-4 px-6 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl shadow-lg flex flex-col items-center gap-3 hover:from-green-700 hover:to-green-800 transition-all">
            <Briefcase className="w-6 h-6"/>
            <div className="text-center"><div className="font-semibold text-lg">My Jobs</div><div className="text-sm opacity-90">View jobs</div></div>
          </button>
          <button onClick={handleNavigateToSchedules} className="h-auto py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl shadow-lg flex flex-col items-center gap-3 hover:from-purple-700 hover:to-purple-800 transition-all">
            <Calendar className="w-6 h-6"/>
            <div className="text-center"><div className="font-semibold text-lg">My Schedule</div><div className="text-sm opacity-90">View calendar</div></div>
          </button>
          <button onClick={handleNavigateToMessages} className="h-auto py-4 px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl shadow-lg flex flex-col items-center gap-3 hover:from-indigo-700 hover:to-indigo-800 transition-all">
            <Mail className="w-6 h-6"/>
            <div className="text-center"><div className="font-semibold text-lg">Messages</div><div className="text-sm opacity-90">Team chat</div></div>
          </button>
        </div>

      </div>
    </main>
  );
}
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Users, UserCheck, Calendar, TrendingUp, ClipboardList, Briefcase,
  Building, ArrowUpRight, ArrowDownRight, BarChart3, PieChart as PieIcon
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

// ── API base URL ───────────────────────────────────────────────────────────────
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const API_URL  = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ProfessionalStatCard({
  title, value, icon: Icon, trend = 0, description, onClick,
  borderColor = "border-blue-500",
  iconColor = "text-blue-600"
}) {
  return (
    <div
      onClick={onClick}
      className={`
        relative bg-white dark:bg-gray-800 
        border border-gray-200 dark:border-gray-700 
        border-l-4 ${borderColor} 
        rounded-2xl p-5
        shadow-sm hover:shadow-xl 
        transition-all duration-300 
        cursor-pointer hover:-translate-y-1
        group overflow-hidden
      `}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            {title}
          </p>
          <h3 className="text-3xl font-black text-gray-900 dark:text-white mt-2">
            {value}
          </h3>
        </div>
        <div className={`p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 ${iconColor} group-hover:scale-110 transition-transform`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {description && (
        <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-700">
           <p className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2">
             {description}
           </p>
        </div>
      )}
    </div>
  );
}

const ChartCard = ({ title, subtitle, children, icon: Icon = BarChart3 }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-6">
    <div className="p-5 border-b border-gray-50 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-none uppercase tracking-tighter">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 font-medium mt-1.5">{subtitle}</p>}
      </div>
      <Icon className="w-5 h-5 text-gray-400" />
    </div>
    <div className="p-4">
      {children}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // ✅ Auth Fix: Using authHeaders from AuthContext
  const { currentUser, authHeaders } = useAuth();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [candidates, setCandidates] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [jobs,       setJobs      ] = useState([]);
  const [clients,    setClients   ] = useState([]);
  const [loading,    setLoading   ] = useState(true);

  // ── Authenticated fetch helper ──────────────────────────────────────────────
  const apiFetch = useCallback(async (path) => {
    const headers = { 'Content-Type': 'application/json', ...authHeaders() };
    const res     = await fetch(`${API_URL}${path}`, { headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`[${res.status}] ${path} – ${text}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }, [authHeaders]);

  // ── Fetch all data ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return; // Wait for user

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all endpoints in parallel
        const [candR, recR, jobR, clientR] = await Promise.allSettled([
          apiFetch('/candidates'),
          apiFetch('/recruiters'),
          apiFetch('/jobs'),
          apiFetch('/clients'),
        ]);

        if (candR.status === 'fulfilled' && Array.isArray(candR.value)) {
          setCandidates(candR.value);
        } else {
          console.error('Candidates fetch failed:', candR.reason);
        }

        if (recR.status === 'fulfilled' && Array.isArray(recR.value)) {
          // Normalize recruiter IDs
          setRecruiters(recR.value.map(r => ({ ...r, id: r._id || r.id })));
        } else {
          console.error('Recruiters fetch failed:', recR.reason);
        }

        if (jobR.status === 'fulfilled' && Array.isArray(jobR.value)) {
          setJobs(jobR.value);
        } else {
          console.error('Jobs fetch failed:', jobR.reason);
        }

        if (clientR.status === 'fulfilled' && Array.isArray(clientR.value)) {
          setClients(clientR.value);
        } else {
          console.error('Clients fetch failed:', clientR.reason);
        }

      } catch (error) {
        console.error("Dashboard Fetch Error:", error);
        toast({ title: "Error", description: "Failed to load dashboard data", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, apiFetch, toast]);

  // ── Compute Stats ───────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalCandidates = candidates.length;
    const activeRecruiters = recruiters.filter(r => r.active !== false).length;
    const totalJobs = jobs.length;
    
    const totalClients = clients.length;
    const activeClientsCount = clients.filter(c => c.active !== false).length;
    const inactiveClientsCount = totalClients - activeClientsCount;

    const submitted = candidates.filter(c => c.status === 'Submitted').length;
    const interview = candidates.filter(c => (Array.isArray(c.status) ? c.status.join(' ') : c.status || '').includes('Interview')).length;
    const offer = candidates.filter(c => (Array.isArray(c.status) ? c.status.includes('Offer') : c.status === 'Offer')).length;
    const joined = candidates.filter(c => (Array.isArray(c.status) ? c.status.includes('Joined') : c.status === 'Joined')).length;
    
    const avgTimeToHireVal = totalCandidates > 0 ? ((joined / totalCandidates) * 100).toFixed(1) : '0';
    
    return { 
        totalCandidates, activeRecruiters, totalJobs, totalClients, 
        activeClientsCount, inactiveClientsCount, submitted, interview, offer, joined, avgTimeToHireVal 
    };
  }, [candidates, recruiters, jobs, clients]);

  // ── Compute Recruiter Performance ───────────────────────────────────────────
  const recruiterStats = useMemo(() => {
    const statsMap = new Map();
    
    // Initialize map with all recruiters
    recruiters.forEach(recruiter => {
      const rid = recruiter._id || recruiter.id;
      if(rid) {
        statsMap.set(rid, {
          id: rid,
          name: (recruiter.name || recruiter.firstName || 'Unknown').split(' ')[0],
          fullName: recruiter.name || `${recruiter.firstName} ${recruiter.lastName}` || 'Unknown',
          submissions: 0, offers: 0, joined: 0, rejected: 0, hold: 0
        });
      }
    });

    // Aggregate stats from candidates
    candidates.forEach(candidate => {
      let recruiterId = null;
      if (typeof candidate.recruiterId === 'string') {
        recruiterId = candidate.recruiterId;
      } else if (candidate.recruiterId && typeof candidate.recruiterId === 'object') {
        recruiterId = candidate.recruiterId._id || candidate.recruiterId.id;
      }

      if (recruiterId && statsMap.has(recruiterId)) {
        const statsObj = statsMap.get(recruiterId);
        statsObj.submissions++;
        
        // Handle array or string status
        const statusList = Array.isArray(candidate.status) ? candidate.status : [candidate.status];
        
        if (statusList.includes('Offer')) statsObj.offers++;
        if (statusList.includes('Joined')) statsObj.joined++;
        if (statusList.includes('Rejected')) statsObj.rejected++;
        if (statusList.includes('Hold') || statusList.includes('On Hold')) statsObj.hold++;
      }
    });

    return Array.from(statsMap.values())
      .map(stat => ({ ...stat, successRate: stat.submissions > 0 ? ((stat.joined / stat.submissions) * 100).toFixed(1) : '0' }))
      .sort((a, b) => b.submissions - a.submissions);
  }, [candidates, recruiters]);

  // ── Chart Data ──────────────────────────────────────────────────────────────
  const barData = useMemo(() => {
    return recruiterStats.slice(0, 6).map(r => ({
      name: r.name || 'Unknown',
      candidates: r.submissions || 0,
      fullName: r.fullName,
      successRate: r.successRate,
      joined: r.joined
    }));
  }, [recruiterStats]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0]?.payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700">
          <p className="font-black text-gray-900 dark:text-white mb-2">{dataPoint?.fullName || label}</p>
          <div className="space-y-1">
            <p className="text-xs flex justify-between gap-4 text-gray-500 font-bold">Submissions: <span className="text-blue-600">{payload[0].value}</span></p>
            <p className="text-xs flex justify-between gap-4 text-gray-500 font-bold">Joined: <span className="text-green-600">{dataPoint.joined}</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  // ── Render Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen bg-white items-center justify-center">
        <div className="flex flex-col items-center">
            <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
            <p className="text-xs font-black text-gray-400 tracking-tighter uppercase">Initializing Dashboard...</p>
        </div>
      </div>
    );
  }

  // ── Render Dashboard ────────────────────────────────────────────────────────
  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 bg-gray-50/50">
      <div className="max-w-7xl mx-auto space-y-10">

        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-3">
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-gray-900 dark:text-white uppercase">
                Admin <span className="text-blue-600">Dashboard</span>
              </h1>
              <p className="text-gray-500 font-bold mt-1">Hello, {currentUser?.name?.split(' ')[0] || 'Admin'}! Welcome back to RecruiterHub.</p>
            </div>
          </div>
        </div>

        {/* Primary Metrics Row */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <ProfessionalStatCard title="Total Candidates" value={stats.totalCandidates} icon={Users} onClick={() => navigate('/admin/candidates')} borderColor="border-blue-500" iconColor="text-blue-600" />
          <ProfessionalStatCard title="Active Recruiters" value={stats.activeRecruiters} icon={UserCheck} onClick={() => navigate('/admin/recruiters')} borderColor="border-indigo-500" iconColor="text-indigo-600" />
          <ProfessionalStatCard title="Total Jobs" value={stats.totalJobs} icon={Briefcase} onClick={() => navigate('/admin/requirements')} borderColor="border-purple-500" iconColor="text-purple-600" />
          <ProfessionalStatCard 
            title="TOTAL CLIENTS" 
            value={stats.totalClients} 
            icon={Building} 
            description={
              <>
                <span className="text-green-600 font-black">ACTIVE: {stats.activeClientsCount}</span>
                <span className="text-gray-300 mx-2">|</span>
                <span className="text-red-500 font-black">INACTIVE: {stats.inactiveClientsCount}</span>
              </>
            }
            onClick={() => navigate('/admin/clients')} 
            borderColor="border-orange-500" 
            iconColor="text-orange-600" 
          />
        </div>

        {/* Workflow Metrics Row */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <ProfessionalStatCard title="Submitted" value={stats.submitted} icon={ClipboardList} onClick={() => navigate('/admin/candidates')} borderColor="border-blue-400" iconColor="text-blue-500" />
          <ProfessionalStatCard title="Interviews" value={stats.interview} icon={Calendar} onClick={() => navigate('/admin/candidates')} borderColor="border-purple-400" iconColor="text-purple-500" />
          <ProfessionalStatCard title="Hold" value={stats.offer} icon={Briefcase} onClick={() => navigate('/admin/candidates')} borderColor="border-green-400" iconColor="text-green-500" />
          <ProfessionalStatCard title="Joined" value={stats.joined} icon={UserCheck} onClick={() => navigate('/admin/candidates')} borderColor="border-emerald-500" iconColor="text-emerald-600" />
        </div>

        {/* High-Level Overview Row */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <ProfessionalStatCard title="Avg. Time to Hire" value={`${stats.avgTimeToHireVal}%`} icon={TrendingUp} borderColor="border-teal-500" iconColor="text-teal-600" />
          <ProfessionalStatCard title="JOINING PIPELINE" value={stats.totalCandidates} icon={Users} description="All candidates currently active in system" borderColor="border-cyan-500" iconColor="text-cyan-600" />
        </div>

        {/* Top Recruiters Chart Section */}
        <ChartCard title="Top Recruiters" subtitle="Performance based on candidates added (Upload Report)">
          <div className="h-[350px] w-full mt-4">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12, fontWeight: 700}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f9fafb'}} content={<CustomTooltip />} />
                  <Bar dataKey="candidates" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 font-bold italic">No recruiter data available for visualization</div>
            )}
          </div>
        </ChartCard>

        {/* Detailed Performance Table Section */}
        <ChartCard title="Recruiter Performance Details" icon={Users}>
          <div className="flex justify-end mb-6">
            <button
              onClick={() => navigate('/admin/recruiters')}
              className="px-5 py-2.5 text-xs font-black bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm uppercase tracking-tighter"
            >
              View Full Team
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-gray-900/50">
                  <th className="p-4 font-black text-gray-400 uppercase text-[10px] tracking-widest border-b">Recruiter Name</th>
                  <th className="p-4 font-black text-gray-400 uppercase text-[10px] tracking-widest border-b text-center">Submissions</th>
                  <th className="p-4 font-black text-gray-400 uppercase text-[10px] tracking-widest border-b text-center">Hold</th>
                  <th className="p-4 font-black text-gray-400 uppercase text-[10px] tracking-widest border-b text-center text-green-600">Joined</th>
                  <th className="p-4 font-black text-gray-400 uppercase text-[10px] tracking-widest border-b text-center text-orange-500">Hold</th>
                  <th className="p-4 font-black text-gray-400 uppercase text-[10px] tracking-widest border-b text-center text-red-500">Rejected</th>
                  <th className="p-4 font-black text-gray-400 uppercase text-[10px] tracking-widest border-b text-right">Avg. Time to Hire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recruiterStats.slice(0, 10).map((r, i) => (
                  <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-4">
                       <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">
                             {r.name.charAt(0)}
                          </div>
                          <span className="font-bold text-gray-700 dark:text-gray-200">{r.fullName}</span>
                       </div>
                    </td>
                    <td className="p-4 text-center font-bold text-gray-600">{r.submissions}</td>
                    <td className="p-4 text-center font-bold text-purple-600">{r.offers}</td>
                    <td className="p-4 text-center font-black text-green-600">{r.joined}</td>
                    <td className="p-4 text-center font-bold text-orange-500">{r.hold}</td>
                    <td className="p-4 text-center font-bold text-red-500">{r.rejected}</td>
                    <td className="p-4 text-right">
                       <span className={`font-black ${parseFloat(r.successRate) > 50 ? 'text-green-600' : 'text-gray-900'}`}>
                         {r.successRate}%
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recruiterStats.length === 0 && (
              <div className="p-20 text-center flex flex-col items-center">
                <PieIcon className="w-12 h-12 text-gray-200 mb-4" />
                <p className="text-gray-400 font-black uppercase text-xs">No performance data found for the current team.</p>
              </div>
            )}
          </div>
        </ChartCard>

      </div>
    </main>
  );
}
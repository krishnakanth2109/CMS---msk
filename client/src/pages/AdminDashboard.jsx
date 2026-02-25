import React, { useState, useMemo, useEffect } from 'react';
import {
  Users, UserCheck, TrendingUp, ClipboardList, Calendar,
  Building, ArrowUpRight, ArrowDownRight,
  PauseCircle, UserX, X, LayoutDashboard, Search, Briefcase
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

// ─── API base URL ─────────────────────────────────────────────────────────────
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const API_URL  = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

// ─── Helper Functions ─────────────────────────────────────────────────────────
function getFirebaseToken() {
  try {
    const raw = sessionStorage.getItem('currentUser');
    if (!raw) return null;
    return JSON.parse(raw)?.idToken ?? null;
  } catch {
    return null;
  }
}

function buildHeaders() {
  const token = getFirebaseToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function apiFetch(path) {
  const res = await fetch(`${API_URL}${path}`, { headers: buildHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[${res.status}] ${path} – ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// UI Components
// ─────────────────────────────────────────────────────────────────────────────

const SummaryCard = ({ title, value, trend, icon: Icon, bgColor, progressColor, iconBg }) => (
  <div className={clsx("relative overflow-hidden rounded-2xl p-6 text-white shadow-lg h-40 flex flex-col justify-between transition-transform hover:scale-[1.01]", bgColor)}>
    <div className="flex justify-between items-start">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{title}</p>
        <h3 className="text-3xl font-bold mt-1 tracking-tight">{value}</h3>
      </div>
      <div className={clsx("p-2.5 rounded-lg", iconBg)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-bold">+{trend}%</span> 
        <span className="text-[10px] opacity-70 font-medium tracking-tight">vs last month</span>
      </div>
      <div className="mt-3 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
        <div className={clsx("h-full rounded-full", progressColor)} style={{ width: '45%' }} />
      </div>
    </div>
  </div>
);

const StatusCard = ({ title, value, trend, icon: Icon, iconBg, progressColor, trendBg }) => (
  <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 h-40 flex flex-col justify-between group hover:shadow-lg transition-all">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
        <h3 className="text-3xl font-bold mt-1 text-gray-800 tracking-tight">{value}</h3>
      </div>
      <div className={clsx("p-2.5 rounded-lg transition-colors", iconBg)}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <span className={clsx("px-1.5 py-0.5 rounded text-white text-[10px] font-bold", trendBg)}>
          +{trend}%
        </span> 
        <span className="text-[10px] text-gray-400 font-bold tracking-tight">vs last month</span>
      </div>
      <div className="mt-3 h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
        <div className={clsx("h-full rounded-full", progressColor)} style={{ width: '60%' }} />
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const [candidates, setCandidates] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [clients,    setClients   ] = useState([]);
  const [loading,    setLoading   ] = useState(true);
  const [selectedRecruiter, setSelectedRecruiter] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [candR, recR, intR, clientR] = await Promise.allSettled([
          apiFetch('/candidates'),
          apiFetch('/recruiters'),
          apiFetch('/interviews'),
          apiFetch('/clients'),
        ]);

        if (candR.status === 'fulfilled') setCandidates(candR.value);
        if (recR.status === 'fulfilled') setRecruiters(recR.value.map(r => ({ ...r, id: r._id || r.id })));
        if (intR.status === 'fulfilled') setInterviews(intR.value);
        if (clientR.status === 'fulfilled') setClients(clientR.value);

        setLoading(false);
      } catch (err) {
        toast({ title: 'Error', description: 'Failed to load dashboard data', variant: 'destructive' });
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const totalCandidates  = candidates.length;
    const activeRecruiters = recruiters.filter(r => r.active !== false).length;
    
    const submitted        = candidates.filter(c => c.status === 'Submitted' || c.status?.includes('Submitted')).length;
    const rejected         = candidates.filter(c => c.status === 'Rejected' || c.status?.includes('Rejected')).length; 
    const hold             = candidates.filter(c => c.status === 'Hold' || c.status?.includes('Hold')).length;
    const joined           = candidates.filter(c => c.status === 'Joined' || c.status?.includes('Joined')).length;
    
    const successRate      = totalCandidates > 0 ? ((joined / totalCandidates) * 100).toFixed(1) : '0';
    
    return { 
      totalCandidates, activeRecruiters, totalInterviews: interviews.length, 
      totalClients: clients.length, submitted, rejected, hold, joined, successRate 
    };
  }, [candidates, recruiters, interviews, clients]);

  const recruiterStats = useMemo(() => {
    const map = new Map();
    recruiters.forEach(r => {
      const rid = r._id || r.id;
      if (!rid) return;
      map.set(rid, {
        id: rid,
        name:     (r.name || r.firstName || 'Unknown').split(' ')[0],
        fullName: r.name || `${r.firstName || ''} ${r.lastName || ''}`.trim() || 'Unknown',
        submissions: 0, hold: 0, joined: 0, rejected: 0, pending: 0,
      });
    });

    candidates.forEach(c => {
      const rid = typeof c.recruiterId === 'string' ? c.recruiterId : c.recruiterId?._id || c.recruiterId?.id;
      if (rid && map.has(rid)) {
        const s = map.get(rid);
        s.submissions++;
        const st = Array.isArray(c.status) ? (c.status[c.status.length - 1] || '') : (c.status || '');
        if      (st === 'Submitted' || st === 'Pending') s.pending++;
        else if (st === 'Hold')     s.hold++;
        else if (st === 'Joined')   s.joined++;
        else if (st === 'Rejected') s.rejected++;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.submissions - a.submissions);
  }, [candidates, recruiters]);

  const barData = useMemo(() => recruiterStats.slice(0, 6).map(r => ({
    name: r.name,
    value: r.submissions,
  })), [recruiterStats]);

  if (loading) return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="animate-spin h-10 w-10 border-4 border-[#4d47c4] border-t-transparent rounded-full" />
    </div>
  );

  return (
    <main className="flex-1 overflow-y-auto p-8 bg-[#f8faff] min-h-screen">
      <div className="max-w-[1400px] mx-auto space-y-8">

        {/* ── Header ── */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-[#4d47c4] tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 font-bold mt-1">Welcome back {currentUser?.firstName || 'kkanth'}, Have a nice day..!</p>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-100">
              {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
            </span>
          </div>
        </div>

        {/* ── Top Row Solid Cards (Summary) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard title="Total Candidates" value={stats.totalCandidates.toLocaleString()} trend={12} icon={Users} bgColor="bg-[#4d47c4]" progressColor="bg-white" iconBg="bg-white/10" />
          <SummaryCard title="Active Recruiters" value={stats.activeRecruiters} trend={5} icon={UserCheck} bgColor="bg-[#52c41a]" progressColor="bg-white" iconBg="bg-white/10" />
          <SummaryCard title="Interviews" value={stats.totalInterviews} trend={8} icon={Calendar} bgColor="bg-[#1890ff]" progressColor="bg-white" iconBg="bg-white/10" />
          <SummaryCard title="Total Clients" value={stats.totalClients} trend={3} icon={Building} bgColor="bg-[#722ed1]" progressColor="bg-white" iconBg="bg-white/10" />
        </div>

        {/* ── Second Row White Cards (Status) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatusCard title="Submitted" value={stats.submitted} trend={12} icon={Users} iconBg="bg-purple-50 text-purple-600" progressColor="bg-purple-500" trendBg="bg-[#722ed1]" />
          <StatusCard title="Joined" value={stats.joined} trend={7} icon={UserCheck} iconBg="bg-green-50 text-green-600" progressColor="bg-green-500" trendBg="bg-[#52c41a]" />
          <StatusCard title="Hold" value={stats.hold} trend={4} icon={PauseCircle} iconBg="bg-orange-50 text-orange-600" progressColor="bg-orange-500" trendBg="bg-[#faad14]" />
          <StatusCard title="Rejected" value={stats.rejected} trend={5} icon={UserX} iconBg="bg-red-50 text-red-600" progressColor="bg-red-500" trendBg="bg-[#f5222d]" />
        </div>

        {/* ── Middle Metrics Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50 flex items-center justify-between">
            <div className="flex-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Avg. Time to Hire</p>
              <h4 className="text-3xl font-black text-gray-800 mt-1 tracking-tighter">{stats.successRate}%</h4>
              <div className="mt-4 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#4d47c4] rounded-full" style={{ width: `${stats.successRate}%` }} />
              </div>
            </div>
            <div className="ml-8 p-4 bg-blue-50 rounded-xl">
              <TrendingUp className="w-8 h-8 text-[#1890ff]" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Joining Pipeline</p>
              <h4 className="text-3xl font-black text-gray-800 mt-1 tracking-tighter">{stats.totalCandidates}</h4>
              <p className="text-[11px] text-gray-400 mt-2 font-bold uppercase opacity-60">Active in organizational pipeline</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl">
              <Users className="w-8 h-8 text-[#1890ff]" />
            </div>
          </div>
        </div>

        {/* ── Charts ── */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-50">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-gray-800">Top Recruiters (Upload Report)</h3>
            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">showing {Math.min(recruiterStats.length, 6)} of {recruiters.length}</span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#4d4d4d', fontSize: 11, fontWeight: 800 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#bfbfbf', fontSize: 11, fontWeight: 600 }} unit="%" domain={[0, 100]} />
                <Tooltip cursor={{ fill: '#f8faff' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="value" fill="#4d47c4" radius={[6, 6, 0, 0]} barSize={45}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#4d47c4' : index === 1 ? '#6b64f3' : index === 2 ? '#8e88f7' : '#a8a2fa'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-[#ebf0ff] p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
            <h3 className="text-lg font-black text-[#4d47c4]">Recruiter Performance Details</h3>
            <button onClick={() => navigate('/admin/recruiters')}
              className="px-6 py-2 bg-[#4d47c4] hover:bg-[#3d38a3] text-white rounded-lg transition-all font-black text-[10px] shadow-lg uppercase tracking-wider"
            >
              View All Recruiters
            </button>
          </div>
          <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white border-b border-gray-100 text-[9px] font-black uppercase text-gray-400 tracking-widest">
                  <th className="px-8 py-4">Recruiter</th>
                  <th className="px-6 py-4 text-center">Submissions</th>
                  <th className="px-6 py-4 text-center">Hold</th>
                  <th className="px-6 py-4 text-center">Joined</th>
                  <th className="px-6 py-4 text-center">Rejected</th>
                  <th className="px-6 py-4 text-center">Pending</th>
                  <th className="px-8 py-4 text-right">Avg. Time to Hire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recruiterStats.slice(0, 10).map((r, i) => (
                  <tr key={i} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="px-8 py-4 font-bold text-gray-700 text-sm">{r.fullName}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-blue-600 font-bold text-sm hover:underline cursor-pointer" onClick={() => setSelectedRecruiter(r)}>
                        {r.submissions}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-sm text-orange-400">{r.hold}</td>
                    <td className="px-6 py-4 text-center font-bold text-sm text-green-500">{r.joined}</td>
                    <td className="px-6 py-4 text-center font-bold text-sm text-red-400">{r.rejected}</td>
                    <td className="px-6 py-4 text-center font-bold text-sm text-gray-400">{r.pending}</td>
                    <td className="px-8 py-4 text-right font-black text-sm text-red-500">
                      {r.submissions > 0 ? ((r.joined / r.submissions) * 100).toFixed(1) : '0'}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ── Recruiter Modal ── */}
      {selectedRecruiter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden border border-gray-200">
            <div className="p-6 bg-[#f8faff] border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-gray-800">Candidates by {selectedRecruiter.fullName}</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 tracking-widest">Total submissions: {selectedRecruiter.submissions}</p>
              </div>
              <button onClick={() => setSelectedRecruiter(null)} className="p-2 hover:bg-white rounded-full transition-colors border border-gray-100 shadow-sm">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-xs">
                <thead className="text-gray-400 font-black text-[9px] uppercase tracking-widest text-left border-b border-gray-100">
                  <tr>
                    <th className="pb-4">Candidate Name</th>
                    <th className="pb-4">Position</th>
                    <th className="pb-4">Status</th>
                    <th className="pb-4 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {candidates.filter(c => (typeof c.recruiterId === 'string' ? c.recruiterId : c.recruiterId?._id) === selectedRecruiter.id).map((c, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/20 transition-colors">
                      <td className="py-4 font-bold text-gray-700">{c.name}</td>
                      <td className="py-4 text-gray-500 font-medium">{c.position}</td>
                      <td className="py-4">
                        <span className={clsx("px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border", 
                          c.status === 'Joined' ? "bg-green-50 text-green-600 border-green-200" : "bg-blue-50 text-blue-600 border-blue-200")}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-4 text-right text-gray-400 font-bold">{new Date(c.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
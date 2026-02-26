import React, { useState, useMemo, useEffect } from 'react';
import {
  Users, UserCheck, TrendingUp, Calendar, Building, 
  Send, PauseCircle, UserMinus, X
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';

// ─── API Helpers ─────────────────────────────────────────────────────────────
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const API_URL  = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

function getFirebaseToken() {
  try {
    const raw = sessionStorage.getItem('currentUser');
    return raw ? JSON.parse(raw)?.idToken : null;
  } catch { return null; }
}

async function apiFetch(path) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getFirebaseToken()}`
    }
  });
  if (!res.ok) throw new Error(`Error: ${res.status}`);
  return res.json();
}

// ─── REUSABLE CARD COMPONENTS ────────────────────────────────────────────────

const SummaryCard = ({ title, value, trend, icon: Icon, bgColor, progressColor, iconBg, onClick }) => (
  <div 
    onClick={onClick}
    className={clsx(
      "relative z-10 overflow-hidden rounded-[2rem] p-6 text-white shadow-xl h-44 flex flex-col justify-between transition-all hover:scale-[1.02] cursor-pointer active:scale-95 hover:ring-4 hover:ring-white/20", 
      bgColor
    )}
  >
    <div className="flex justify-between items-start pointer-events-none">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.15em] opacity-80">{title}</p>
        <h3 className="text-2xl font-black mt-2 tracking-tighter">{value}</h3> {/* Reduced size to 2xl */}
      </div>
      <div className={clsx("p-3 rounded-2xl shadow-inner", iconBg)}>
        <Icon className="w-7 h-7 text-white" />
      </div>
    </div>
    <div className="mt-auto pointer-events-none">
      <div className="flex items-center gap-2">
        <span className="bg-white/25 px-2 py-0.5 rounded-full text-[10px] font-black">+{trend}%</span> 
        <span className="text-[9px] opacity-70 font-black uppercase tracking-tight">vs last month</span>
      </div>
      <div className="mt-4 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
        <div className={clsx("h-full rounded-full", progressColor)} style={{ width: '65%' }} />
      </div>
    </div>
  </div>
);

const StatusCard = ({ title, value, trend, icon: Icon, iconBg, trendColor, barColor, onClick }) => (
  <div 
    onClick={onClick}
    className="relative z-10 bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 h-44 flex flex-col justify-between group hover:shadow-xl transition-all cursor-pointer active:scale-95 hover:border-blue-200"
  >
    <div className="flex justify-between items-start pointer-events-none">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">{title}</p>
        <h3 className="text-2xl font-black mt-2 text-gray-900 tracking-tighter">{value}</h3> {/* Reduced size to 2xl */}
      </div>
      <div className={clsx("p-3 rounded-2xl transition-all group-hover:scale-110 shadow-sm", iconBg)}>
        <Icon className="w-7 h-7" />
      </div>
    </div>
    <div className="mt-auto pointer-events-none">
      <div className="flex items-center gap-2">
        <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-black", trendColor)}>
          +{trend}%
        </span> 
        <span className="text-[9px] text-gray-400 font-black uppercase tracking-tight">vs last month</span>
      </div>
      <div className="mt-4 h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
        <div className={clsx("h-full rounded-full transition-all duration-1000", barColor)} style={{ width: '45%' }} />
      </div>
    </div>
  </div>
);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const [candidates, setCandidates] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [clients,    setClients   ] = useState([]);
  const [loading,    setLoading   ] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [candR, recR, intR, clientR] = await Promise.allSettled([
          apiFetch('/candidates'), apiFetch('/recruiters'), apiFetch('/interviews'), apiFetch('/clients'),
        ]);
        if (candR.status === 'fulfilled') setCandidates(candR.value);
        if (recR.status === 'fulfilled') setRecruiters(recR.value);
        if (intR.status === 'fulfilled') setInterviews(intR.value);
        if (clientR.status === 'fulfilled') setClients(clientR.value);
      } catch (err) {
        toast({ title: 'Sync Error', description: 'Check server connection', variant: 'destructive' });
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  // Safe Status Helper to handle Array or String status formats
  const getSafeStatus = (s) => {
    if (Array.isArray(s)) return String(s[0] || '').toLowerCase();
    return String(s || '').toLowerCase();
  };

  const stats = useMemo(() => {
    const total = candidates.length;
    const submitted = candidates.filter(c => {
        const s = getSafeStatus(c.status);
        return s === 'submitted' || s === 'pending';
    }).length;

    const joined = candidates.filter(c => getSafeStatus(c.status) === 'joined').length;
    const hold = candidates.filter(c => getSafeStatus(c.status) === 'hold').length;
    const rejected = candidates.filter(c => getSafeStatus(c.status) === 'rejected').length;

    return { total, submitted, joined, hold, rejected };
  }, [candidates]);

  const recruiterStats = useMemo(() => {
    return recruiters.map(r => {
      const cands = candidates.filter(c => (c.recruiterId?._id || c.recruiterId) === (r._id || r.id));
      return {
        fullName: r.name || `${r.firstName || ''} ${r.lastName || ''}`.trim(),
        shortName: r.firstName || r.name?.split(' ')[0] || 'User',
        submissions: cands.length,
        joined: cands.filter(c => getSafeStatus(c.status) === 'joined').length,
      };
    }).sort((a,b) => b.submissions - a.submissions);
  }, [candidates, recruiters]);

  const barData = recruiterStats.slice(0, 6).map(r => ({ name: r.shortName, value: r.submissions }));

  if (loading) return (
    <div className="flex h-screen w-full items-center justify-center bg-[#f8faff]">
      <div className="animate-spin h-12 w-12 border-4 border-[#4d47c4] border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="flex-1 p-10 bg-[#f8faff] min-h-screen">
      <div className="max-w-[1600px] mx-auto space-y-10">

        {/* ── Header ── */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-[#4d47c4] tracking-tight">Admin Dashboard</h1>
            <p className="text-gray-500 font-bold mt-1 uppercase text-xs tracking-wider">Welcome back {currentUser?.firstName || 'kkanth'}, Have a nice day..!</p>
          </div>
          <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100 font-black text-[#4d47c4] text-xs uppercase tracking-[0.2em]">
            {format(new Date(), 'dd MMM, yyyy')}
          </div>
        </div>

        {/* ── Row 1: Summary Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <SummaryCard 
            title="Total Candidates" 
            value={stats.total} trend={12} icon={Users} bgColor="bg-[#4d47c4]" progressColor="bg-white" iconBg="bg-white/20" 
            onClick={() => navigate('/admin/add-candidate', { state: { filter: 'All' } })}
          />
          <SummaryCard 
            title="Active Recruiters" 
            value={recruiters.length} trend={5} icon={UserCheck} bgColor="bg-[#22c55e]" progressColor="bg-white" iconBg="bg-white/20" 
            onClick={() => navigate('/admin/recruiters')}
          />
          <SummaryCard 
            title="INTERVIEWS" 
            value={interviews.length} trend={8} icon={Calendar} bgColor="bg-[#3b82f6]" progressColor="bg-white" iconBg="bg-white/20" 
            onClick={() => navigate('/admin/add-candidate', { state: { filter: 'Interviews' } })}
          />
          <SummaryCard 
            title="Total Clients" 
            value={clients.length} trend={3} icon={Building} bgColor="bg-[#722ed1]" progressColor="bg-white" iconBg="bg-white/20" 
            onClick={() => navigate('/admin/clients')}
          />
        </div>

        {/* ── Row 2: Status Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <StatusCard 
            title="Submitted" 
            value={stats.submitted} trend={12} icon={Send} iconBg="bg-purple-50 text-purple-600 border border-purple-100" barColor="bg-purple-600" trendColor="bg-purple-100 text-purple-700" 
            onClick={() => navigate('/admin/add-candidate', { state: { filter: 'Submitted' } })}
          />
          <StatusCard 
            title="Joined" 
            value={stats.joined} trend={7} icon={UserCheck} iconBg="bg-green-50 text-green-600 border border-green-100" barColor="bg-green-600" trendColor="bg-green-100 text-green-700" 
            onClick={() => navigate('/admin/add-candidate', { state: { filter: 'Joined' } })}
          />
          <StatusCard 
            title="Hold" 
            value={stats.hold} trend={4} icon={PauseCircle} iconBg="bg-orange-50 text-orange-600 border border-orange-100" barColor="bg-orange-600" trendColor="bg-orange-100 text-orange-700" 
            onClick={() => navigate('/admin/add-candidate', { state: { filter: 'Hold' } })}
          />
          <StatusCard 
            title="Rejected" 
            value={stats.rejected} trend={5} icon={UserMinus} iconBg="bg-red-50 text-red-600 border border-red-100" barColor="bg-red-600" trendColor="bg-red-100 text-red-700" 
            onClick={() => navigate('/admin/add-candidate', { state: { filter: 'Rejected' } })}
          />
        </div>

        {/* ── Middle Metrics Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center justify-between group">
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Avg. Time to Hire</p>
              <h3 className="text-4xl font-black text-gray-900 mt-3">0.0%</h3>
              <div className="w-full h-2 bg-gray-100 rounded-full mt-8 overflow-hidden">
                <div className="h-full bg-[#4d47c4] rounded-full group-hover:w-[45%] transition-all duration-1000 w-0" />
              </div>
            </div>
            <div className="ml-10 bg-blue-50 p-6 rounded-[2rem]">
              <TrendingUp size={48} className="text-[#3b82f6]" />
            </div>
          </div>

          <div 
            onClick={() => navigate('/admin/add-candidate', { state: { filter: 'All' } })}
            className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all cursor-pointer z-10"
          >
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Joining Pipeline</p>
              <h3 className="text-4xl font-black text-gray-900 mt-3">{stats.total}</h3>
              <p className="text-[10px] font-bold text-gray-400 mt-6 uppercase tracking-widest">Active in organizational pipeline</p>
            </div>
            <div className="bg-indigo-50 p-6 rounded-[2rem]">
              <Users size={48} className="text-[#4d47c4]" />
            </div>
          </div>
        </div>

        {/* ── Chart Section ── */}
        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
           <h3 className="text-xl font-black text-gray-800 mb-10">Top Recruiters (Upload Report)</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 700 }} dy={15} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 600 }} />
                <Tooltip cursor={{ fill: '#f8faff' }} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={50}>
                  {barData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={['#4d47c4', '#6366f1', '#818cf8', '#a5b4fc'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Table Section ── */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-10 flex justify-between items-center bg-[#fbfcfe]">
            <h3 className="text-xl font-black text-[#4d47c4]">Recruiter Performance Details</h3>
            <button onClick={() => navigate('/admin/recruiters')} className="bg-[#4d47c4] hover:bg-[#3d38a3] text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg">
              View All Recruiters
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-[#f8faff] text-[10px] font-black uppercase text-gray-400 tracking-widest border-b border-gray-100">
                <th className="px-10 py-6 text-left">Recruiter</th>
                <th className="px-6 py-6 text-center">Submissions</th>
                <th className="px-6 py-6 text-center">Joined</th>
                <th className="px-10 py-6 text-right">Avg. Time to Hire</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recruiterStats.map((r, i) => (
                <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-10 py-6 font-bold text-gray-700 text-sm">{r.fullName}</td>
                  <td className="px-6 py-6 text-center text-blue-600 font-black text-lg">{r.submissions}</td>
                  <td className="px-6 py-6 text-center text-green-500 font-bold">{r.joined}</td>
                  <td className="px-10 py-6 text-right font-black text-red-500 text-sm">0.0%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
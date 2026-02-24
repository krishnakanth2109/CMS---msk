import React, { useState, useMemo, useEffect } from 'react';
import {
  Users, UserCheck, TrendingUp, ClipboardList, Briefcase,
  Building, ArrowUpRight, ArrowDownRight,
  PauseCircle, UserX
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
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
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ProfessionalStatCard({
  title, value, icon: Icon, trend = 0, description, onClick,
  borderColor = 'border-blue-200 dark:border-blue-800',
  iconColor   = 'text-blue-600 dark:text-blue-400',
}) {
  const isPositive = trend > 0;
  const isNegative = trend < 0;

  return (
    <div
      onClick={onClick}
      className={clsx(
        'relative bg-white dark:bg-gray-800 border rounded-xl p-3 md:p-4',
        'shadow-sm hover:shadow-md transition-all duration-300',
        'cursor-pointer hover:scale-[1.06] group overflow-hidden',
        'h-28 md:h-32 flex flex-col justify-between',
        borderColor,
        onClick && 'hover:border-2 hover:border-blue-400 dark:hover:border-blue-600',
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 to-white/50 dark:from-gray-900/30 dark:to-gray-800/30 rounded-xl" />
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
          <div className={clsx(
            'p-1.5 md:p-2 rounded-lg ml-1 md:ml-2 flex-shrink-0',
            'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50',
            'group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors',
          )}>
            <Icon className={`w-4 h-4 md:w-5 md:h-5 ${iconColor}`} />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 md:pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-1 md:space-x-2">
            {trend !== 0 && (
              <>
                {isPositive
                  ? <ArrowUpRight   className="w-3 h-3 text-green-500 flex-shrink-0" />
                  : <ArrowDownRight className="w-3 h-3 text-red-500 flex-shrink-0"   />}
                <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'}`}>
                  {trend > 0 ? '+' : ''}{trend}%
                </span>
              </>
            )}
            {description && !trend && (
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{description}</span>
            )}
            {/* Fallback description if no trend */}
            {!trend && description && (
               <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{description}</span>
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

const ChartCard = ({ children, className = '' }) => (
  <div className={`p-4 md:p-6 shadow-lg rounded-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm ${className}`}>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [candidates, setCandidates] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [jobs,       setJobs      ] = useState([]);
  const [clients,    setClients   ] = useState([]);
  const [loading,    setLoading   ] = useState(true);
  const [errors,     setErrors    ] = useState({});
  const [isMobile,   setIsMobile  ] = useState(false);

  // ── Responsive detection ────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Fetch dashboard data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!getFirebaseToken()) {
      const t = setTimeout(() => {
        if (getFirebaseToken()) triggerFetch();
        else setLoading(false);
      }, 100);
      return () => clearTimeout(t);
    }
    triggerFetch();

    function triggerFetch() {
      const fetchData = async () => {
        try {
          setLoading(true);
          setErrors({});

          const [candR, recR, jobR, clientR] = await Promise.allSettled([
            apiFetch('/candidates'),
            apiFetch('/recruiters'),
            apiFetch('/jobs'),
            apiFetch('/clients'),
          ]);

          if (candR.status === 'fulfilled' && Array.isArray(candR.value)) {
            setCandidates(candR.value);
          } else {
            setErrors(p => ({ ...p, candidates: true }));
          }

          if (recR.status === 'fulfilled' && Array.isArray(recR.value)) {
            setRecruiters(recR.value.map(r => ({ ...r, id: r._id || r.id })));
          } else {
            setErrors(p => ({ ...p, recruiters: true }));
          }

          if (jobR.status === 'fulfilled' && Array.isArray(jobR.value)) {
            setJobs(jobR.value);
          } else {
            setErrors(p => ({ ...p, jobs: true }));
          }

          if (clientR.status === 'fulfilled' && Array.isArray(clientR.value)) {
            setClients(clientR.value);
          } else {
            setErrors(p => ({ ...p, clients: true }));
          }

        } catch (err) {
          console.error('Dashboard Fetch Error:', err);
          toast({ title: 'Error', description: 'Failed to load dashboard data', variant: 'destructive' });
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, []);

  // ── Stats Calculation ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalCandidates  = candidates.length;
    const activeRecruiters = recruiters.filter(r => r.active !== false).length;
    const totalJobs        = jobs.length;
    
    // Client breakdown
    const totalClients     = clients.length;
    const activeClients    = clients.filter(c => c.active !== false).length; // Assuming 'active' defaults to true if undefined, adjust logic if needed
    const inactiveClients  = totalClients - activeClients;

    // Status counts
    const submitted        = candidates.filter(c => c.status === 'Submitted').length;
    const rejected         = candidates.filter(c => c.status === 'Rejected').length; 
    const hold             = candidates.filter(c => c.status === 'Hold').length;
    const joined           = candidates.filter(c => c.status === 'Joined').length;
    
    // Formerly "Success Rate", now mapped to "Avg. Time to Hire" card (keeping value logic same as requested, or set to 0%)
    const successRate      = totalCandidates > 0 ? ((joined / totalCandidates) * 100).toFixed(1) : '0';
    
    return { 
      totalCandidates, activeRecruiters, totalJobs, 
      totalClients, activeClients, inactiveClients,
      submitted, rejected, hold, joined, successRate 
    };
  }, [candidates, recruiters, jobs, clients]);

  // ── Recruiter performance ───────────────────────────────────────────────────
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
      const rid = typeof c.recruiterId === 'string'
        ? c.recruiterId
        : c.recruiterId?._id || c.recruiterId?.id;
      if (rid && map.has(rid)) {
        const s = map.get(rid);
        s.submissions++;
        const st = c.status || '';
        if      (st === 'Submitted' || st === 'Pending') s.pending++;
        else if (st === 'Hold')     s.hold++;
        else if (st === 'Joined')   s.joined++;
        else if (st === 'Rejected') s.rejected++;
      }
    });

    return Array.from(map.values())
      .map(s => ({ ...s, successRate: s.submissions > 0 ? ((s.joined / s.submissions) * 100).toFixed(1) : '0' }))
      .sort((a, b) => b.submissions - a.submissions);
  }, [candidates, recruiters]);

  // ── Chart data ──────────────────────────────────────────────────────────────
  const barData = useMemo(() =>
    recruiterStats.slice(0, 6).map(r => ({
      name: r.name || 'Unknown', candidates: r.submissions || 0,
      fullName: r.fullName, successRate: r.successRate, joined: r.joined,
    })),
  [recruiterStats]);

  const trendData = useMemo(() => ({
    candidates: 12, recruiters: 5, jobs: 8, clients: 3,
    submitted: 15, rejected: 4, hold: 4, joined: 7,
    successRate: parseFloat(stats.successRate) > 0 ? Math.round(parseFloat(stats.successRate) * 0.1) : 0,
  }), [stats.successRate]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const getUserGreeting = () => {
    const name = currentUser?.name || currentUser?.displayName;
    return name ? `Welcome back, ${name.split(' ')[0]}!` : 'Welcome back!';
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const dp = payload[0]?.payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-medium text-gray-900 dark:text-white">{dp?.fullName || label}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Submissions: <span className="font-semibold text-blue-600">{payload[0].value}</span>
        </p>
        {dp && <>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Avg. Time to Hire: <span className="font-semibold text-green-600">{dp.successRate}%</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Joined: <span className="font-semibold text-green-600">{dp.joined}</span>
          </p>
        </>}
      </div>
    );
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 rounded-full border-t-transparent mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard data…</p>
          </div>
        </main>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 dark:from-blue-400 dark:via-purple-400 dark:to-blue-200">
                Admin Dashboard
              </h1>
              <p className="text-base md:text-lg font-medium text-gray-800 dark:text-gray-200 mt-1">{getUserGreeting()}</p>
              <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base">Overview of recruitment performance</p>
            </div>
            {/* Notifications & Date Filter Removed */}
          </div>
        </div>

        {/* ── Partial-error banner ── */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-3 text-sm text-yellow-800 dark:text-yellow-300">
            ⚠️ Some data couldn't be loaded: {Object.keys(errors).join(', ')}. Showing partial results.
          </div>
        )}

        {/* ── Top stats ── */}
        <div className="grid gap-3 md:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <ProfessionalStatCard title="Total Candidates"  value={stats.totalCandidates}  icon={Users}     trend={trendData.candidates} onClick={() => navigate('/admin/add-candidate')} borderColor="border-blue-200 dark:border-blue-800"     iconColor="text-blue-600 dark:text-blue-400"    />
          <ProfessionalStatCard title="Active Recruiters" value={stats.activeRecruiters} icon={UserCheck} trend={trendData.recruiters} onClick={() => navigate('/admin/recruiters')}    borderColor="border-green-200 dark:border-green-800"   iconColor="text-green-600 dark:text-green-400"  />
          <ProfessionalStatCard title="Total Jobs"        value={stats.totalJobs}        icon={Briefcase} trend={trendData.jobs}       onClick={() => navigate('/admin/requirements')}  borderColor="border-indigo-200 dark:border-indigo-800" iconColor="text-indigo-600 dark:text-indigo-400" />
          
          {/* Client Card with Active/Inactive breakdown */}
          <ProfessionalStatCard 
            title="Total Clients" 
            value={stats.totalClients} 
            icon={Building} 
            description={`Active: ${stats.activeClients} | Inactive: ${stats.inactiveClients}`}
            trend={trendData.clients} 
            onClick={() => navigate('/admin/clients')} 
            borderColor="border-purple-200 dark:border-purple-800" 
            iconColor="text-purple-600 dark:text-purple-400" 
          />
        </div>

        {/* ── Pipeline stats ── */}
        <div className="grid gap-3 md:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <ProfessionalStatCard title="Submitted" value={stats.submitted} icon={ClipboardList} trend={trendData.submitted} onClick={() => navigate('/admin/candidates')} borderColor="border-blue-200 dark:border-blue-800"      iconColor="text-blue-600 dark:text-blue-400"    />
          <ProfessionalStatCard title="Joined"    value={stats.joined}    icon={UserCheck}     trend={trendData.joined}    onClick={() => navigate('/admin/candidates')} borderColor="border-emerald-200 dark:border-emerald-800" iconColor="text-emerald-600 dark:text-emerald-400" />
          <ProfessionalStatCard title="Hold"      value={stats.hold}      icon={PauseCircle}   trend={trendData.hold}      onClick={() => navigate('/admin/candidates')} borderColor="border-amber-200 dark:border-amber-800"    iconColor="text-amber-600 dark:text-amber-400"  />
          {/* New Rejected Card */}
          <ProfessionalStatCard title="Rejected"  value={stats.rejected}  icon={UserX}         trend={trendData.rejected}  onClick={() => navigate('/admin/candidates')} borderColor="border-red-200 dark:border-red-800"        iconColor="text-red-600 dark:text-red-400"       />
        </div>

        {/* ── Bottom stats (Renamed) ── */}
        <div className="grid gap-3 md:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
          {/* Renamed Success Rate -> Avg. Time to Hire */}
          <ProfessionalStatCard title="Avg. Time to Hire" value={`${stats.successRate}%`} icon={TrendingUp} trend={parseFloat(stats.successRate) > 0 ? trendData.successRate : 0} borderColor="border-teal-200 dark:border-teal-800" iconColor="text-teal-600 dark:text-teal-400" />
          {/* Renamed Total Pipeline -> Joining Pipeline */}
          <ProfessionalStatCard title="Joining Pipeline"  value={stats.totalCandidates}   icon={Users}      description="Active candidates in pipeline" borderColor="border-cyan-200 dark:border-cyan-800" iconColor="text-cyan-600 dark:text-cyan-400" />
        </div>

        {/* ── Charts ── */}
        <div className="grid gap-4 lg:gap-6 grid-cols-1">
          {/* Bar chart - Renamed & Full Width now */}
          <ChartCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-semibold text-gray-800 dark:text-white">Top Recruiters (Upload Report)</h3>
              <div className="text-xs text-gray-500">Showing {Math.min(recruiterStats.length, 6)} of {recruiters.length}</div>
            </div>
            <div className="h-64 md:h-72 lg:h-80 relative">
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="name" stroke="#6B7280" tick={{ fill: '#6B7280' }}
                      fontSize={isMobile ? 10 : 12} angle={isMobile ? -45 : 0}
                      textAnchor={isMobile ? 'end' : 'middle'} height={isMobile ? 80 : 40} interval={0}
                    />
                    <YAxis stroke="#6B7280" fontSize={12} tick={{ fill: '#6B7280' }} domain={[0, 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Bar dataKey="candidates" name="Candidates Added" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={60} animationDuration={1500} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-4">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No recruiter data available</p>
                  </div>
                </div>
              )}
            </div>
          </ChartCard>
          
          {/* Pipeline Breakdown Chart REMOVED */}
        </div>

        {/* ── Recruiter performance table ── */}
        <ChartCard>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
            <h3 className="text-base md:text-lg font-semibold text-gray-800 dark:text-white">Recruiter Performance Details</h3>
            <button onClick={() => navigate('/admin/recruiters')}
              className="px-3 py-2 text-sm md:px-4 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              View All Recruiters
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 font-medium">
                <tr>
                  <th className="p-2 md:p-3">Recruiter</th>
                  <th className="p-2 md:p-3 text-center">Submissions</th>
                  <th className="p-2 md:p-3 text-center">Hold</th>
                  <th className="p-2 md:p-3 text-center">Joined</th>
                  <th className="p-2 md:p-3 text-center">Rejected</th>
                  <th className="p-2 md:p-3 text-center">Pending</th>
                  <th className="p-2 md:p-3 text-right">Avg. Time to Hire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {recruiterStats.slice(0, 10).map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="p-2 md:p-3 font-medium text-gray-900 dark:text-white truncate max-w-[100px]">{r.fullName}</td>
                    <td className="p-2 md:p-3 text-center text-blue-600   font-medium">{r.submissions}</td>
                    <td className="p-2 md:p-3 text-center text-amber-600  font-medium">{r.hold}</td>
                    <td className="p-2 md:p-3 text-center text-green-600  font-bold"  >{r.joined}</td>
                    <td className="p-2 md:p-3 text-center text-red-600    font-medium">{r.rejected}</td>
                    <td className="p-2 md:p-3 text-center text-gray-500   font-medium">{r.pending}</td>
                    <td className="p-2 md:p-3 text-right font-bold">
                      <span className={parseFloat(r.successRate) > 50 ? 'text-green-600' : parseFloat(r.successRate) > 20 ? 'text-yellow-600' : 'text-red-600'}>
                        {r.successRate}%
                      </span>
                    </td>
                  </tr>
                ))}
                {recruiterStats.length === 0 && (
                  <tr><td colSpan={7} className="p-4 text-center text-gray-500">No recruiter data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </ChartCard>

      </div>
    </main>
  );
}
import React, { useState, useMemo, forwardRef, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import {
  Users, UserCheck, Calendar, TrendingUp, ClipboardList, Briefcase,
  ChevronDown, Building, Bell, ArrowUpRight, ArrowDownRight,
  CalendarDays, Filter, X, PauseCircle,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

// ─── API base URL ─────────────────────────────────────────────────────────────
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const API_URL  = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

// ─────────────────────────────────────────────────────────────────────────────
// THE ONE FIX:
//   AuthContext writes to sessionStorage under the key 'currentUser':
//     { idToken, refreshToken, ...userData }
//   The old code read sessionStorage.getItem('authToken') → always null → 401
//   This helper reads the correct key and correct field.
// ─────────────────────────────────────────────────────────────────────────────
function getFirebaseToken() {
  try {
    const raw = sessionStorage.getItem('currentUser');   // ← correct key
    if (!raw) return null;
    return JSON.parse(raw)?.idToken ?? null;             // ← correct field
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
// Sub-components  (pure, no hooks → defined outside, stable across renders)
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

const CustomDateInput = forwardRef(({ value, onClick, placeholder, isMobile = false }, ref) => (
  <button
    type="button" ref={ref} onClick={onClick}
    className={clsx(
      'flex items-center justify-between w-full px-3 py-2 md:px-4 md:py-3 text-left',
      'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl',
      'hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
      'transition-colors shadow-sm relative z-10',
      isMobile && 'text-sm',
    )}
  >
    <div className="flex items-center gap-2 md:gap-3">
      <CalendarDays className="w-4 h-4 text-gray-500 flex-shrink-0" />
      <span className={clsx(
        value ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500',
        isMobile && 'text-sm',
        'truncate',
      )}>
        {value || placeholder}
      </span>
    </div>
    <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
  </button>
));
CustomDateInput.displayName = 'CustomDateInput';

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
  const { currentUser } = useAuth();   // only used for greeting + guard

  // ── Data state ──────────────────────────────────────────────────────────────
  const [candidates, setCandidates] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [jobs,       setJobs      ] = useState([]);
  const [clients,    setClients   ] = useState([]);
  const [loading,    setLoading   ] = useState(true);
  const [errors,     setErrors    ] = useState({});

  // ── UI state ────────────────────────────────────────────────────────────────
  const [startDate,         setStartDate        ] = useState(null);
  const [endDate,           setEndDate          ] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications,     setNotifications    ] = useState([]);
  const [isMobile,          setIsMobile         ] = useState(false);
  const [showDateFilter,    setShowDateFilter   ] = useState(false);

  const datePickerRef    = useRef(null);
  const notificationsRef = useRef(null);

  // ── Close notifications on outside click ────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target))
        setNotificationsOpen(false);
    };
    if (notificationsOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notificationsOpen]);

  // ── Responsive detection ────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setShowDateFilter(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Fetch dashboard data ─────────────────────────────────────────────────────
  // No dependency on authHeaders / callbacks — reads token directly from
  // sessionStorage at call time so there's no stale-closure / timing issue.
  useEffect(() => {
    // Safety guard: don't fetch if the session isn't ready yet
    if (!getFirebaseToken()) {
      // Retry after a short tick — token may not be written yet on first render
      const t = setTimeout(() => {
        if (getFirebaseToken()) triggerFetch();
        else setLoading(false);   // give up, user probably not logged in
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
            console.error('Candidates:', candR.reason?.message);
            setErrors(p => ({ ...p, candidates: true }));
          }

          if (recR.status === 'fulfilled' && Array.isArray(recR.value)) {
            setRecruiters(recR.value.map(r => ({ ...r, id: r._id || r.id })));
          } else {
            console.error('Recruiters:', recR.reason?.message);
            setErrors(p => ({ ...p, recruiters: true }));
          }

          if (jobR.status === 'fulfilled' && Array.isArray(jobR.value)) {
            setJobs(jobR.value);
          } else {
            console.error('Jobs:', jobR.reason?.message);
            setErrors(p => ({ ...p, jobs: true }));
          }

          if (clientR.status === 'fulfilled' && Array.isArray(clientR.value)) {
            setClients(clientR.value);
          } else {
            console.error('Clients:', clientR.reason?.message);
            setErrors(p => ({ ...p, clients: true }));
          }

          setNotifications([
            { id: '1', title: 'System Ready',   message: 'Dashboard loaded successfully',  timestamp: new Date(),                       read: false, type: 'success' },
            { id: '2', title: 'New Candidates', message: 'Check recent submissions',       timestamp: new Date(Date.now() - 10_000_000), read: true,  type: 'info'    },
          ]);
        } catch (err) {
          console.error('Dashboard Fetch Error:', err);
          toast({ title: 'Error', description: 'Failed to load dashboard data', variant: 'destructive' });
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // ← runs once on mount; reads token directly at call-time, no deps needed

  // ── Date-filtered slices ────────────────────────────────────────────────────
  const dateFilteredCandidates = useMemo(() => {
    if (!startDate && !endDate) return candidates;
    return candidates.filter(c => {
      const d = new Date(c.createdAt);
      return (!startDate || d >= startDate) && (!endDate || d <= endDate);
    });
  }, [candidates, startDate, endDate]);

  const dateFilteredJobs = useMemo(() => {
    if (!startDate && !endDate) return jobs;
    return jobs.filter(j => {
      const d = new Date(j.date || j.createdAt);
      return (!startDate || d >= startDate) && (!endDate || d <= endDate);
    });
  }, [jobs, startDate, endDate]);

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalCandidates  = dateFilteredCandidates.length;
    const activeRecruiters = recruiters.filter(r => r.active !== false).length;
    const totalJobs        = dateFilteredJobs.length;
    const totalClients     = clients.length;
    const submitted        = dateFilteredCandidates.filter(c => c.status === 'Submitted').length;
    const interview        = dateFilteredCandidates.filter(c => c.status?.includes('Interview')).length;
    const hold             = dateFilteredCandidates.filter(c => c.status === 'Hold').length;
    const joined           = dateFilteredCandidates.filter(c => c.status === 'Joined').length;
    const successRate      = totalCandidates > 0 ? ((joined / totalCandidates) * 100).toFixed(1) : '0';
    return { totalCandidates, activeRecruiters, totalJobs, totalClients, submitted, interview, hold, joined, successRate };
  }, [dateFilteredCandidates, recruiters, dateFilteredJobs, clients]);

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

    dateFilteredCandidates.forEach(c => {
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
  }, [dateFilteredCandidates, recruiters]);

  // ── Chart data ──────────────────────────────────────────────────────────────
  const pieData = useMemo(() => [
    { name: 'Submitted', value: stats.submitted, color: '#3B82F6' },
    { name: 'Interview', value: stats.interview, color: '#8B5CF6' },
    { name: 'Hold',      value: stats.hold,      color: '#F59E0B' },
    { name: 'Joined',    value: stats.joined,    color: '#059669' },
  ].filter(d => d.value > 0), [stats]);

  const barData = useMemo(() =>
    recruiterStats.slice(0, 6).map(r => ({
      name: r.name || 'Unknown', candidates: r.submissions || 0,
      fullName: r.fullName, successRate: r.successRate, joined: r.joined,
    })),
  [recruiterStats]);

  const trendData = useMemo(() => ({
    candidates: 12, recruiters: 5, jobs: 8, clients: 3,
    submitted: 15, interviews: -2, hold: 4, joined: 7,
    successRate: parseFloat(stats.successRate) > 0 ? Math.round(parseFloat(stats.successRate) * 0.1) : 0,
  }), [stats.successRate]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const markAsRead  = (id) => setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n));
  const unreadCount = notifications.filter(n => !n.read).length;

  const getUserGreeting = () => {
    const name = currentUser?.name || currentUser?.displayName;
    return name ? `Welcome back, ${name.split(' ')[0]}!` : 'Welcome back!';
  };

  const clearDateFilters = () => {
    setStartDate(null); setEndDate(null);
    if (isMobile) setShowDateFilter(false);
  };

  const getDateDisplayText = () => {
    if (!startDate && !endDate) return 'Select Date Range';
    const fmt = (d, o) => d.toLocaleDateString('en-US', o);
    if (startDate && endDate)
      return `${fmt(startDate, { month: 'short', day: 'numeric' })} – ${fmt(endDate, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    if (startDate) return `From ${fmt(startDate, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    return 'Select Date Range';
  };

  const PopperContainer = ({ children }) => <div className="z-[9999]">{children}</div>;

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
            Success Rate: <span className="font-semibold text-green-600">{dp.successRate}%</span>
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

            <div className="flex items-center gap-3">
              {/* Notifications bell */}
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setNotificationsOpen(o => !o)}
                  className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 top-12 w-72 md:w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[9998] max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 font-semibold text-sm">Notifications</div>
                    {notifications.length === 0
                      ? <div className="p-4 text-center text-gray-500 text-sm">No notifications</div>
                      : notifications.map(n => (
                        <div key={n.id} onClick={() => markAsRead(n.id)}
                          className={clsx('p-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700', !n.read && 'bg-blue-50 dark:bg-blue-900/10')}
                        >
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-xs text-gray-500">{n.message}</p>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>

              {/* Mobile date-filter toggle */}
              {isMobile && (
                <button
                  onClick={() => setShowDateFilter(s => !s)}
                  className="flex items-center gap-2 px-3 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-sm font-medium"
                >
                  <Filter className="w-4 h-4" />
                  {startDate || endDate ? getDateDisplayText() : 'Filter Dates'}
                </button>
              )}
            </div>
          </div>

          {/* ── Date filter panel ── */}
          {(!isMobile || showDateFilter) && (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Date Range</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-48">
                    <DatePicker
                      selected={startDate} onChange={setStartDate}
                      selectsStart startDate={startDate} endDate={endDate}
                      placeholderText="Start Date"
                      customInput={<CustomDateInput isMobile={isMobile} placeholder="Start Date" />}
                      dateFormat="MMM d, yyyy" wrapperClassName="w-full"
                      popperContainer={PopperContainer} popperPlacement="bottom-start"
                      showPopperArrow={false} ref={datePickerRef} isClearable
                      portalId="react-datepicker-portal"
                    />
                  </div>
                  <div className="hidden sm:flex items-center justify-center text-gray-400">to</div>
                  <div className="relative flex-1 md:w-48">
                    <DatePicker
                      selected={endDate} onChange={setEndDate}
                      selectsEnd startDate={startDate} endDate={endDate}
                      minDate={startDate || undefined}
                      placeholderText="End Date"
                      customInput={<CustomDateInput isMobile={isMobile} placeholder="End Date" />}
                      dateFormat="MMM d, yyyy" wrapperClassName="w-full"
                      popperContainer={PopperContainer} popperPlacement="bottom-start"
                      showPopperArrow={false} isClearable
                      portalId="react-datepicker-portal"
                    />
                  </div>
                  {(startDate || endDate) && (
                    <button onClick={clearDateFilters}
                      className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" /> Clear
                    </button>
                  )}
                  {isMobile && (
                    <button onClick={() => setShowDateFilter(false)}
                      className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
              {(startDate || endDate) && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Showing data from:</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">{getDateDisplayText()}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Partial-error banner ── */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-3 text-sm text-yellow-800 dark:text-yellow-300">
            ⚠️ Some data couldn't be loaded: {Object.keys(errors).join(', ')}. Showing partial results.
          </div>
        )}

        {/* ── Top stats ── */}
        <div className="grid gap-3 md:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* ✅ Candidates → /admin/add-candidate */}
          <ProfessionalStatCard title="Total Candidates"  value={stats.totalCandidates}  icon={Users}     trend={trendData.candidates} onClick={() => navigate('/admin/add-candidate')} borderColor="border-blue-200 dark:border-blue-800"     iconColor="text-blue-600 dark:text-blue-400"    />
          <ProfessionalStatCard title="Active Recruiters" value={stats.activeRecruiters} icon={UserCheck} trend={trendData.recruiters} onClick={() => navigate('/admin/recruiters')}    borderColor="border-green-200 dark:border-green-800"   iconColor="text-green-600 dark:text-green-400"  />
          <ProfessionalStatCard title="Total Jobs"        value={stats.totalJobs}        icon={Briefcase} trend={trendData.jobs}       onClick={() => navigate('/admin/requirements')}  borderColor="border-indigo-200 dark:border-indigo-800" iconColor="text-indigo-600 dark:text-indigo-400" />
          <ProfessionalStatCard title="Active Clients"    value={stats.totalClients}     icon={Building}  trend={trendData.clients}    onClick={() => navigate('/admin/clients')}        borderColor="border-purple-200 dark:border-purple-800" iconColor="text-purple-600 dark:text-purple-400" />
        </div>

        {/* ── Pipeline stats ── */}
        <div className="grid gap-3 md:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <ProfessionalStatCard title="Submitted"  value={stats.submitted} icon={ClipboardList} trend={trendData.submitted}  onClick={() => navigate('/admin/candidates')} borderColor="border-blue-200 dark:border-blue-800"      iconColor="text-blue-600 dark:text-blue-400"    />
          <ProfessionalStatCard title="Interviews" value={stats.interview} icon={Calendar}      trend={trendData.interviews} onClick={() => navigate('/admin/candidates')} borderColor="border-indigo-200 dark:border-indigo-800"  iconColor="text-indigo-600 dark:text-indigo-400" />
          {/* ✅ Hold (replaces Offer) */}
          <ProfessionalStatCard title="Hold"       value={stats.hold}      icon={PauseCircle}   trend={trendData.hold}       onClick={() => navigate('/admin/candidates')} borderColor="border-amber-200 dark:border-amber-800"    iconColor="text-amber-600 dark:text-amber-400"  />
          <ProfessionalStatCard title="Joined"     value={stats.joined}    icon={UserCheck}     trend={trendData.joined}     onClick={() => navigate('/admin/candidates')} borderColor="border-emerald-200 dark:border-emerald-800" iconColor="text-emerald-600 dark:text-emerald-400" />
        </div>

        {/* ── Success stats ── */}
        <div className="grid gap-3 md:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
          <ProfessionalStatCard title="Success Rate"   value={`${stats.successRate}%`} icon={TrendingUp} trend={parseFloat(stats.successRate) > 0 ? trendData.successRate : 0} borderColor="border-teal-200 dark:border-teal-800" iconColor="text-teal-600 dark:text-teal-400" />
          <ProfessionalStatCard title="Total Pipeline" value={stats.totalCandidates}   icon={Users}      description="Active candidates in pipeline" borderColor="border-cyan-200 dark:border-cyan-800" iconColor="text-cyan-600 dark:text-cyan-400" />
        </div>

        {/* ── Charts ── */}
        <div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-2">

          {/* Bar chart */}
          <ChartCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-semibold text-gray-800 dark:text-white">Top Recruiters (Candidates Added)</h3>
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

          {/* Pie chart */}
          <ChartCard>
            <h3 className="text-base md:text-lg font-semibold mb-4 text-gray-800 dark:text-white">Pipeline Breakdown</h3>
            <div className="h-64 md:h-72 lg:h-80">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%"
                      innerRadius={isMobile ? 40 : 60} outerRadius={isMobile ? 80 : 100}
                      paddingAngle={2} dataKey="value"
                      label={e => `${e.name}: ${e.value}`} labelLine={false}
                    >
                      {pieData.map((entry, i) => <Cell key={`cell-${i}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No candidate data available</p>
                  </div>
                </div>
              )}
            </div>
          </ChartCard>
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
                  <th className="p-2 md:p-3 text-right">Success Rate</th>
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
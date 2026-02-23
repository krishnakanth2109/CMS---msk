import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, Users, Briefcase, Award, Loader2 } from 'lucide-react';

// FIX: VITE_API_URL="http://localhost:5000" (no /api suffix in .env).
// The old code used || 'http://localhost:5000/api' as fallback, but since
// the env var IS set, the fallback never triggered and /api was missing.
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const API_URL  = `${BASE_URL}/api`;

export default function RecruiterReports() {
  // FIX: AuthContext exports `currentUser`, not `user`.
  // The old `const { user } = useAuth()` always gave undefined.
  const { currentUser, authHeaders } = useAuth();

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    stats: {
      totalSubmissions:         0,
      activeInterviews:         0,
      totalInterviewsScheduled: 0,
      offers:                   0,
      joined:                   0,
      successRate:              0,
    },
    statusData: [],
    weeklyData: [],
  });

  // FIX: Build auth headers using AuthContext.authHeaders() which auto-refreshes
  // the Firebase token when needed. The old code used:
  //   sessionStorage.getItem('authToken')  ← wrong key (should be 'currentUser')
  // and read the token synchronously without any refresh logic.
  const buildHeaders = useCallback(async () => {
    const ah = await authHeaders();   // { Authorization: 'Bearer <fresh-token>' }
    return { 'Content-Type': 'application/json', ...ah };
  }, [authHeaders]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers  = await buildHeaders();
        const response = await fetch(`${API_URL}/reports/recruiter`, { headers });

        if (response.ok) {
          const data = await response.json();
          setReportData(data);
        } else {
          const err = await response.json().catch(() => ({}));
          console.error('Failed to load recruiter reports:', err.message);
        }
      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: '#ffffff',
      border:          '1px solid #e2e8f0',
      borderRadius:    '8px',
      color:           '#0f172a',
    },
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-slate-500">Loading reports...</p>
        </div>
      </div>
    );
  }

  const { stats, statusData, weeklyData } = reportData;

  // Build the display name from currentUser (which has firstName/lastName from AuthContext)
  const displayName = currentUser
    ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email
    : 'Recruiter';

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">

        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Reports</h1>
          <p className="text-slate-500 mt-1">Performance analytics for {displayName}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: 'Total Candidates',
              value: stats.totalSubmissions,
              sub:   'All time submissions',
              Icon:  Users,
            },
            {
              title: 'Interviews Scheduled',
              value: stats.totalInterviewsScheduled,
              sub:   'Total interviews created',
              Icon:  Briefcase,
            },
            {
              title: 'Offers & Joins',
              value: (
                <>
                  {stats.offers}
                  <span className="text-sm font-normal text-slate-400"> / {stats.joined}</span>
                </>
              ),
              sub:  'Offers Extended / Joined',
              Icon: Award,
            },
            {
              title: 'Performance',
              value: `${stats.successRate}%`,
              sub:   'Join to Submission ratio',
              Icon:  TrendingUp,
            },
          ].map(({ title, value, sub, Icon }) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
              <div className="flex items-center justify-between pb-2">
                <span className="text-sm font-medium text-slate-500">{title}</span>
                <Icon className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900">{value}</div>
              <p className="text-xs text-slate-400 mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-6">Weekly Activity Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fill: '#64748b' }} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="submitted"  name="Submissions" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="interviews" name="Interviews"  stroke="#a855f7" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-6">Current Pipeline Status</h3>
            {statusData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-slate-400">
                No candidate data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData} cx="50%" cy="50%" labelLine={false}
                    label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                    outerRadius={100} dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

        </div>

        {/* Charts Row 2 */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
          <h3 className="font-semibold text-slate-900 mb-6">Monthly Breakdown (Last 4 Weeks)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" tick={{ fill: '#64748b' }} />
              <YAxis allowDecimals={false} tick={{ fill: '#64748b' }} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="submitted"  name="Submissions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="interviews" name="Interviews"  fill="#a855f7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="offers"     name="Offers"      fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}
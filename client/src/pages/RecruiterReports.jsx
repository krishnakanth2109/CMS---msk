import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, Users, Briefcase, Award, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function RecruiterReports() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = sessionStorage.getItem('authToken');
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
        const [resCandidates, resInterviews] = await Promise.all([
          fetch(`${API_URL}/candidates`, { headers }),
          fetch(`${API_URL}/interviews`, { headers })
        ]);
        if (resCandidates.ok && resInterviews.ok) {
          setCandidates(await resCandidates.json());
          setInterviews(await resInterviews.json());
        }
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = useMemo(() => {
    const totalSubmissions = candidates.length;
    const activeInterviews = candidates.filter(c =>
      ['L1 Interview', 'L2 Interview', 'Final Interview', 'Technical Interview', 'HR Interview', 'Interview'].includes(c.status)
    ).length;
    const totalInterviewsScheduled = interviews.length;
    const offers = candidates.filter(c => c.status === 'Offer').length;
    const joined = candidates.filter(c => c.status === 'Joined').length;
    const successRate = totalSubmissions > 0 ? Math.round((joined / totalSubmissions) * 100) : 0;
    return { totalSubmissions, activeInterviews, totalInterviewsScheduled, offers, joined, successRate };
  }, [candidates, interviews]);

  const statusData = useMemo(() => {
    return [
      { name: 'Submitted', value: candidates.filter(c => c.status === 'Submitted' || c.status === 'Pending').length, color: '#3b82f6' },
      { name: 'Interview', value: candidates.filter(c => ['L1 Interview', 'L2 Interview', 'Final Interview', 'Technical Interview', 'HR Interview', 'Interview'].includes(c.status)).length, color: '#a855f7' },
      { name: 'Offer', value: candidates.filter(c => c.status === 'Offer').length, color: '#22c55e' },
      { name: 'Joined', value: candidates.filter(c => c.status === 'Joined').length, color: '#f97316' },
      { name: 'Rejected', value: candidates.filter(c => c.status === 'Rejected').length, color: '#ef4444' },
    ].filter(item => item.value > 0);
  }, [candidates]);

  const weeklyData = useMemo(() => {
    const today = new Date();
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
      const end = new Date(today);
      end.setDate(today.getDate() - (i * 7));
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      const label = `${start.toLocaleString('default', { month: 'short' })} ${start.getDate()}`;
      weeks.push({ start, end, label });
    }
    return weeks.map(week => ({
      week: week.label,
      submitted: candidates.filter(c => {
        const d = new Date(c.dateAdded || c.createdAt || '');
        return d >= week.start && d <= week.end;
      }).length,
      interviews: interviews.filter(i => {
        const d = new Date(i.interviewDate);
        return d >= week.start && d <= week.end;
      }).length,
      offers: candidates.filter(c => {
        const d = new Date(c.dateAdded || c.createdAt || '');
        return c.status === 'Offer' && d >= week.start && d <= week.end;
      }).length
    }));
  }, [candidates, interviews]);

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: 'hsl(var(--background))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px'
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground">My Reports</h1>
          <p className="text-muted-foreground mt-2">Performance analytics for {user?.name || 'Recruiter'}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: 'Total Candidates', value: stats.totalSubmissions, sub: 'All time submissions', Icon: Users },
            { title: 'Interviews Scheduled', value: stats.totalInterviewsScheduled, sub: 'Total interviews created', Icon: Briefcase },
            { title: 'Offers & Joins', value: <>{stats.offers} <span className="text-sm font-normal text-muted-foreground">/ {stats.joined}</span></>, sub: 'Offers Extended / Joined', Icon: Award },
            { title: 'Performance', value: `${stats.successRate}%`, sub: 'Join to Submission ratio', Icon: TrendingUp },
          ].map(({ title, value, sub, Icon }) => (
            <div key={title} className="rounded-xl border border-border bg-card shadow-sm p-6">
              <div className="flex items-center justify-between pb-2">
                <span className="text-sm font-medium text-muted-foreground">{title}</span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-card shadow-sm p-6">
            <h3 className="font-semibold text-foreground mb-4">Weekly Activity Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" className="text-sm" />
                <YAxis className="text-sm" allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="submitted" name="Submissions" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="interviews" name="Interviews" stroke="#a855f7" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm p-6">
            <h3 className="font-semibold text-foreground mb-4">Current Pipeline Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData} cx="50%" cy="50%" labelLine={false}
                  label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                  outerRadius={80} dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-6">
          <h3 className="font-semibold text-foreground mb-4">Monthly Breakdown (Last 4 Weeks)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="week" className="text-sm" />
              <YAxis className="text-sm" allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Legend />
              <Bar dataKey="submitted" name="Submissions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="interviews" name="Interviews" fill="#a855f7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="offers" name="Offers" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

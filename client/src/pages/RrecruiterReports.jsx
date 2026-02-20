import React, { useEffect, useState, useMemo } from 'react';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Briefcase, Award, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function RecruiterReports() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Fetch Data from Backend ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = sessionStorage.getItem('authToken');
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };

        // Fetch Candidates and Interviews in parallel
        const [resCandidates, resInterviews] = await Promise.all([
          fetch(`${API_URL}/candidates`, { headers }),
          fetch(`${API_URL}/interviews`, { headers })
        ]);

        if (resCandidates.ok && resInterviews.ok) {
          const candidatesData = await resCandidates.json();
          const interviewsData = await resInterviews.json();
          setCandidates(candidatesData);
          setInterviews(interviewsData);
        }
      } catch (error) {
        console.error("Error fetching report data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- Calculate Statistics ---
  
  // 1. KPI Cards Data
  const stats = useMemo(() => {
    const totalSubmissions = candidates.length;
    
    // Count candidates currently in any interview stage
    const activeInterviews = candidates.filter(c => 
      ['L1 Interview', 'L2 Interview', 'Final Interview', 'Technical Interview', 'HR Interview', 'Interview'].includes(c.status)
    ).length;
    
    // Total interviews scheduled (historical from interviews collection)
    const totalInterviewsScheduled = interviews.length;

    const offers = candidates.filter(c => c.status === 'Offer').length;
    const joined = candidates.filter(c => c.status === 'Joined').length;
    
    // Success Rate: Joined / Total Submissions
    const successRate = totalSubmissions > 0 ? Math.round((joined / totalSubmissions) * 100) : 0;

    return { totalSubmissions, activeInterviews, totalInterviewsScheduled, offers, joined, successRate };
  }, [candidates, interviews]);

  // 2. Pie Chart Data (Status Distribution)
  const statusData = useMemo(() => {
    const submitted = candidates.filter(c => c.status === 'Submitted' || c.status === 'Pending').length;
    const interview = candidates.filter(c => 
      ['L1 Interview', 'L2 Interview', 'Final Interview', 'Technical Interview', 'HR Interview', 'Interview'].includes(c.status)
    ).length;
    const offer = candidates.filter(c => c.status === 'Offer').length;
    const joined = candidates.filter(c => c.status === 'Joined').length;
    const rejected = candidates.filter(c => c.status === 'Rejected').length;

    return [
      { name: 'Submitted', value: submitted, color: '#3b82f6' }, // Blue
      { name: 'Interview', value: interview, color: '#a855f7' }, // Purple
      { name: 'Offer', value: offer, color: '#22c55e' }, // Green
      { name: 'Joined', value: joined, color: '#f97316' }, // Orange
    ].filter(item => item.value > 0); // Only show segments with data
  }, [candidates]);

  // 3. Weekly Performance Data (Last 4 Weeks)
  const weeklyData = useMemo(() => {
    const weeks = [];
    const today = new Date();
    
    // Generate last 4 weeks buckets
    for (let i = 3; i >= 0; i--) {
      const end = new Date(today);
      end.setDate(today.getDate() - (i * 7));
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      
      const label = `${start.toLocaleString('default', { month: 'short' })} ${start.getDate()}`;
      
      weeks.push({ start, end, label });
    }

    return weeks.map(week => {
      // Count Candidates added in this week
      const submittedCount = candidates.filter(c => {
        const d = new Date(c.dateAdded || c.createdAt || '');
        return d >= week.start && d <= week.end;
      }).length;

      // Count Interviews scheduled in this week
      const interviewCount = interviews.filter(i => {
        const d = new Date(i.interviewDate);
        return d >= week.start && d <= week.end;
      }).length;

      // Count Offers
      const offerCount = candidates.filter(c => {
        const d = new Date(c.dateAdded || c.createdAt || ''); 
        return c.status === 'Offer' && d >= week.start && d <= week.end;
      }).length;

      return {
        week: week.label,
        submitted: submittedCount,
        interviews: interviewCount,
        offers: offerCount
      };
    });
  }, [candidates, interviews]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground">My Reports</h1>
            <p className="text-muted-foreground mt-2">
              Performance analytics for {user?.name || 'Recruiter'}
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
                <p className="text-xs text-muted-foreground">All time submissions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Interviews Scheduled</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalInterviewsScheduled}</div>
                <p className="text-xs text-muted-foreground">Total interviews created</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Offers & Joins</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.offers} <span className="text-sm font-normal text-muted-foreground">/ {stats.joined}</span></div>
                <p className="text-xs text-muted-foreground">Offers Extended / Joined</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Performance</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.successRate}%
                </div>
                <p className="text-xs text-muted-foreground">Join to Submission ratio</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Activity Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="week" className="text-sm" />
                    <YAxis className="text-sm" allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="submitted" name="Submissions" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="interviews" name="Interviews" stroke="#a855f7" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Pipeline Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Breakdown (Last 4 Weeks)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" className="text-sm" />
                  <YAxis className="text-sm" allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="submitted" name="Submissions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="interviews" name="Interviews" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="offers" name="Offers" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Download, TrendingUp, Calendar, Loader2 } from 'lucide-react';
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function AdminReports() {
  const { toast } = useToast();
  const [candidates, setCandidates] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("month");

  const getAuthHeader = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resCand, resRec] = await Promise.all([
          fetch(`${API_URL}/candidates`, { headers: getAuthHeader() }),
          fetch(`${API_URL}/recruiters`, { headers: getAuthHeader() })
        ]);
        if (resCand.ok && resRec.ok) {
          setCandidates(await resCand.json());
          setRecruiters(await resRec.json());
        } else {
          throw new Error("Failed to fetch reports data");
        }
      } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Failed to load reports", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredCandidates = useMemo(() => {
    const today = new Date();
    return candidates.filter(c => {
      const date = new Date(c.dateAdded || c.createdAt);
      if (isNaN(date.getTime())) return filter === 'all';
      const diff = (today.getTime() - date.getTime()) / (1000 * 3600 * 24);
      if (filter === "day") return diff < 1;
      if (filter === "week") return diff < 7;
      if (filter === "month") return diff < 30;
      return true;
    });
  }, [candidates, filter]);

  const recruiterPerformance = useMemo(() => {
    return recruiters.map(r => {
      const userCandidates = filteredCandidates.filter(c => {
        const rId = typeof c.recruiterId === 'object' ? c.recruiterId._id : c.recruiterId;
        return rId === r._id;
      });
      return {
        name: r.name.split(' ')[0],
        Submissions: userCandidates.length,
        Interviews: userCandidates.filter(c => {
          const s = Array.isArray(c.status) ? c.status.join(' ') : (c.status || '');
          return s.includes('Interview');
        }).length,
        Offers: userCandidates.filter(c => Array.isArray(c.status) ? c.status.includes("Offer") : c.status === "Offer").length,
        Joined: userCandidates.filter(c => Array.isArray(c.status) ? c.status.includes("Joined") : c.status === "Joined").length
      };
    }).sort((a, b) => b.Submissions - a.Submissions);
  }, [recruiters, filteredCandidates]);

  const monthlyData = useMemo(() => {
    const months = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = d.toLocaleString('default', { month: 'short' });
      const monthlyCandidates = candidates.filter(c => {
        const cDate = new Date(c.dateAdded || c.createdAt);
        if (isNaN(cDate.getTime())) return false;
        return cDate.getMonth() === d.getMonth() && cDate.getFullYear() === d.getFullYear();
      });
      months.push({
        month: monthName,
        candidates: monthlyCandidates.length,
        joined: monthlyCandidates.filter(c => Array.isArray(c.status) ? c.status.includes('Joined') : c.status === 'Joined').length
      });
    }
    return months;
  }, [candidates]);

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(recruiterPerformance);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Recruiter Report");
    XLSX.writeFile(workbook, `Recruiter_Report_${filter}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`Recruiter Performance Report (${filter})`, 14, 16);
    autoTable(doc, {
      startY: 20,
      head: [["Recruiter", "Submissions", "Interviews", "Offers", "Joined"]],
      body: recruiterPerformance.map(r => [r.name, r.Submissions, r.Interviews, r.Offers, r.Joined]),
    });
    doc.save(`Recruiter_Report_${filter}.pdf`);
  };

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: 'hsl(var(--background))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px'
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1">Comprehensive performance insights</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Filter Toggle */}
            <div className="bg-muted p-1 rounded-lg flex">
              {['day', 'week', 'month'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition ${filter === f ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={exportToExcel}
              className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition"
            >
              <Download className="h-4 w-4" /> Excel
            </button>
            <button
              onClick={exportToPDF}
              className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition"
            >
              <Download className="h-4 w-4" /> PDF
            </button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="recruiters">Recruiters</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Candidates */}
              <div className="rounded-xl border border-border bg-card shadow-sm p-6">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-sm font-medium text-muted-foreground">Total Candidates</span>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{filteredCandidates.length}</div>
                <p className="text-xs text-muted-foreground">Filtered by {filter}</p>
              </div>

              {/* Active Recruiters */}
              <div className="rounded-xl border border-border bg-card shadow-sm p-6">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-sm font-medium text-muted-foreground">Active Recruiters</span>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">{recruiters.length}</div>
                <p className="text-xs text-muted-foreground">Total registered</p>
              </div>

              {/* Conversion Rate */}
              <div className="rounded-xl border border-border bg-card shadow-sm p-6">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-sm font-medium text-muted-foreground">Conversion Rate</span>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold">
                  {(
                    (filteredCandidates.filter(c => Array.isArray(c.status) ? c.status.includes("Joined") : c.status === "Joined").length /
                      (filteredCandidates.filter(c => Array.isArray(c.status) ? c.status.includes("Offer") : c.status === "Offer").length || 1)) * 100
                  ).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">Offer → Join</p>
              </div>
            </div>
          </TabsContent>

          {/* Recruiter Performance Tab */}
          <TabsContent value="recruiters">
            <div className="rounded-xl border border-border bg-card shadow-sm p-6">
              <h3 className="font-semibold text-foreground mb-4">Recruiter Performance Comparison ({filter})</h3>
              <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recruiterPerformance}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-sm" />
                    <YAxis className="text-sm" />
                    <Tooltip {...tooltipStyle} />
                    <Legend />
                    <Bar dataKey="Submissions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Interviews" fill="#a855f7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Offers" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Joined" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          {/* Trend Analysis Tab */}
          <TabsContent value="trends">
            <div className="rounded-xl border border-border bg-card shadow-sm p-6">
              <h3 className="font-semibold text-foreground mb-4">6-Month Trend Analysis</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-sm" />
                    <YAxis className="text-sm" />
                    <Tooltip {...tooltipStyle} />
                    <Legend />
                    <Line type="monotone" dataKey="candidates" name="Submissions" stroke="#3b82f6" strokeWidth={3} />
                    <Line type="monotone" dataKey="joined" name="Joins" stroke="#22c55e" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

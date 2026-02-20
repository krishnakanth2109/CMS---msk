import { useEffect, useState, useMemo } from 'react';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

  // --- Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resCand, resRec] = await Promise.all([
          fetch(`${API_URL}/candidates`, { headers: getAuthHeader() }),
          fetch(`${API_URL}/recruiters`, { headers: getAuthHeader() })
        ]);

        if (resCand.ok && resRec.ok) {
          const cData = await resCand.json();
          const rData = await resRec.json();
          setCandidates(cData);
          setRecruiters(rData);
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

  // --- Filter Logic ---
  const filteredCandidates = useMemo(() => {
    const today = new Date();
    return candidates.filter(c => {
      const date = new Date(c.dateAdded); // Ensure backend sends dateAdded or createdAt
      const diff = (today.getTime() - date.getTime()) / (1000 * 3600 * 24);

      if (filter === "day") return diff < 1;
      if (filter === "week") return diff < 7;
      if (filter === "month") return diff < 30;
      return true;
    });
  }, [candidates, filter]);

  // --- Performance Data ---
  const recruiterPerformance = useMemo(() => {
    return recruiters.map(r => {
      const userCandidates = filteredCandidates.filter(c => {
        // Handle if recruiterId is object (populated) or string
        const rId = typeof c.recruiterId === 'object' ? c.recruiterId._id : c.recruiterId;
        return rId === r._id;
      });

      return {
        name: r.name.split(' ')[0],
        Submissions: userCandidates.length,
        Interviews: userCandidates.filter(c => c.status.includes('Interview')).length,
        Offers: userCandidates.filter(c => c.status === "Offer").length,
        Joined: userCandidates.filter(c => c.status === "Joined").length
      };
    }).sort((a, b) => b.Submissions - a.Submissions); // Sort by top performers
  }, [recruiters, filteredCandidates]);

  // --- Trend Data (Last 6 Months from actual data) ---
  const monthlyData = useMemo(() => {
    const months = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = d.toLocaleString('default', { month: 'short' });
      
      // Filter candidates for this specific month
      const monthlyCandidates = candidates.filter(c => {
        const cDate = new Date(c.dateAdded);
        return cDate.getMonth() === d.getMonth() && cDate.getFullYear() === d.getFullYear();
      });

      months.push({
        month: monthName,
        candidates: monthlyCandidates.length,
        joined: monthlyCandidates.filter(c => c.status === 'Joined').length
      });
    }
    return months;
  }, [candidates]);

  // --- Exports ---
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
      body: recruiterPerformance.map(r => [
        r.name, r.Submissions, r.Interviews, r.Offers, r.Joined
      ]),
    });
    doc.save(`Recruiter_Report_${filter}.pdf`);
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>;

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
              <p className="text-muted-foreground mt-1">Comprehensive performance insights</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="bg-muted p-1 rounded-lg flex">
                <Button variant={filter === 'day' ? 'default' : 'ghost'} size="sm" onClick={() => setFilter("day")}>Day</Button>
                <Button variant={filter === 'week' ? 'default' : 'ghost'} size="sm" onClick={() => setFilter("week")}>Week</Button>
                <Button variant={filter === 'month' ? 'default' : 'ghost'} size="sm" onClick={() => setFilter("month")}>Month</Button>
              </div>
              <Button variant="outline" onClick={exportToExcel} className="gap-2"><Download className="h-4 w-4" />Excel</Button>
              <Button variant="outline" onClick={exportToPDF} className="gap-2"><Download className="h-4 w-4" />PDF</Button>
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
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{filteredCandidates.length}</div>
                    <p className="text-xs text-muted-foreground">Filtered by {filter}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Active Recruiters</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{recruiters.length}</div>
                    <p className="text-xs text-muted-foreground">Total registered</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(
                        (filteredCandidates.filter(c => c.status === "Joined").length /
                        (filteredCandidates.filter(c => c.status === "Offer").length || 1)) * 100
                      ).toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground">Offer → Join</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Recruiter Performance Tab */}
            <TabsContent value="recruiters">
              <Card>
                <CardHeader>
                  <CardTitle>Recruiter Performance Comparison ({filter})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[500px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={recruiterPerformance}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-sm" />
                        <YAxis className="text-sm" />
                        <Tooltip contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} />
                        <Legend />
                        <Bar dataKey="Submissions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Interviews" fill="#a855f7" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Offers" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Joined" fill="#f97316" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trend Analysis Tab */}
            <TabsContent value="trends">
              <Card>
                <CardHeader>
                  <CardTitle>6-Month Trend Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-sm" />
                        <YAxis className="text-sm" />
                        <Tooltip contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} />
                        <Legend />
                        <Line type="monotone" dataKey="candidates" name="Submissions" stroke="#3b82f6" strokeWidth={3} />
                        <Line type="monotone" dataKey="joined" name="Joins" stroke="#22c55e" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
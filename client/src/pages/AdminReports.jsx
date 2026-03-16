import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Download, TrendingUp, Calendar, Loader2, Users, ClipboardList, X } from 'lucide-react';
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

// Normalize API_URL
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
const API_URL  = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

export default function AdminReports() {
  const { toast } = useToast();
  const { authHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("month");
  
  // Specific Date Filter State for the main view
  const [selectedDate, setSelectedDate] = useState("");
  
  // ✅ NEW STATES: For Today's Candidates Card & Modal
  const [todayCandidatesCount, setTodayCandidatesCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalDate, setModalDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Export states
  const [exportMonth, setExportMonth] = useState('current');
  const [isExporting, setIsExporting] = useState(false);
  
  const [reportData, setReportData] = useState({
    overview: { totalCandidates: 0, activeRecruiters: 0, conversionRate: '0%' },
    recruiterPerformance: [],
    monthlyData: []
  });

  const getAuthHeader = async () => {
    const ah = await authHeaders();
    return { 'Content-Type': 'application/json', ...ah };
  };

  // 1. Fetch Main Report Data & Today's Initial Count
  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const headers = await getAuthHeader();
        
        // Build dynamic query string supporting the specific date
        const queryParams = new URLSearchParams({ filter });
        if (selectedDate && filter === 'custom') {
          queryParams.append('date', selectedDate);
        }

        // Fetch Main Report Data
        const res = await fetch(`${API_URL}/reports?${queryParams.toString()}`, { headers });
        
        // Fetch Today's Candidates count for the 4th card
        const todayDateStr = new Date().toISOString().split('T')[0];
        const todayRes = await fetch(`${API_URL}/candidates?date=${todayDateStr}`, { headers });
        
        if (res.ok && todayRes.ok) {
          const data = await res.json();
          const todayData = await todayRes.json();
          
          setReportData(data);
          setTodayCandidatesCount(todayData.length);
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
    
    fetchReports();
  }, [filter, selectedDate, toast]);

  // 2. Fetch Detailed Data when the Modal opens or the Modal Date changes
  useEffect(() => {
    if (isModalOpen) {
      const fetchDateSubmissions = async () => {
        setModalLoading(true);
        try {
          const headers = await getAuthHeader();
          const res = await fetch(`${API_URL}/candidates?date=${modalDate}`, { headers });
          if (res.ok) {
            const data = await res.json();
            setModalData(data);
          } else {
            throw new Error('Failed to fetch day submissions');
          }
        } catch (error) {
          toast({ title: 'Error', description: 'Failed to fetch day submissions', variant: 'destructive' });
        } finally {
          setModalLoading(false);
        }
      };
      fetchDateSubmissions();
    }
  }, [isModalOpen, modalDate, toast]);

  // Handle Export accurately based on the selected month
  const handleExport = async (format) => {
    setIsExporting(true);
    try {
      let dataToExport = reportData.recruiterPerformance;
      let titleSuffix = filter;

      if (exportMonth !== 'current') {
        const headers = await getAuthHeader();
        const res = await fetch(`${API_URL}/candidates`, { headers });
        
        if (!res.ok) throw new Error("Failed to fetch candidates for accurate export");
        
        const allCandidates = await res.json();
        const targetMonth = parseInt(exportMonth);
        const now = new Date();
        let targetYear = now.getFullYear();
        
        if (targetMonth > now.getMonth()) {
          targetYear -= 1;
        }
        
        const filteredCandidates = allCandidates.filter(c => {
          if (!c.createdAt) return false;
          const d = new Date(c.createdAt);
          return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
        });

        const INTERVIEW_STAGES = [
          'L1 Interview', 'L2 Interview', 'L3 Interview', 'Final Interview',
          'Technical Interview', 'Technical Round', 'HR Interview', 'HR Round', 'Interview'
        ];
        
        const rMap = new Map();
        for (const c of filteredCandidates) {
          const key = c.recruiterId?._id || c.recruiterId || 'unassigned';
          let name = 'Unassigned';
          
          if (c.recruiterId && typeof c.recruiterId === 'object') {
            name = `${c.recruiterId.firstName || ''} ${c.recruiterId.lastName || ''}`.trim();
            if (!name) name = c.recruiterId.name || c.recruiterId.username || c.recruiterId.email;
          } else if (c.recruiterName) {
            name = c.recruiterName;
          }
          
          if (!rMap.has(key)) {
            rMap.set(key, { name: name || 'Unknown', Submissions: 0, Turnups: 0, Selected: 0, Joined: 0 });
          }
          
          const row = rMap.get(key);
          row.Submissions += 1;
          
          const currentStatus = c.status || '';
          const hasJoined = currentStatus === 'Joined';
          const hasSelected = hasJoined || currentStatus === 'Offer' || currentStatus === 'Shortlisted';
          const hasTurnedUp = hasSelected || INTERVIEW_STAGES.some(stage => currentStatus.includes(stage));

          if (hasTurnedUp) row.Turnups += 1;
          if (hasSelected) row.Selected += 1;
          if (hasJoined) row.Joined += 1;
        }
        
        dataToExport = Array.from(rMap.values()).sort((a, b) => b.Submissions - a.Submissions);
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        titleSuffix = `${monthNames[targetMonth]}_${targetYear}`;
      }

      if (!dataToExport.length) {
        toast({ title: "No Data", description: `No records found for ${titleSuffix.replace('_', ' ')}.`, variant: "default" });
        setIsExporting(false);
        return;
      }

      if (format === 'excel') {
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Recruiter Report");
        XLSX.writeFile(workbook, `Recruiter_Report_${titleSuffix}.xlsx`);
      } 
      else if (format === 'pdf') {
        const doc = new jsPDF();
        doc.text(`Recruiter Performance Report (${titleSuffix.replace('_', ' ')})`, 14, 16);
        autoTable(doc, {
          startY: 20,
          head: [["Recruiter", "Submissions", "Turnups", "Selected", "Joined"]],
          body: dataToExport.map(r => [r.name, r.Submissions, r.Turnups, r.Selected, r.Joined]),
        });
        doc.save(`Recruiter_Report_${titleSuffix}.pdf`);
      }
      
      toast({ title: "Success", description: `${format.toUpperCase()} export completed successfully.` });
    } catch (error) {
      console.error(error);
      toast({ title: "Export Failed", description: "Could not generate export data.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '0px', 
      color: '#0f172a'
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50 min-h-screen relative">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Reports & Analytics</h1>
            <p className="text-slate-500 mt-1">Comprehensive performance insights</p>
          </div>
          
          <div className="flex flex-col items-end gap-3">
            {/* Filter Toggle AND Specific Date Picker side-by-side */}
            <div className="flex items-center gap-2 self-start md:self-end">
              <div className="bg-slate-200 p-1 flex border border-slate-300">
                {['day', 'week', 'month', 'all'].map(f => (
                  <button
                    key={f}
                    onClick={() => {
                      setFilter(f);
                      setSelectedDate(""); 
                    }}
                    className={`px-3 py-1.5 text-sm font-medium capitalize transition ${
                      filter === f 
                        ? 'bg-white shadow text-slate-900' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              {/* Specific Date Picker Input */}
              <div className="relative">
                <Calendar className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${selectedDate && filter === 'custom' ? 'text-blue-500' : 'text-slate-500'}`} />
                <input 
                  type="date"
                  value={selectedDate}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    if (e.target.value) setFilter('custom');
                  }}
                  className={`pl-8 pr-3 py-1.5 h-[34px] text-sm font-medium border focus:outline-none transition-all ${
                    selectedDate && filter === 'custom'
                      ? 'bg-white border-blue-500 text-slate-900 shadow-sm'
                      : 'bg-slate-200 border-slate-300 text-slate-600 hover:bg-slate-300 hover:text-slate-900'
                  }`}
                />
              </div>
            </div>

            {/* Export Section */}
            <div className="flex flex-wrap items-center gap-2">
              <select 
                value={exportMonth} 
                onChange={(e) => setExportMonth(e.target.value)}
                className="px-3 py-2 border border-slate-300 bg-white text-sm font-medium text-slate-700 outline-none hover:bg-slate-50 transition"
              >
                <option value="current">Current View</option>
                <option value="0">January</option>
                <option value="1">February</option>
                <option value="2">March</option>
                <option value="3">April</option>
                <option value="4">May</option>
                <option value="5">June</option>
                <option value="6">July</option>
                <option value="7">August</option>
                <option value="8">September</option>
                <option value="9">October</option>
                <option value="10">November</option>
                <option value="11">December</option>
              </select>

              <button
                onClick={() => handleExport('excel')}
                disabled={isExporting}
                className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 bg-white text-sm font-medium hover:bg-slate-50 text-slate-700 transition disabled:opacity-50"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Excel
              </button>
              
              <button
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
                className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 bg-white text-sm font-medium hover:bg-slate-50 text-slate-700 transition disabled:opacity-50"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
              </button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3 bg-slate-200 border border-slate-300 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Overview</TabsTrigger>
            <TabsTrigger value="recruiters" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Recruiters</TabsTrigger>
            <TabsTrigger value="trends" className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">Trends</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="border border-slate-200 bg-white shadow-sm p-6">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-sm font-medium text-slate-500">Total Candidates</span>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{reportData.overview.totalCandidates}</div>
                <p className="text-xs text-slate-400 mt-1">Filtered by {filter === 'custom' && selectedDate ? selectedDate : filter}</p>
              </div>

              <div className="border border-slate-200 bg-white shadow-sm p-6">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-sm font-medium text-slate-500">Active Recruiters</span>
                  <Users className="h-4 w-4 text-purple-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{reportData.overview.activeRecruiters}</div>
                <p className="text-xs text-slate-400 mt-1">Total registered</p>
              </div>

              <div className="border border-slate-200 bg-white shadow-sm p-6">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-sm font-medium text-slate-500">Conversion Rate</span>
                  <Calendar className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{reportData.overview.conversionRate}</div>
                <p className="text-xs text-slate-400 mt-1">Selected → Joined</p>
              </div>

              {/* ✅ NEW: 4th Card filling the empty space, Clickable to open Modal */}
              <div 
                onClick={() => setIsModalOpen(true)}
                className="border border-slate-200 bg-white shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow group"
              >
                <div className="flex items-center justify-between pb-2">
                  <span className="text-sm font-medium text-slate-500 group-hover:text-[#283086] transition-colors">Today's Submissions</span>
                  <ClipboardList className="h-4 w-4 text-orange-500" />
                </div>
                <div className="text-2xl font-bold text-slate-900">{todayCandidatesCount}</div>
                <p className="text-xs text-slate-400 mt-1">Added today (Click to view)</p>
              </div>

            </div>
          </TabsContent>

          {/* Recruiter Performance Tab */}
          <TabsContent value="recruiters">
            <div className="border border-slate-200 bg-white shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-6">
                Recruiter Performance Comparison ({filter === 'custom' && selectedDate ? selectedDate : filter})
              </h3>
              <div className="h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.recruiterPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" className="text-sm font-medium text-slate-600" tick={{fill: '#64748b'}} />
                    <YAxis className="text-sm font-medium text-slate-600" tick={{fill: '#64748b'}} />
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="Submissions" fill="#3b82f6" radius={0} />
                    <Bar dataKey="Turnups" fill="#a855f7" radius={0} />
                    <Bar dataKey="Selected" fill="#22c55e" radius={0} />
                    <Bar dataKey="Joined" fill="#f97316" radius={0} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          {/* Trend Analysis Tab */}
          <TabsContent value="trends">
            <div className="border border-slate-200 bg-white shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-6">6-Month Trend Analysis</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reportData.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" className="text-sm font-medium text-slate-600" tick={{fill: '#64748b'}} />
                    <YAxis className="text-sm font-medium text-slate-600" tick={{fill: '#64748b'}} />
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Line type="monotone" dataKey="candidates" name="Submissions" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="joined" name="Joined" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── MODAL: DAY SUBMISSIONS ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-[#f8faff]">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-purple-600" />
                  Day Submissions
                </h2>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Viewing candidates submitted by all recruiters
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* Calendar Filter INSIDE modal */}
                <div className="relative flex items-center bg-white">
                  <Calendar className="absolute left-3 w-4 h-4 text-gray-400" />
                  <input 
                    type="date" 
                    value={modalDate}
                    max={new Date().toISOString().split('T')[0]} 
                    onChange={(e) => setModalDate(e.target.value)}
                    className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-[#283086] focus:outline-none"
                  />
                </div>
                {/* Close Button */}
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 bg-gray-100 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto bg-white p-0 min-h-[300px]">
              {modalLoading ? (
                <div className="flex flex-col h-full min-h-[300px] items-center justify-center gap-3">
                  <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full" />
                  <p className="text-sm text-gray-500 font-medium tracking-wide">Fetching Submissions...</p>
                </div>
              ) : modalData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                  <div className="bg-gray-50 p-4 rounded-full mb-3">
                    <ClipboardList className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-slate-800 font-bold">No submissions found</h3>
                  <p className="text-sm text-gray-500 mt-1">No candidates were added on {modalDate}</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-[#f8faff] text-gray-500 font-bold uppercase text-[10px] tracking-widest border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-6 py-4 text-left">Candidate ID</th>
                      <th className="px-6 py-4 text-left">Candidate Name</th>
                      <th className="px-6 py-4 text-left">Recruiter</th>
                      <th className="px-6 py-4 text-left">Position</th>
                      <th className="px-6 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {modalData.map((c) => {
                      const recruiterName = c.recruiterId?.firstName 
                        ? `${c.recruiterId.firstName} ${c.recruiterId.lastName || ''}`.trim() 
                        : (c.recruiterId?.name || c.recruiterName || 'Unknown');
                      
                      const cStatus = Array.isArray(c.status) ? c.status[0] : c.status;

                      return (
                        <tr key={c._id} className="hover:bg-purple-50/30 transition-colors">
                          <td className="px-6 py-4 font-bold text-[#283086]">{c.candidateId || 'N/A'}</td>
                          <td className="px-6 py-4 font-semibold text-slate-800">{c.name || `${c.firstName} ${c.lastName}`}</td>
                          <td className="px-6 py-4 font-medium text-gray-600">{recruiterName}</td>
                          <td className="px-6 py-4 text-gray-500">{c.position || '-'}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              {cStatus || 'SUBMITTED'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            {!modalLoading && modalData.length > 0 && (
              <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center text-xs font-medium text-gray-500">
                <p>Showing {modalData.length} submission(s) for the selected date.</p>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-700 hover:text-[#283086] font-bold uppercase tracking-wider"
                >
                  Close Window
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
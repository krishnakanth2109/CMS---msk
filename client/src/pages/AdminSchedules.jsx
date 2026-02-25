import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { 
  Bell, Calendar, Clock, User, Trash2, Loader2, Plus, 
  Briefcase, AlertCircle 
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const API_URL  = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

// Helper to get Firebase Token for Auth Headers
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

export default function AdminSchedules() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Data State
  const [candidates, setCandidates] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [interviewDate, setInterviewDate] = useState(new Date());
  
  // Adjusted to match backend enum default values
  const [roundType, setRoundType] = useState("L1 Interview");
  const [interviewMode, setInterviewMode] = useState("Virtual");

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [resCandidates, resInterviews] = await Promise.all([
        fetch(`${API_URL}/candidates`, { headers: buildHeaders() }),
        fetch(`${API_URL}/interviews`, { headers: buildHeaders() })
      ]);

      if (resCandidates.ok) {
        const data = await resCandidates.json();
        // Only show active candidates who haven't joined/rejected yet
        setCandidates(data.filter(c => !['Joined', 'Rejected'].includes(c.status?.at(-1) || c.status)));
      }

      if (resInterviews.ok) {
        const data = await resInterviews.json();
        setSchedules(data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Error", description: "Failed to load data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  // Handle Schedule Creation
  const handleSchedule = async () => {
    if (!selectedCandidateId || !interviewDate) {
      toast({ title: "Validation Error", description: "Please select a candidate and time.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // Format Date to YYYY-MM-DD
      const dateStr = interviewDate.toISOString().split('T')[0];
      // Format Time to HH:MM (24-hour)
      const timeStr = interviewDate.toTimeString().split(' ')[0].substring(0, 5);

      const payload = {
        candidateId: selectedCandidateId,
        interviewDate: dateStr,
        interviewTime: timeStr,
        type: interviewMode,
        round: roundType,
        duration: 60
      };

      const response = await fetch(`${API_URL}/interviews`, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to schedule");
      }

      toast({ title: "Success", description: "Interview Scheduled Successfully!" });
      fetchData(); // Refresh the list
      
      // Reset form
      setSelectedCandidateId("");
      setInterviewDate(new Date());
      setRoundType("L1 Interview");
      setInterviewMode("Virtual");
    } catch (error) {
      toast({ title: "Error", description: error.message || "Could not schedule interview.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Schedule
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this scheduled interview?")) return;
    try {
      const response = await fetch(`${API_URL}/interviews/${id}`, { 
        method: 'DELETE', 
        headers: buildHeaders() 
      });
      
      if (!response.ok) throw new Error("Failed to delete");

      setSchedules(prev => prev.filter(s => s._id !== id));
      toast({ title: "Deleted", description: "Schedule removed successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete schedule", variant: "destructive" });
    }
  };

  // Sort upcoming schedules first
  const visibleSchedules = [...schedules].sort((a, b) => new Date(a.interviewDate).getTime() - new Date(b.interviewDate).getTime());

  return (
    <main className="flex-1 p-4 lg:p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Admin Interview Calendar</h1>
            <p className="text-slate-500 mt-1">Manage and track all organizational interview schedules.</p>
          </div>
          <div className="flex gap-2">
             <span className="px-3 py-1 text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-full shadow-sm text-slate-700 dark:text-slate-300">
                Total Scheduled: {schedules.length}
             </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Left Column: Scheduling Form */}
          <div className="lg:col-span-4 space-y-6">
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-6 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-5">
                <h3 className="flex items-center gap-2 text-xl font-semibold">
                  <Plus className="w-5 h-5" /> Schedule New
                </h3>
              </div>
              <div className="p-6 space-y-5">
                
                {/* Candidate Select */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Candidate</label>
                  <div className="relative">
                     <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                     <select 
                       value={selectedCandidateId}
                       onChange={(e) => setSelectedCandidateId(e.target.value)}
                       className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                     >
                       <option value="">Select Candidate...</option>
                       {candidates.map(c => (
                         <option key={c._id} value={c._id}>
                           {c.name || `${c.firstName || ''} ${c.lastName || ''}`} - {c.position || 'N/A'}
                         </option>
                       ))}
                     </select>
                  </div>
                </div>

                {/* Date Picker */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Date & Time</label>
                  <div className="relative flex items-center">
                     <Clock className="absolute left-3 w-4 h-4 text-slate-400 z-10" />
                     <DatePicker
                        selected={interviewDate}
                        onChange={(date) => setInterviewDate(date)}
                        showTimeSelect
                        timeIntervals={30}
                        dateFormat="MMM d, yyyy h:mm aa"
                        minDate={new Date()}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none block dark:text-white"
                        wrapperClassName="w-full"
                     />
                  </div>
                </div>

                {/* Round & Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Round</label>
                     <select 
                        value={roundType} onChange={(e) => setRoundType(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none dark:text-white"
                     >
                       <option value="L1 Interview">L1 Interview</option>
                       <option value="L2 Interview">L2 Interview</option>
                       <option value="L3 Interview">L3 Interview</option>
                       <option value="L4 Interview">L4 Interview</option>
                       <option value="L5 Interview">L5 Interview</option>
                       <option value="Technical Round">Technical Round</option>
                       <option value="HR Round">HR Round</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Mode</label>
                     <select 
                        value={interviewMode} onChange={(e) => setInterviewMode(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none dark:text-white"
                     >
                       <option value="Virtual">Virtual</option>
                       <option value="In-person">In-person</option>
                       <option value="Phone">Phone</option>
                     </select>
                  </div>
                </div>

                <button 
                  onClick={handleSchedule} 
                  disabled={submitting}
                  className="w-full flex justify-center items-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium py-3 rounded-xl shadow-md transition-all mt-4"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Schedule"}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: List of Interviews */}
          <div className="lg:col-span-8 space-y-6">
             <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 min-h-[500px]">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800 dark:text-white">
                  <Calendar className="w-5 h-5 text-indigo-500" /> Upcoming Interviews
                </h2>

                {loading ? (
                  <div className="text-center py-12 flex flex-col items-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2"/>
                    <span className="text-slate-500">Loading schedules...</span>
                  </div>
                ) : visibleSchedules.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                     <Briefcase className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                     <h3 className="text-slate-900 dark:text-white font-medium">No interviews scheduled</h3>
                     <p className="text-slate-500 text-sm mt-1">There are no upcoming interviews right now.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                       {visibleSchedules.map((schedule) => (
                         <div 
                           key={schedule._id}
                           className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-xl hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-300"
                         >
                            <div className="absolute left-0 top-4 bottom-4 w-1 bg-indigo-500 rounded-r-full" />
                            
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 ml-3">
                               {/* Time Badge */}
                               <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-lg p-3 w-24 text-center shrink-0">
                                  <span className="text-xs font-semibold text-slate-500 uppercase">{new Date(schedule.interviewDate).toLocaleString('en-US', { month: 'short' })}</span>
                                  <span className="text-2xl font-bold text-slate-800 dark:text-white leading-none my-1">{new Date(schedule.interviewDate).getDate()}</span>
                                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                                    {new Date(schedule.interviewDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                               </div>

                               {/* Details */}
                               <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1.5">
                                     <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                                       {schedule.candidateId?.name || "Unknown Candidate"}
                                     </h3>
                                     <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                                        {schedule.type}
                                     </span>
                                  </div>
                                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-slate-400">
                                     <div className="flex items-center gap-1.5">
                                        <Briefcase className="w-4 h-4 text-slate-400" />
                                        <span className="truncate">{schedule.candidateId?.position || "Role N/A"}</span>
                                     </div>
                                     <div className="flex items-center gap-1.5">
                                        <User className="w-4 h-4 text-slate-400" />
                                        <span className="truncate">By: {schedule.recruiterId?.name || schedule.recruiterId?.firstName || "Admin"}</span>
                                     </div>
                                     <div className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-500">
                                        <AlertCircle className="w-4 h-4" />
                                        <span>{schedule.round}</span>
                                     </div>
                                  </div>
                               </div>

                               {/* Actions */}
                               <div className="flex items-center gap-2 mt-4 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700">
                                  <button 
                                     onClick={() => handleDelete(schedule._id)}
                                     className="flex items-center justify-center h-10 w-10 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                     title="Delete Schedule"
                                  >
                                     <Trash2 className="w-5 h-5" />
                                  </button>
                               </div>
                            </div>
                         </div>
                       ))}
                  </div>
                )}
             </div>
          </div>

        </div>
      </div>
    </main>
  );
}
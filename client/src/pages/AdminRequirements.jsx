import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon, EyeIcon, PencilIcon, PlusIcon, CheckCircleIcon, NoSymbolIcon,
  BriefcaseIcon, AcademicCapIcon
} from "@heroicons/react/24/outline";

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const API_URL  = `${BASE_URL}/api`;

const inputCls = "w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-500 bg-white dark:bg-zinc-900 dark:text-zinc-100 transition-shadow placeholder-zinc-400";

/* ---------------- JOB DETAIL MODAL ---------------- */
const JobDetailCard = ({ job, onClose }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-zinc-200 dark:border-zinc-800"
          onClick={e => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-zinc-800 to-zinc-950 text-white p-6 rounded-t-2xl border-b border-zinc-700">
             <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">{job.position}</h2>
                  <div className="flex items-center gap-3 mt-2 text-zinc-300 text-sm">
                    <span className="bg-zinc-800 px-2 py-1 rounded-md border border-zinc-700 text-xs font-mono">
                      {job.jobCode}
                    </span>
                    <span>• {job.clientName}</span>
                  </div>
                </div>
                <button onClick={onClose} className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400 hover:text-white">
                  <XMarkIcon className="w-6 h-6" />
                </button>
             </div>
          </div>

          <div className="p-6 space-y-6 text-zinc-800 dark:text-zinc-300">
             <div className="grid md:grid-cols-2 gap-8">
                {/* Requirements Card */}
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-5 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-700 pb-2">
                    <AcademicCapIcon className="w-5 h-5 text-zinc-500" /> Candidate Profile
                  </h3>
                  <div className="space-y-3 text-sm">
                    <p className="flex justify-between"><span className="text-zinc-500">Skills:</span> <span className="font-medium text-right ml-4">{job.skills || "-"}</span></p>
                    <p className="flex justify-between"><span className="text-zinc-500">Total Exp:</span> <span className="font-medium">{job.experience || "-"}</span></p>
                    <p className="flex justify-between"><span className="text-zinc-500">Relevant Exp:</span> <span className="font-medium">{job.relevantExperience || "-"}</span></p>
                    <p className="flex justify-between"><span className="text-zinc-500">Qualification:</span> <span className="font-medium">{job.qualification || "-"}</span></p>
                    <p className="flex justify-between"><span className="text-zinc-500">Gender:</span> <span className="font-medium">{job.gender || "Any"}</span></p>
                  </div>
                </div>

                {/* Logistics Card */}
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-5 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-700 pb-2">
                    <BriefcaseIcon className="w-5 h-5 text-zinc-500" /> Job Details
                  </h3>
                  <div className="space-y-3 text-sm">
                    <p className="flex justify-between"><span className="text-zinc-500">Location:</span> <span className="font-medium">{job.location || "-"}</span></p>
                    <p className="flex justify-between"><span className="text-zinc-500">Max Salary Range:</span> <span className="font-medium">{job.salaryBudget || "-"}</span></p>
                    <p className="flex justify-between"><span className="text-zinc-500">Notice Period:</span> <span className="font-medium">{job.noticePeriod || "-"}</span></p>
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 mt-2">
                      <p className="flex justify-between mt-2"><span className="text-zinc-500">Primary Recruiter:</span> <span className="font-medium">{job.primaryRecruiter || 'Unassigned'}</span></p>
                      <p className="flex justify-between mt-1"><span className="text-zinc-500">Secondary Recruiter:</span> <span className="font-medium">{job.secondaryRecruiter || 'Unassigned'}</span></p>
                    </div>
                  </div>
                </div>
             </div>

             {job.jdLink && (
               <div className="bg-zinc-100 dark:bg-zinc-800 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700">
                 <h4 className="font-semibold mb-2 text-zinc-900 dark:text-zinc-100 text-sm">Job Description Link</h4>
                 <a href={job.jdLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-all text-sm">
                   {job.jdLink}
                 </a>
               </div>
             )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/* ---------------- MAIN COMPONENT ---------------- */
export default function AdminRequirements() {
  const { toast } = useToast();
  const { authHeaders } = useAuth();

  const getAuthHeader = async () => ({
    'Content-Type': 'application/json',
    ...(await authHeaders()),
  });

  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Exact 14 fields requested
  const initialFormState = {
    jobCode: "", clientName: "", position: "", location: "",
    experience: "", relevantExperience: "", qualification: "",
    salaryBudget: "", gender: "Any", noticePeriod: "",
    primaryRecruiter: "", secondaryRecruiter: "", skills: "", jdLink: "",
    active: true,
  };

  const [form, setForm] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [selectedJob, setSelectedJob] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeader();
      const [jobsRes, clientsRes, recRes] = await Promise.all([
        fetch(`${API_URL}/jobs`,       { headers }),
        fetch(`${API_URL}/clients`,    { headers }),
        fetch(`${API_URL}/recruiters`, { headers })
      ]);

      if(jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(data.map((j) => ({ ...j, id: j._id })));
      }
      if(clientsRes.ok) {
        const data = await clientsRes.json();
        setClients(data.map((c) => ({ id: c._id, companyName: c.companyName })));
      }
      if(recRes.ok) {
        const data = await recRes.json();
        setRecruiters(data.map((r) => ({ id: r._id, name: r.name, email: r.email })));
      }
    } catch (error) {
      toast({ title: "Error loading data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const validateForm = () => {
    const newErrors = {};
    if (!form.jobCode?.trim()) newErrors.jobCode = "Job Code is required";
    if (!form.clientName) newErrors.clientName = "Please select a client";
    if (!form.position?.trim()) newErrors.position = "Role is required";
    if (!form.location?.trim()) newErrors.location = "Location is required";
    if (!form.experience?.trim()) newErrors.experience = "Experience required";
    if (!form.salaryBudget?.trim()) newErrors.salaryBudget = "Salary Range required";
    if (!form.skills?.trim()) newErrors.skills = "Skills required";
    
    if (form.jdLink && !/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(form.jdLink)) {
        newErrors.jdLink = "Invalid URL format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    if (errors[name]) {
        setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({ title: "Validation Error", description: "Required fields missing or invalid", variant: "destructive" });
      return;
    }

    try {
      const url = editingJob ? `${API_URL}/jobs/${editingJob.id}` : `${API_URL}/jobs`;
      const response = await fetch(url, {
        method: editingJob ? 'PUT' : 'POST',
        headers: await getAuthHeader(),
        body: JSON.stringify(form)
      });

      if (!response.ok) throw new Error('Failed to save job');

      toast({ title: "Success", description: "Job requirement saved" });
      setShowForm(false);
      setEditingJob(null);
      setErrors({});
      setForm(initialFormState);
      fetchData();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleEditJob = (job) => {
    setEditingJob(job);
    setErrors({});
    setForm({
      ...initialFormState,
      ...job
    });
    setShowForm(true);
  };

  const handleToggleActive = async (job) => {
    try {
      await fetch(`${API_URL}/jobs/${job.id}`, {
        method: 'PUT',
        headers: await getAuthHeader(),
        body: JSON.stringify({ active: !job.active })
      });
      fetchData();
      toast({ title: "Status Updated" });
    } catch (e) { 
      toast({ title: "Error", variant: "destructive" }); 
    }
  };

  const filteredJobs = jobs.filter(j => 
    j.position.toLowerCase().includes(searchTerm.toLowerCase()) || 
    j.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.jobCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 p-6 space-y-8 bg-zinc-50 dark:bg-zinc-950 min-h-screen text-zinc-900 dark:text-zinc-100">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Job Requirements</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage active openings and allocations</p>
        </div>
        <button
          onClick={() => {
            setEditingJob(null);
            setShowForm(!showForm);
            setForm(initialFormState);
            setErrors({});
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-sm"
        >
          {showForm ? <XMarkIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
          {showForm ? "Cancel" : "Add Requirement"}
        </button>
      </div>

      {/* Form Section */}
      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-6 overflow-hidden"
          >
            <h3 className="font-semibold text-lg mb-6 border-b border-zinc-100 dark:border-zinc-800 pb-3 text-zinc-900 dark:text-white">
              {editingJob ? "Edit Job Requirement" : "Create New Requirement"}
            </h3>
            
            <div className="grid md:grid-cols-4 gap-5">
              
              {/* 1. Job Code */}
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-zinc-500 mb-1">1. Job Code *</label>
                <input name="jobCode" placeholder="E.g. JB1001" value={form.jobCode} onChange={handleChange} className={`${inputCls} ${errors.jobCode ? "border-red-500" : ""}`} />
                {errors.jobCode && <p className="text-xs text-red-500 mt-1">{errors.jobCode}</p>}
              </div>

              {/* 2. Client */}
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-zinc-500 mb-1">2. Client *</label>
                <select name="clientName" value={form.clientName} onChange={handleChange} className={`${inputCls} ${errors.clientName ? "border-red-500" : ""}`}>
                  <option value="">Select Client</option>
                  {clients.map(c => <option key={c.id} value={c.companyName}>{c.companyName}</option>)}
                </select>
                {errors.clientName && <p className="text-xs text-red-500 mt-1">{errors.clientName}</p>}
              </div>

              {/* 3. Role / Position */}
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-zinc-500 mb-1">3. Role / Position *</label>
                <input name="position" placeholder="Job Title" value={form.position} onChange={handleChange} className={`${inputCls} ${errors.position ? "border-red-500" : ""}`} />
                {errors.position && <p className="text-xs text-red-500 mt-1">{errors.position}</p>}
              </div>

              {/* 4. Location */}
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-zinc-500 mb-1">4. Location *</label>
                <input name="location" placeholder="City / Remote" value={form.location} onChange={handleChange} className={`${inputCls} ${errors.location ? "border-red-500" : ""}`} />
                {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
              </div>

              {/* 5. Experience */}
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-zinc-500 mb-1">5. Experience *</label>
                <input name="experience" placeholder="E.g. 3-5 Years" value={form.experience} onChange={handleChange} className={`${inputCls} ${errors.experience ? "border-red-500" : ""}`} />
                {errors.experience && <p className="text-xs text-red-500 mt-1">{errors.experience}</p>}
              </div>

              {/* 6. Relevant Experience */}
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-zinc-500 mb-1">6. Relevant Experience</label>
                <input name="relevantExperience" placeholder="E.g. 2 Years" value={form.relevantExperience} onChange={handleChange} className={inputCls} />
              </div>

              {/* 7. Educational Qualification */}
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-zinc-500 mb-1">7. Educational Qualification</label>
                <input name="qualification" placeholder="E.g. B.Tech / MBA" value={form.qualification} onChange={handleChange} className={inputCls} />
              </div>

              {/* 8. Maximum Salary Range */}
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-zinc-500 mb-1">8. Maximum Salary Range *</label>
                <input name="salaryBudget" placeholder="E.g. 10-12 LPA" value={form.salaryBudget} onChange={handleChange} className={`${inputCls} ${errors.salaryBudget ? "border-red-500" : ""}`} />
                {errors.salaryBudget && <p className="text-xs text-red-500 mt-1">{errors.salaryBudget}</p>}
              </div>

              {/* 9. Gender */}
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-zinc-500 mb-1">9. Gender Preference</label>
                <select name="gender" value={form.gender} onChange={handleChange} className={inputCls}>
                  <option value="Any">Any</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              {/* 10. N/P (Notice Period) */}
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-zinc-500 mb-1">10. N/P (Notice Period)</label>
                <input name="noticePeriod" placeholder="E.g. 15 Days, Immediate" value={form.noticePeriod} onChange={handleChange} className={inputCls} />
              </div>

              {/* 11. Primary Recruiter */}
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-zinc-500 mb-1">11. Primary Recruiter</label>
                <select name="primaryRecruiter" value={form.primaryRecruiter} onChange={handleChange} className={inputCls}>
                  <option value="">Select Recruiter</option>
                  {recruiters.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>

              {/* 12. Secondary Recruiter */}
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-zinc-500 mb-1">12. Secondary Recruiter</label>
                <select name="secondaryRecruiter" value={form.secondaryRecruiter} onChange={handleChange} className={inputCls}>
                  <option value="">Select Recruiter</option>
                  {recruiters.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>

              {/* 13. Skills */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-zinc-500 mb-1">13. Skills *</label>
                <input name="skills" placeholder="React, Node.js, etc." value={form.skills} onChange={handleChange} className={`${inputCls} ${errors.skills ? "border-red-500" : ""}`} />
                {errors.skills && <p className="text-xs text-red-500 mt-1">{errors.skills}</p>}
              </div>

              {/* 14. JD Link (Optional) */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-zinc-500 mb-1">14. JD Link (Optional)</label>
                <input name="jdLink" placeholder="https://..." value={form.jdLink} onChange={handleChange} className={`${inputCls} ${errors.jdLink ? "border-red-500" : ""}`} />
                {errors.jdLink && <p className="text-xs text-red-500 mt-1">{errors.jdLink}</p>}
              </div>
            </div>

            <div className="flex justify-end pt-5 mt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button onClick={handleSubmit} className="px-6 py-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-sm">
                {editingJob ? "Update Requirement" : "Save Requirement"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Bar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <input
          placeholder="Search by Job Code, Position, or Client..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className={inputCls}
        />
      </div>

      {/* List Section */}
      {loading ? (
        <div className="text-center p-12 text-zinc-500 flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-zinc-300 border-t-zinc-800 rounded-full animate-spin mb-4"></div>
          Loading jobs...
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-xs uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-6 py-4 font-medium tracking-wider">Code</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Client & Position</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Recruiters</th>
                  <th className="px-6 py-4 font-medium tracking-wider">Status</th>
                  <th className="px-6 py-4 font-medium tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {filteredJobs.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-zinc-400">No requirements found.</td></tr>
                ) : filteredJobs.map(job => (
                  <tr key={job.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-700 font-mono text-xs">
                        {job.jobCode}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">{job.position}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{job.clientName} • {job.location}</div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="flex flex-col gap-1">
                        {job.primaryRecruiter ? (
                          <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded w-fit">P: {job.primaryRecruiter}</span>
                        ) : <span className="text-zinc-400 italic">No Primary</span>}
                        {job.secondaryRecruiter && (
                          <span className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded w-fit">S: {job.secondaryRecruiter}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${
                        job.active !== false 
                          ? "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700" 
                          : "bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30"
                      }`}>
                        {job.active !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setSelectedJob(job)} title="View" className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white transition-colors">
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleEditJob(job)} title="Edit" className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white transition-colors">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggleActive(job)} title={job.active !== false ? "Deactivate" : "Activate"} className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white transition-colors">
                          {job.active !== false ? <NoSymbolIcon className="w-4 h-4" /> : <CheckCircleIcon className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedJob && <JobDetailCard job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </div>
  );
}
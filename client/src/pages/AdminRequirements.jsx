import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast"; 
import { motion, AnimatePresence } from "framer-motion";
import {
  XMarkIcon, EyeIcon, PencilIcon, PlusIcon, CheckCircleIcon, NoSymbolIcon,
} from "@heroicons/react/24/outline";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Job Detail Modal Component
const JobDetailCard = ({ job, onClose }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }} 
          animate={{ scale: 1 }} 
          exit={{ scale: 0.9 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="bg-blue-600 text-white p-6 flex justify-between items-start">
             <div>
                <h2 className="text-2xl font-bold">{job.position}</h2>
                <div className="text-blue-100">{job.clientName} ({job.jobCode})</div>
             </div>
             <button onClick={onClose}><XMarkIcon className="w-6 h-6" /></button>
          </div>
          <div className="p-6 grid grid-cols-2 gap-6">
             <div>
                <h3 className="font-bold mb-2">Requirements</h3>
                <p>Skills: {job.skills}</p>
                <p>Exp: {job.experience}</p>
                <p>Budget: {job.salaryBudget}</p>
                <p>Loc: {job.location}</p>
             </div>
             <div>
                <h3 className="font-bold mb-2">Recruiters</h3>
                <p>Pri: {job.primaryRecruiter || 'N/A'}</p>
                <p>Sec: {job.secondaryRecruiter || 'N/A'}</p>
                <p>TAT: {job.tatTime ? new Date(job.tatTime).toLocaleDateString() : 'N/A'}</p>
             </div>
             <div className="col-span-2 bg-gray-50 p-3 rounded">
                <h4 className="font-bold text-sm">Link</h4>
                <a href={job.jdLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 break-all">{job.jdLink}</a>
             </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const AdminRequirements = () => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const initialFormState = {
    jobCode: "", clientName: "", position: "", skills: "", salaryBudget: "", location: "",
    experience: "", gender: "", interviewMode: "", tatTime: "", jdLink: "", comments: "",
    primaryRecruiter: "", secondaryRecruiter: "", active: true,
  };

  const [form, setForm] = useState(initialFormState);
  const [errors, setErrors] = useState({}); // Validation Errors

  const [selectedJob, setSelectedJob] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const getAuthHeader = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`
  });

  // Fetch all necessary data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [jobsRes, clientsRes, recRes] = await Promise.all([
        fetch(`${API_URL}/jobs`, { headers: getAuthHeader() }),
        fetch(`${API_URL}/clients`, { headers: getAuthHeader() }),
        fetch(`${API_URL}/recruiters`, { headers: getAuthHeader() })
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

  // --- VALIDATION LOGIC ---
  const validateForm = () => {
    const newErrors = {};

    if (!form.jobCode?.trim()) newErrors.jobCode = "Job Code is required";
    if (!form.clientName) newErrors.clientName = "Please select a client";
    if (!form.position?.trim()) newErrors.position = "Position is required";
    if (!form.location?.trim()) newErrors.location = "Location is required";
    if (!form.experience?.trim()) newErrors.experience = "Experience required";
    if (!form.salaryBudget?.trim()) newErrors.salaryBudget = "Budget required";
    if (!form.skills?.trim()) newErrors.skills = "Skills required";
    if (!form.tatTime) newErrors.tatTime = "TAT Date required";
    
    // Optional link validation
    if (form.jdLink && !/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(form.jdLink)) {
        newErrors.jdLink = "Invalid URL format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ 
      ...form, 
      [name]: type === 'checkbox' ? checked : value 
    });

    // Clear error
    if (errors[name]) {
        setErrors(prev => {
            const n = { ...prev };
            delete n[name];
            return n;
        });
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({ title: "Validation Error", description: "Required fields missing or invalid", variant: "destructive" });
      return;
    }

    try {
      const url = editingJob ? `${API_URL}/jobs/${editingJob.id}` : `${API_URL}/jobs`;
      const method = editingJob ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeader(),
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
      ...job,
      tatTime: job.tatTime ? new Date(job.tatTime).toISOString().split('T')[0] : ""
    });
    setShowForm(true);
  };

  const handleToggleActive = async (job) => {
    try {
      await fetch(`${API_URL}/jobs/${job.id}`, {
        method: 'PUT',
        headers: getAuthHeader(),
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
    j.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Job Requirements</h1>
            <Button onClick={() => { setShowForm(!showForm); setErrors({}); setForm(initialFormState); }} className="bg-blue-600 hover:bg-blue-700">
              <PlusIcon className="w-4 h-4 mr-2" /> {showForm ? "Cancel" : "Add Requirement"}
            </Button>
          </div>

          {/* Form Section */}
          <AnimatePresence>
            {showForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <Card className="mb-6 border-l-4 border-blue-500">
                  <CardHeader><CardTitle>{editingJob ? "Edit" : "Add"} Requirement</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Job Code */}
                      <div>
                          <Input name="jobCode" placeholder="Job Code *" value={form.jobCode} onChange={handleChange} className={errors.jobCode ? "border-red-500" : ""} />
                          {errors.jobCode && <p className="text-xs text-red-500 mt-1">{errors.jobCode}</p>}
                      </div>

                      {/* Client Select */}
                      <div>
                          <select name="clientName" value={form.clientName} onChange={handleChange} className={`w-full border rounded p-2 text-sm bg-transparent ${errors.clientName ? "border-red-500" : ""}`}>
                            <option value="">Select Client *</option>
                            {clients.map(c => <option key={c.id} value={c.companyName}>{c.companyName}</option>)}
                          </select>
                          {errors.clientName && <p className="text-xs text-red-500 mt-1">{errors.clientName}</p>}
                      </div>

                      {/* Position */}
                      <div>
                          <Input name="position" placeholder="Position *" value={form.position} onChange={handleChange} className={errors.position ? "border-red-500" : ""} />
                          {errors.position && <p className="text-xs text-red-500 mt-1">{errors.position}</p>}
                      </div>

                      {/* Location */}
                      <div>
                          <Input name="location" placeholder="Location *" value={form.location} onChange={handleChange} className={errors.location ? "border-red-500" : ""} />
                          {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
                      </div>

                      {/* Experience */}
                      <div>
                          <Input name="experience" placeholder="Experience *" value={form.experience} onChange={handleChange} className={errors.experience ? "border-red-500" : ""} />
                          {errors.experience && <p className="text-xs text-red-500 mt-1">{errors.experience}</p>}
                      </div>

                      {/* Budget */}
                      <div>
                          <Input name="salaryBudget" placeholder="Budget *" value={form.salaryBudget} onChange={handleChange} className={errors.salaryBudget ? "border-red-500" : ""} />
                          {errors.salaryBudget && <p className="text-xs text-red-500 mt-1">{errors.salaryBudget}</p>}
                      </div>

                      {/* TAT Date */}
                      <div>
                          <Input name="tatTime" type="date" placeholder="TAT *" value={form.tatTime} onChange={handleChange} className={errors.tatTime ? "border-red-500" : ""} />
                          {errors.tatTime && <p className="text-xs text-red-500 mt-1">{errors.tatTime}</p>}
                      </div>

                      <select name="primaryRecruiter" value={form.primaryRecruiter} onChange={handleChange} className="border rounded p-2 text-sm bg-transparent">
                        <option value="">Primary Recruiter</option>
                        {recruiters.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                      </select>

                      <select name="secondaryRecruiter" value={form.secondaryRecruiter} onChange={handleChange} className="border rounded p-2 text-sm bg-transparent">
                        <option value="">Secondary Recruiter</option>
                        {recruiters.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                      </select>

                      {/* Skills */}
                      <div className="col-span-1 md:col-span-3">
                          <Input name="skills" placeholder="Skills *" value={form.skills} onChange={handleChange} className={errors.skills ? "border-red-500" : ""} />
                          {errors.skills && <p className="text-xs text-red-500 mt-1">{errors.skills}</p>}
                      </div>

                      {/* JD Link */}
                      <div className="col-span-1 md:col-span-3">
                          <Input name="jdLink" placeholder="JD Link (Optional)" value={form.jdLink} onChange={handleChange} className={errors.jdLink ? "border-red-500" : ""} />
                          {errors.jdLink && <p className="text-xs text-red-500 mt-1">{errors.jdLink}</p>}
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button onClick={handleSubmit}>{editingJob ? "Update" : "Save"}</Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* List Section */}
          {loading ? <div className="text-center p-10">Loading...</div> : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-800 text-white">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Client/Position</th>
                      <th className="px-4 py-3">Recruiters</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.map(job => (
                      <tr key={job.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs"><Badge variant="secondary">{job.jobCode}</Badge></td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{job.position}</div>
                          <div className="text-xs text-gray-500">{job.clientName} | {job.location}</div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {job.primaryRecruiter && <Badge className="bg-blue-100 text-blue-800 mr-1">{job.primaryRecruiter}</Badge>}
                          {job.secondaryRecruiter && <Badge className="bg-green-100 text-green-800">{job.secondaryRecruiter}</Badge>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={job.active !== false ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {job.active !== false ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedJob(job)}><EyeIcon className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditJob(job)}><PencilIcon className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleToggleActive(job)}>
                            {job.active !== false ? <NoSymbolIcon className="w-4 h-4 text-red-500" /> : <CheckCircleIcon className="w-4 h-4 text-green-500" />}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      {selectedJob && <JobDetailCard job={selectedJob} onClose={() => setSelectedJob(null)} />}
    </>
  );
};

export default AdminRequirements;
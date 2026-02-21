import React, { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  BriefcaseIcon, MapPinIcon, CurrencyDollarIcon,
  Squares2X2Icon, ListBulletIcon, EyeIcon, XMarkIcon, 
  BuildingOfficeIcon, PlusIcon, UserGroupIcon, MagnifyingGlassIcon,
  TrashIcon
} from "@heroicons/react/24/outline";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Plain Tailwind UI Helpers ────────────────────────────────────────────────

const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
    {children}
  </span>
);

const getTatBadge = (tatTime) => {
  if (!tatTime) return <Badge className="bg-slate-100 text-slate-600">N/A</Badge>;
  const diffDays = Math.ceil((new Date(tatTime).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
  if (diffDays < 0) return <Badge className="bg-red-100 text-red-700">Expired</Badge>;
  if (diffDays <= 3) return <Badge className="bg-yellow-100 text-yellow-800">Due: {diffDays}d</Badge>;
  return <Badge className="bg-green-50 text-green-600 border border-green-200">{diffDays} days left</Badge>;
};

// Modal component
const Modal = ({ open, onClose, children, maxWidth = 'max-w-2xl' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}/>
      <div className={`relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}>
        {children}
      </div>
    </div>
  );
};

const ModalHeader = ({ children }) => <div className="px-6 pt-6 pb-2">{children}</div>;
const ModalTitle = ({ children }) => <h2 className="text-xl font-bold text-gray-900 dark:text-white">{children}</h2>;
const ModalDesc = ({ children }) => <p className="text-sm text-gray-500 mt-1">{children}</p>;
const ModalFooter = ({ children }) => <div className="px-6 pb-6 pt-4 flex justify-end gap-3">{children}</div>;
const ModalBody = ({ children }) => <div className="px-6 py-4">{children}</div>;

const Button = ({ children, onClick, disabled, className = '', variant = 'default', size = 'md' }) => {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none';
  const sizes = { sm: 'px-2 py-1 text-xs', md: 'px-4 py-2 text-sm', icon: 'p-2' };
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size] ?? sizes.md} ${variants[variant] ?? variants.default} ${className}`}>
      {children}
    </button>
  );
};

const Input = ({ className = '', ...props }) => (
  <input className={`w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`} {...props}/>
);

const Label = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{children}</label>
);

const NativeSelect = ({ value, onChange, children, disabled, className = '' }) => (
  <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
    className={`w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}>
    {children}
  </select>
);

// ─────────────────────────────────────────────────────────────────────────────

export default function RecruiterAssignments() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [jobs, setJobs] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);
  
  const [submitting, setSubmitting] = useState(false);

  const initialJobForm = {
    jobCode: '', clientName: '', position: '', skills: '', salaryBudget: '',
    location: '', experience: '', gender: 'Any', interviewMode: 'Virtual',
    tatTime: '', jdLink: '', comments: '', primaryRecruiter: '', secondaryRecruiter: ''
  };

  const [jobForm, setJobForm] = useState(initialJobForm);

  const [clientForm, setClientForm] = useState({
    companyName: '', industry: '', location: '', website: '', contactPerson: '', email: '', phone: ''
  });

  const getAuthHeader = () => ({
    'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`,
    'Content-Type': 'application/json'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resJobs, resRecs, resClients] = await Promise.all([
        fetch(`${API_URL}/jobs`, { headers: getAuthHeader() }),
        fetch(`${API_URL}/users/active-list`, { headers: getAuthHeader() }),
        fetch(`${API_URL}/clients`, { headers: getAuthHeader() })
      ]);
      if (resJobs.ok) {
        const data = await resJobs.json();
        setJobs(data.map((j) => ({ ...j, id: j._id })));
      }
      if (resRecs.ok) setRecruiters(await resRecs.json());
      if (resClients.ok) setClients(await resClients.json());
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to fetch data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateClient = async () => {
    if (!clientForm.companyName.trim()) return toast({ title: "Validation", description: "Company Name is required", variant: "destructive" });
    if (!clientForm.contactPerson.trim()) return toast({ title: "Validation", description: "Contact Person is required", variant: "destructive" });
    if (!clientForm.email.trim()) return toast({ title: "Validation", description: "Email is required", variant: "destructive" });

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/clients`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(clientForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create client");
      toast({ title: "Success", description: "Client added successfully" });
      setIsClientModalOpen(false);
      fetchData();
      setClientForm({ companyName: '', industry: '', location: '', website: '', contactPerson: '', email: '', phone: '' });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setJobForm(initialJobForm);
    setIsEditMode(false);
    setIsJobModalOpen(true);
  };

  const openViewModal = (job) => {
    setJobForm({
      jobCode: job.jobCode || '',
      clientName: job.clientName || '',
      position: job.position || '',
      skills: job.skills || '',
      salaryBudget: job.salaryBudget || '',
      location: job.location || '',
      experience: job.experience || '',
      gender: job.gender || 'Any',
      interviewMode: job.interviewMode || 'Virtual',
      tatTime: job.tatTime ? new Date(job.tatTime).toISOString().split('T')[0] : '',
      jdLink: job.jdLink || '',
      comments: job.comments || '',
      primaryRecruiter: job.primaryRecruiter || '',
      secondaryRecruiter: job.secondaryRecruiter || ''
    });
    setSelectedJob(job);
    setIsEditMode(true);
    setIsJobModalOpen(true);
  };

  const handleCreateJob = async () => {
    if (!jobForm.jobCode.trim()) return toast({ title: "Validation", description: "Job Code is required", variant: "destructive" });
    if (!jobForm.position.trim()) return toast({ title: "Validation", description: "Position is required", variant: "destructive" });
    if (!jobForm.clientName) return toast({ title: "Validation", description: "Client is required", variant: "destructive" });
    
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/jobs`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(jobForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create job");
      toast({ title: "Success", description: "New requirement posted successfully" });
      setIsJobModalOpen(false);
      fetchData();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!jobToDelete) return;
    try {
      const res = await fetch(`${API_URL}/jobs/${jobToDelete._id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      if (!res.ok) throw new Error("Failed to delete job");
      toast({ title: "Success", description: "Job deleted successfully" });
      setDeleteDialogOpen(false);
      setJobToDelete(null);
      setSelectedJob(null);
      fetchData();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const query = searchQuery.toLowerCase();
      return (
        job.position?.toLowerCase().includes(query) ||
        job.clientName?.toLowerCase().includes(query) ||
        job.jobCode?.toLowerCase().includes(query) ||
        job.location?.toLowerCase().includes(query)
      );
    });
  }, [jobs, searchQuery]);

  return (
    <>
      <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Job Management</h1>
              <p className="text-gray-500 mt-1">Manage clients, post requirements, and assign recruiters</p>
            </div>
            <div className="flex gap-3">
           
            </div>
          </div>

          {/* Search / View Toggle */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="relative w-full md:w-96">
              <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400"/>
              <input type="text" placeholder="Search jobs..." className="w-full pl-9 p-2 border rounded-lg bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/>
            </div>
            <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-800 shadow text-blue-600' : 'text-gray-500'}`}>
                <Squares2X2Icon className="w-5 h-5"/>
              </button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 shadow text-blue-600' : 'text-gray-500'}`}>
                <ListBulletIcon className="w-5 h-5"/>
              </button>
            </div>
          </div>

          {/* Jobs Grid / List */}
          {loading ? (
            <div className="text-center py-20"><div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div></div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border">
              <BriefcaseIcon className="w-16 h-16 text-gray-300 mx-auto mb-4"/>
              <p className="text-gray-500 text-lg">No jobs found</p>
              <Button onClick={openCreateModal} className="mt-4 bg-blue-600">Post Your First Job</Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map(job => (
                <div key={job.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border hover:shadow-lg transition-all relative group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-mono bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100">{job.jobCode}</span>
                      <h3 className="text-lg font-bold mt-2 text-gray-900 dark:text-white truncate max-w-[200px]" title={job.position}>{job.position}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><BuildingOfficeIcon className="w-4 h-4"/> {job.clientName}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm mb-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                    <div className="flex justify-between"><span className="text-gray-500">Location:</span> <span className="font-medium text-gray-900 dark:text-white">{job.location || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">TAT:</span> {getTatBadge(job.tatTime)}</div>
                  </div>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button className="h-8 w-8 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded" onClick={() => openViewModal(job)}>
                      <EyeIcon className="w-4 h-4"/>
                    </button>
                    <button className="h-8 w-8 flex items-center justify-center text-red-600 hover:bg-red-50 rounded" onClick={() => { setJobToDelete(job); setDeleteDialogOpen(true); }}>
                      <TrashIcon className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500">
                  <tr>
                    <th className="p-4">Job Code</th><th className="p-4">Position</th><th className="p-4">Client</th>
                    <th className="p-4">Location</th><th className="p-4">TAT</th><th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredJobs.map(job => (
                    <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="p-4 font-mono text-blue-600">{job.jobCode}</td>
                      <td className="p-4 font-medium">{job.position}</td>
                      <td className="p-4">{job.clientName}</td>
                      <td className="p-4">{job.location}</td>
                      <td className="p-4">{getTatBadge(job.tatTime)}</td>
                      <td className="p-4 flex gap-2">
                        <button className="p-1 hover:bg-gray-100 rounded" onClick={() => openViewModal(job)}><EyeIcon className="w-4 h-4 text-blue-600"/></button>
                        <button className="p-1 hover:bg-gray-100 rounded" onClick={() => { setJobToDelete(job); setDeleteDialogOpen(true); }}><TrashIcon className="w-4 h-4 text-red-600"/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Post / View Requirement Modal */}
      <Modal open={isJobModalOpen} onClose={() => setIsJobModalOpen(false)} maxWidth="max-w-4xl">
        <ModalHeader>
          <ModalTitle>{isEditMode ? 'View Job Requirement' : 'Post New Requirement'}</ModalTitle>
          <ModalDesc>{isEditMode ? 'Job details are read-only.' : 'Fill in the details below. Fields marked with * are required.'}</ModalDesc>
        </ModalHeader>
        <ModalBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="jobCode">Job Code *</Label>
              <Input id="jobCode" placeholder="e.g. JB-1001" value={jobForm.jobCode} onChange={e => setJobForm({...jobForm, jobCode: e.target.value})} disabled={isEditMode}/>
            </div>
            <div>
              <Label htmlFor="clientName">Client *</Label>
              <NativeSelect value={jobForm.clientName} onChange={val => setJobForm({...jobForm, clientName: val})} disabled={isEditMode}>
                <option value="">Select Client</option>
                {clients.map(c => <option key={c._id} value={c.companyName}>{c.companyName}</option>)}
              </NativeSelect>
              {!isEditMode && clients.length === 0 && <div className="text-xs text-red-500 mt-1">No clients found. Please add a client first.</div>}
            </div>
            <div>
              <Label htmlFor="position">Position Title *</Label>
              <Input id="position" placeholder="e.g. React Developer" value={jobForm.position} onChange={e => setJobForm({...jobForm, position: e.target.value})} disabled={isEditMode}/>
            </div>
            <div>
              <Label htmlFor="salaryBudget">Salary Budget</Label>
              <Input id="salaryBudget" placeholder="e.g. 15 LPA" value={jobForm.salaryBudget} onChange={e => setJobForm({...jobForm, salaryBudget: e.target.value})} disabled={isEditMode}/>
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={jobForm.location} onChange={e => setJobForm({...jobForm, location: e.target.value})} disabled={isEditMode}/>
            </div>
            <div>
              <Label htmlFor="experience">Experience</Label>
              <Input id="experience" placeholder="e.g. 3-5 Years" value={jobForm.experience} onChange={e => setJobForm({...jobForm, experience: e.target.value})} disabled={isEditMode}/>
            </div>
            <div>
              <Label htmlFor="tatTime">Target Date (TAT)</Label>
              <Input id="tatTime" type="date" value={jobForm.tatTime} onChange={e => setJobForm({...jobForm, tatTime: e.target.value})} disabled={isEditMode}/>
            </div>
            <div>
              <Label>Interview Mode</Label>
              <NativeSelect value={jobForm.interviewMode} onChange={val => setJobForm({...jobForm, interviewMode: val})} disabled={isEditMode}>
                <option value="Virtual">Virtual</option>
                <option value="In-Person">In-Person</option>
                <option value="Hybrid">Hybrid</option>
              </NativeSelect>
            </div>

            <div className="col-span-1 md:col-span-2 mt-4 pt-4 border-t">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><UserGroupIcon className="w-4 h-4"/> Assign Recruiters</h4>
            </div>

            <div>
              <Label>Primary Recruiter</Label>
              <NativeSelect value={jobForm.primaryRecruiter} onChange={val => setJobForm({...jobForm, primaryRecruiter: val})} disabled={isEditMode}>
                <option value="">Select Recruiter</option>
                <option value="Unassigned">None</option>
                {recruiters.map(r => <option key={r._id} value={r.name}>{r.name}</option>)}
              </NativeSelect>
            </div>
            <div>
              <Label>Secondary Recruiter</Label>
              <NativeSelect value={jobForm.secondaryRecruiter} onChange={val => setJobForm({...jobForm, secondaryRecruiter: val})} disabled={isEditMode}>
                <option value="">Select Recruiter</option>
                <option value="Unassigned">None</option>
                {recruiters.map(r => <option key={r._id} value={r.name}>{r.name}</option>)}
              </NativeSelect>
            </div>

            <div className="col-span-1 md:col-span-2">
              <Label>Required Skills</Label>
              <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500" value={jobForm.skills} onChange={e => setJobForm({...jobForm, skills: e.target.value})} disabled={isEditMode}/>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          {isEditMode ? (
            <Button onClick={() => setIsJobModalOpen(false)}>Close</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsJobModalOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateJob} disabled={submitting} className="bg-blue-600 text-white">
                {submitting ? 'Saving...' : 'Post Requirement'}
              </Button>
            </>
          )}
        </ModalFooter>
      </Modal>

      {/* Add New Client Modal */}
      <Modal open={isClientModalOpen} onClose={() => setIsClientModalOpen(false)}>
        <ModalHeader>
          <ModalTitle>Add New Client</ModalTitle>
          <ModalDesc>Add a client to assign jobs to. <strong>Required: Name, Email, Contact Person.</strong></ModalDesc>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <Label>Company Name *</Label>
              <Input value={clientForm.companyName} onChange={e => setClientForm({...clientForm, companyName: e.target.value})} placeholder="e.g. Google"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Contact Person *</Label>
                <Input value={clientForm.contactPerson} onChange={e => setClientForm({...clientForm, contactPerson: e.target.value})} placeholder="e.g. John Doe"/>
              </div>
              <div>
                <Label>Email *</Label>
                <Input value={clientForm.email} onChange={e => setClientForm({...clientForm, email: e.target.value})} placeholder="hr@company.com"/>
              </div>
            </div>
            <div>
              <Label>Industry</Label>
              <Input value={clientForm.industry} onChange={e => setClientForm({...clientForm, industry: e.target.value})}/>
            </div>
            <div>
              <Label>Location</Label>
              <Input value={clientForm.location} onChange={e => setClientForm({...clientForm, location: e.target.value})}/>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsClientModalOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateClient} disabled={submitting} className="bg-blue-600 text-white">Save Client</Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <ModalHeader>
          <ModalTitle>Delete Requirement?</ModalTitle>
          <ModalDesc>This will permanently delete the job <strong>{jobToDelete?.jobCode}</strong>. This action cannot be undone.</ModalDesc>
        </ModalHeader>
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDeleteJob}>Delete</Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

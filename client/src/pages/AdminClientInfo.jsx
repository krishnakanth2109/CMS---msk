import React, { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  BuildingOfficeIcon,
  UserIcon,
  XMarkIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  CheckCircleIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const inputCls = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white";

/* ---------------- DETAIL MODAL ---------------- */

const ClientDetailCard = ({ client, onClose }) => {
  const isCandidatePeriodExpired = useMemo(() => {
    if (!client?.candidatePeriod) return false;
    const placementDate = new Date(client.dateAdded);
    const expiryDate = new Date(placementDate);
    expiryDate.setMonth(expiryDate.getMonth() + client.candidatePeriod);
    return new Date() > expiryDate;
  }, [client]);

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
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-6 rounded-t-2xl">
            <div className="flex justify-between">
              <div>
                <h2 className="text-2xl font-bold">{client.companyName}</h2>
                <p className="text-purple-100">{client.clientId}</p>
              </div>
              <button onClick={onClose}>
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <UserIcon className="w-5 h-5" /> Contact Info
                </h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Person:</span> {client.contactPerson || "N/A"}</p>
                  <p><span className="font-medium">Email:</span> {client.email || "N/A"}</p>
                  <p><span className="font-medium">Phone:</span> {client.phone || "N/A"}</p>
                  <p><span className="font-medium">Address:</span> {client.address || "N/A"}</p>
                  <p><span className="font-medium">Website:</span> {client.website || "N/A"}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <BuildingOfficeIcon className="w-5 h-5" /> Business Terms
                </h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Commission:</span> {client.percentage ? `${client.percentage}%` : "N/A"}</p>
                  <p><span className="font-medium">Period:</span> {client.candidatePeriod ? `${client.candidatePeriod} months` : "N/A"}</p>
                  <p><span className="font-medium">Replacement:</span> {client.replacementPeriod ? `${client.replacementPeriod} days` : "N/A"}</p>
                  <p><span className="font-medium">GST:</span> {client.gstNumber || "N/A"}</p>
                </div>
              </div>
            </div>
            {client.terms && (
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h4 className="font-semibold mb-1">Terms & Conditions</h4>
                <p className="text-sm">{client.terms}</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/* ---------------- MAIN ---------------- */

const AdminClientInfo = () => {
  const { toast } = useToast();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const initialFormState = {
    companyName: "", contactPerson: "", email: "", phone: "", website: "",
    address: "", locationLink: "", industry: "", gstNumber: "", notes: "",
    clientId: "", percentage: "", candidatePeriod: "", replacementPeriod: "",
    terms: "", active: true,
  };

  const [form, setForm] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingClient, setEditingClient] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [industryFilter, setIndustryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const getAuthHeader = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${sessionStorage.getItem("authToken")}`,
  });

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/clients`, { headers: getAuthHeader() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setClients(data.map((c) => ({ ...c, id: c._id })));
    } catch {
      toast({ title: "Error", description: "Failed to load clients", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const validateForm = () => {
    const e = {};
    if (!form.companyName.trim()) e.companyName = "Company required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (form.phone && form.phone.length !== 10) e.phone = "Phone must be 10 digits";
    if (form.percentage && (isNaN(form.percentage) || form.percentage > 100)) e.percentage = "Invalid %";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "phone" && /[^0-9]/.test(value)) return;
    if (name === "phone" && value.length > 10) return;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
    if (errors[name]) {
      const copy = { ...errors };
      delete copy[name];
      setErrors(copy);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      const url = editingClient ? `${API_URL}/clients/${editingClient.id}` : `${API_URL}/clients`;
      const res = await fetch(url, {
        method: editingClient ? "PUT" : "POST",
        headers: getAuthHeader(),
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Success", description: "Client saved" });
      setShowForm(false);
      setEditingClient(null);
      setForm(initialFormState);
      fetchClients();
    } catch {
      toast({ title: "Error", description: "Save failed", variant: "destructive" });
    }
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    setForm({
      ...initialFormState, ...client,
      percentage: client.percentage?.toString() || "",
      candidatePeriod: client.candidatePeriod?.toString() || "",
      replacementPeriod: client.replacementPeriod?.toString() || "",
      active: client.active !== false,
    });
    setShowForm(true);
  };

  const handleToggleActive = async (client) => {
    try {
      await fetch(`${API_URL}/clients/${client.id}`, {
        method: "PUT",
        headers: getAuthHeader(),
        body: JSON.stringify({ active: !client.active }),
      });
      fetchClients();
    } catch {}
  };

  const uniqueIndustries = useMemo(
    () => Array.from(new Set(clients.map((c) => c.industry).filter(Boolean))),
    [clients]
  );

  const filteredClients = clients.filter((c) => {
    const s = searchTerm.toLowerCase();
    const matchSearch =
      c.companyName.toLowerCase().includes(s) ||
      (c.email || "").toLowerCase().includes(s);
    const matchIndustry = industryFilter === "all" || c.industry === industryFilter;
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? c.active !== false : c.active === false);
    return matchSearch && matchIndustry && matchStatus;
  });

  const getStatusBadge = (client) => (
    <Badge className={client.active !== false ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
      {client.active !== false ? "Active" : "Inactive"}
    </Badge>
  );

  return (
    <>
      <div className="flex-1 p-6 space-y-6">
        <div className="flex justify-between">
          <div>
            <h1 className="text-3xl font-bold">Client Information</h1>
            <p className="text-gray-500">Manage client companies</p>
          </div>
          <button
            onClick={() => {
              setEditingClient(null);
              setShowForm(!showForm);
              setForm(initialFormState);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition"
          >
            <PlusIcon className="w-4 h-4" />
            {showForm ? "Cancel" : "Add Client"}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="rounded-xl border border-border bg-card shadow-sm p-6">
            <h3 className="font-semibold text-foreground mb-4">{editingClient ? "Edit Client" : "Add Client"}</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <input name="companyName" placeholder="Company Name *" value={form.companyName} onChange={handleChange} className={`${inputCls} ${errors.companyName ? 'border-red-500' : ''}`} />
                {errors.companyName && <p className="text-xs text-red-500 mt-1">{errors.companyName}</p>}
              </div>
              <input name="contactPerson" placeholder="Contact Person" value={form.contactPerson} onChange={handleChange} className={inputCls} />
              <div>
                <input name="email" placeholder="Email" value={form.email} onChange={handleChange} className={`${inputCls} ${errors.email ? 'border-red-500' : ''}`} />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>
              <div>
                <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} className={`${inputCls} ${errors.phone ? 'border-red-500' : ''}`} />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>
              <input name="industry" placeholder="Industry" value={form.industry} onChange={handleChange} className={inputCls} />
              <div>
                <input name="percentage" placeholder="Commission %" value={form.percentage} onChange={handleChange} className={`${inputCls} ${errors.percentage ? 'border-red-500' : ''}`} />
                {errors.percentage && <p className="text-xs text-red-500 mt-1">{errors.percentage}</p>}
              </div>
              <div className="md:col-span-3 flex justify-end">
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition"
                >
                  {editingClient ? "Update Client" : "Save Client"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            placeholder="Search by company or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`${inputCls} flex-1`}
          />
          <select value={industryFilter} onChange={e => setIndustryFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
            <option value="all">All Industries</option>
            {uniqueIndustries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center p-10 text-gray-500">Loading clients...</div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-left">Terms</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400">No clients found.</td></tr>
                ) : filteredClients.map((client) => (
                  <tr key={client.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium">{client.companyName}</div>
                      <div className="text-xs text-gray-500">{client.clientId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{client.contactPerson || "-"}</div>
                      <div className="text-xs text-gray-500">{client.email || "-"}</div>
                    </td>
                    <td className="px-4 py-3">{client.percentage ? `${client.percentage}%` : "-"}</td>
                    <td className="px-4 py-3">{getStatusBadge(client)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedClient(client)}
                          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditClient(client)}
                          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(client)}
                          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                          {client.active !== false
                            ? <NoSymbolIcon className="w-4 h-4 text-red-500" />
                            : <CheckCircleIcon className="w-4 h-4 text-green-500" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedClient && (
        <ClientDetailCard client={selectedClient} onClose={() => setSelectedClient(null)} />
      )}
    </>
  );
};

export default AdminClientInfo;

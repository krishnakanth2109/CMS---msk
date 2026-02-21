import React, { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import html2pdf from "html2pdf.js";

import {
  BuildingOfficeIcon,
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CalculatorIcon,
  PrinterIcon,
  PencilSquareIcon,
  BanknotesIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800";

/* ================= Helpers ================= */

const getOrdinalDate = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString("default", { month: "long" });
  const year = date.getFullYear();
  const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  return `${getOrdinal(day)} ${month} ${year}`;
};

const numberToWords = (num) => {
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convertGroup = (n) => {
    if (n === 0) return "";
    if (n < 20) return a[n] + " ";
    if (n < 100) return b[Math.floor(n / 10)] + " " + a[n % 10] + " ";
    return a[Math.floor(n / 100)] + " Hundred " + convertGroup(n % 100);
  };

  if (num === 0) return "Zero";
  let output = "";
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thousand = Math.floor(num / 1000); num %= 1000;

  if (crore > 0) output += convertGroup(crore) + "Crore ";
  if (lakh > 0) output += convertGroup(lakh) + "Lakh ";
  if (thousand > 0) output += convertGroup(thousand) + "Thousand ";
  if (num > 0) output += convertGroup(num);

  return output.trim() + " Rupees only";
};

/* ================= Printable Invoice ================= */

const PrintableInvoice = ({ form, selectedClient }) => {
  return (
    <div
      id="invoice-content"
      className="bg-white text-black font-sans leading-normal relative overflow-hidden"
      style={{ width: "210mm", height: "297mm", margin: "0 auto", padding: 0, position: "relative", boxSizing: "border-box" }}
    >
      <div className="flex justify-between items-start pt-12 px-12 pb-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="w-10 h-12 bg-gradient-to-br from-blue-700 to-blue-900 transform skew-x-[-10deg]" />
            <div>
              <h1 className="text-3xl font-bold text-[#0088CC] uppercase">VAGARIOUS</h1>
              <span className="text-sm font-bold text-[#0088CC] uppercase">SOLUTIONS PVT LTD</span>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-[200px] h-[100px] bg-[#00AEEF]" style={{ clipPath: "polygon(20% 0%, 100% 0, 100% 100%, 0% 100%)" }} />
      </div>

      <div className="px-12 mt-4">
        <div className="mb-6 text-xs">
          <p className="font-bold mb-1">To,</p>
          {selectedClient ? (
            <div className="font-bold">
              <p className="uppercase">{selectedClient.companyName}</p>
              <p>{selectedClient.address || "Address not available"}</p>
              <p>GST : {selectedClient.gstNumber || "N/A"}</p>
            </div>
          ) : (
            <p className="text-red-500 font-bold">[PLEASE SELECT A CLIENT]</p>
          )}
        </div>

        <div className="flex justify-between mb-4 border-b pb-2 text-xs font-bold">
          <p>SUB: Final Invoice</p>
          <div className="text-right">
            <p>Date: {getOrdinalDate(form.invoiceDate)}</p>
            <p>Invoice No: {form.invoiceNumber}</p>
          </div>
        </div>

        <div className="text-center mb-2">
          <h2 className="font-bold text-sm border border-black inline-block px-4 py-1">TAX INVOICE</h2>
        </div>

        <table className="w-full border border-black text-[10px] mb-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-1">S.No</th>
              <th className="border p-1">Candidate</th>
              <th className="border p-1">Role</th>
              <th className="border p-1">Join</th>
              <th className="border p-1">Salary</th>
              <th className="border p-1">%</th>
              <th className="border p-1">Payment</th>
            </tr>
          </thead>
          <tbody>
            {form.items.map((item, i) => (
              <tr key={item.id}>
                <td className="border p-1 text-center">{i + 1}</td>
                <td className="border p-1">{item.candidateName}</td>
                <td className="border p-1">{item.role}</td>
                <td className="border p-1">{item.joiningDate}</td>
                <td className="border p-1 text-right">{item.actualSalary.toLocaleString("en-IN")}</td>
                <td className="border p-1">{item.percentage}%</td>
                <td className="border p-1 text-right">{item.payment.toLocaleString("en-IN")}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td colSpan={6} className="border p-2 text-center">Total</td>
              <td className="border p-2 text-right">{form.total.toLocaleString("en-IN")}</td>
            </tr>
          </tbody>
        </table>

        <div className="text-xs mb-6">
          Amount in words: <span className="font-bold uppercase">{numberToWords(Math.round(form.total))}</span>
        </div>
      </div>

      <div className="absolute bottom-0 w-full bg-[#0088CC] text-white text-[9px] text-center py-2">
        Vagarious Solutions Pvt Ltd
      </div>
    </div>
  );
};

/* ================= Main Component ================= */

const AdminClientInvoice = () => {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [candidates, setCandidates] = useState([]);

  const [form, setForm] = useState({
    invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    invoiceDate: new Date().toISOString().split("T")[0],
    clientId: "",
    items: [],
    subtotal: 0,
    total: 0,
    authorizedSignatory: "Navya S",
    bankDetails: {
      accountNumber: "000805022576",
      accountName: "Vagarious Solutions Pvt Ltd.",
      bankName: "ICICI Bank",
      branch: "Begumpet Branch",
      pan: "AAHCV0176E",
      gst: "36AAHCV0176E1ZE",
    },
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const getAuthHeader = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${sessionStorage.getItem("authToken")}`,
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resClients, resCandidates] = await Promise.all([
          fetch(`${API_URL}/clients`, { headers: getAuthHeader() }),
          fetch(`${API_URL}/candidates`, { headers: getAuthHeader() }),
        ]);
        if (resClients.ok) setClients((await resClients.json()).map((c) => ({ ...c, id: c._id })));
        if (resCandidates.ok) setCandidates((await resCandidates.json()).map((c) => ({ ...c, id: c._id })));
      } catch {
        toast({ title: "Error", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const selectedClient = useMemo(() => clients.find((c) => c.id === form.clientId), [clients, form.clientId]);

  useEffect(() => {
    const total = form.items.reduce((s, i) => s + i.payment, 0);
    setForm((p) => ({ ...p, subtotal: total, total }));
  }, [form.items]);

  const handleAddCandidate = (candidate) => {
    if (form.items.some((i) => i.candidateName === candidate.name)) return;
    const ctc = parseFloat(candidate.ctc ? candidate.ctc.replace(/[^0-9.]/g, "") : "0") * 100000 || 0;
    const newItem = {
      id: Date.now().toString(),
      candidateName: candidate.name,
      role: candidate.position || "N/A",
      joiningDate: candidate.joiningDate || new Date().toISOString().split("T")[0],
      actualSalary: ctc,
      percentage: 8.33,
      payment: Math.round((ctc * 8.33) / 100),
    };
    setForm((p) => ({ ...p, items: [...p.items, newItem] }));
  };

  const removeItem = (id) => setForm((p) => ({ ...p, items: p.items.filter((i) => i.id !== id) }));

  const updateItem = (id, field, value) => {
    setForm((p) => ({
      ...p,
      items: p.items.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: value };
        if (field === "actualSalary" || field === "percentage") {
          updated.payment = Math.round((Number(updated.actualSalary) * Number(updated.percentage)) / 100);
        }
        return updated;
      }),
    }));
  };

  const handleDownload = async () => {
    const element = document.getElementById("invoice-content");
    if (!element) return;
    setIsDownloading(true);
    await html2pdf().from(element).save(`Invoice_${form.invoiceNumber}.pdf`);
    setIsDownloading(false);
  };

  const SectionCard = ({ title, icon: Icon, children }) => (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6">
      <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
        <Icon className="h-5 w-5 text-blue-600" />
        {title}
      </h3>
      {children}
    </div>
  );

  return (
    <div className="flex-1 p-8">
      <div className="flex justify-between mb-6">
        <h1 className="text-3xl font-bold">Invoice Generator</h1>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition"
        >
          {showPreview ? "Edit" : "Preview"}
        </button>
      </div>

      {!showPreview ? (
        <div className="space-y-6">
          {/* Invoice Details */}
          <SectionCard title="Invoice Details" icon={BuildingOfficeIcon}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Invoice Number</label>
                <input
                  value={form.invoiceNumber}
                  onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Invoice Date</label>
                <input
                  type="date"
                  value={form.invoiceDate}
                  onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Client *</label>
                <select
                  value={form.clientId}
                  onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800"
                >
                  <option value="">-- Select Client --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              </div>
            </div>
          </SectionCard>

          {/* Add Candidates */}
          <SectionCard title="Add Candidates" icon={MagnifyingGlassIcon}>
            <input
              placeholder="Search candidate by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${inputCls} mb-3`}
            />
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y">
              {candidates
                .filter((c) => c.name?.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((c) => {
                  const alreadyAdded = form.items.some((i) => i.candidateName === c.name);
                  return (
                    <div
                      key={c.id}
                      className={`flex justify-between items-center px-4 py-2 ${alreadyAdded ? "bg-gray-50 text-gray-400" : "hover:bg-blue-50 cursor-pointer"}`}
                      onClick={() => !alreadyAdded && handleAddCandidate(c)}
                    >
                      <div>
                        <p className="font-medium text-sm">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.position} — {c.client}</p>
                      </div>
                      {alreadyAdded ? (
                        <Badge variant="secondary">Added</Badge>
                      ) : (
                        <PlusIcon className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                  );
                })}
              {candidates.filter((c) => c.name?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                <p className="text-center text-gray-400 text-sm py-4">No candidates found</p>
              )}
            </div>
          </SectionCard>

          {/* Line Items */}
          {form.items.length > 0 && (
            <SectionCard title="Invoice Line Items" icon={CalculatorIcon}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="p-2 text-left">Candidate</th>
                      <th className="p-2 text-left">Role</th>
                      <th className="p-2 text-left">Join Date</th>
                      <th className="p-2 text-right">Annual Salary (₹)</th>
                      <th className="p-2 text-right">%</th>
                      <th className="p-2 text-right">Payment (₹)</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {form.items.map((item) => (
                      <tr key={item.id}>
                        <td className="p-2 font-medium">{item.candidateName}</td>
                        <td className="p-2 text-gray-600">{item.role}</td>
                        <td className="p-2">
                          <input
                            type="date"
                            value={item.joiningDate}
                            onChange={(e) => updateItem(item.id, "joiningDate", e.target.value)}
                            className="w-36 h-8 text-xs px-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={item.actualSalary}
                            onChange={(e) => updateItem(item.id, "actualSalary", parseFloat(e.target.value) || 0)}
                            className="w-32 h-8 text-xs text-right px-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={item.percentage}
                            onChange={(e) => updateItem(item.id, "percentage", parseFloat(e.target.value) || 0)}
                            className="w-20 h-8 text-xs text-right px-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="p-2 text-right font-semibold text-green-700">
                          ₹{item.payment.toLocaleString("en-IN")}
                        </td>
                        <td className="p-2">
                          <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-gray-800 font-bold">
                      <td colSpan={5} className="p-3 text-right">Total</td>
                      <td className="p-3 text-right text-green-700 text-base">₹{form.total.toLocaleString("en-IN")}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </SectionCard>
          )}
        </div>
      ) : (
        <div className="bg-gray-200 p-6">
          <PrintableInvoice form={form} selectedClient={selectedClient} />
          <button
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? "Downloading..." : "Download PDF"}
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminClientInvoice;

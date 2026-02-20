import React, { useState, useMemo, useEffect } from "react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const convertGroup = (n) => {
    if (n === 0) return "";
    if (n < 20) return a[n] + " ";
    if (n < 100) return b[Math.floor(n / 10)] + " " + a[n % 10] + " ";
    return a[Math.floor(n / 100)] + " Hundred " + convertGroup(n % 100);
  };

  if (num === 0) return "Zero";

  let output = "";
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;

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
      style={{
        width: "210mm",
        height: "297mm",
        margin: "0 auto",
        padding: 0,
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      <div className="flex justify-between items-start pt-12 px-12 pb-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="w-10 h-12 bg-gradient-to-br from-blue-700 to-blue-900 transform skew-x-[-10deg]" />
            <div>
              <h1 className="text-3xl font-bold text-[#0088CC] uppercase">
                VAGARIOUS
              </h1>
              <span className="text-sm font-bold text-[#0088CC] uppercase">
                SOLUTIONS PVT LTD
              </span>
            </div>
          </div>
        </div>
        <div
          className="absolute top-0 right-0 w-[200px] h-[100px] bg-[#00AEEF]"
          style={{ clipPath: "polygon(20% 0%, 100% 0, 100% 100%, 0% 100%)" }}
        />
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
          <h2 className="font-bold text-sm border border-black inline-block px-4 py-1">
            TAX INVOICE
          </h2>
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
                <td className="border p-1 text-right">
                  {item.actualSalary.toLocaleString("en-IN")}
                </td>
                <td className="border p-1">{item.percentage}%</td>
                <td className="border p-1 text-right">
                  {item.payment.toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
            <tr className="font-bold">
              <td colSpan={6} className="border p-2 text-center">
                Total
              </td>
              <td className="border p-2 text-right">
                {form.total.toLocaleString("en-IN")}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="text-xs mb-6">
          Amount in words:{" "}
          <span className="font-bold uppercase">
            {numberToWords(Math.round(form.total))}
          </span>
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

        if (resClients.ok) {
          const data = await resClients.json();
          setClients(data.map((c) => ({ ...c, id: c._id })));
        }

        if (resCandidates.ok) {
          const data = await resCandidates.json();
          setCandidates(data.map((c) => ({ ...c, id: c._id })));
        }
      } catch (e) {
        toast({ title: "Error", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === form.clientId),
    [clients, form.clientId]
  );

  useEffect(() => {
    const total = form.items.reduce((s, i) => s + i.payment, 0);
    setForm((p) => ({ ...p, subtotal: total, total }));
  }, [form.items]);

  const handleAddCandidate = (candidate) => {
    if (form.items.some((i) => i.candidateName === candidate.name)) return;

    const ctc =
      parseFloat(
        candidate.ctc ? candidate.ctc.replace(/[^0-9.]/g, "") : "0"
      ) * 100000 || 0;

    const newItem = {
      id: Date.now().toString(),
      candidateName: candidate.name,
      role: candidate.position || "N/A",
      joiningDate:
        candidate.joiningDate ||
        new Date().toISOString().split("T")[0],
      actualSalary: ctc,
      percentage: 8.33,
      payment: Math.round((ctc * 8.33) / 100),
    };

    setForm((p) => ({ ...p, items: [...p.items, newItem] }));
  };

  const removeItem = (id) =>
    setForm((p) => ({ ...p, items: p.items.filter((i) => i.id !== id) }));

  const updateItem = (id, field, value) => {
    setForm((p) => ({
      ...p,
      items: p.items.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: value };
        if (field === "actualSalary" || field === "percentage") {
          updated.payment = Math.round(
            (Number(updated.actualSalary) * Number(updated.percentage)) / 100
          );
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

  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar />

      <div className="flex-1 p-8">
        <div className="flex justify-between mb-6">
          <h1 className="text-3xl font-bold">Invoice Generator</h1>
          <Button onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? "Edit" : "Preview"}
          </Button>
        </div>

        {!showPreview ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              <select
                value={form.clientId}
                onChange={(e) =>
                  setForm({ ...form, clientId: e.target.value })
                }
              >
                <option value="">Select Client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>

              <Input
                placeholder="Search candidate"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              {candidates
                .filter((c) => c.name?.toLowerCase().includes(searchTerm))
                .map((c) => (
                  <div key={c.id} onClick={() => handleAddCandidate(c)}>
                    {c.name}
                  </div>
                ))}
            </CardContent>
          </Card>
        ) : (
          <div className="bg-gray-200 p-6">
            <PrintableInvoice
              form={form}
              selectedClient={selectedClient}
            />
            <Button
              className="mt-4"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              Download PDF
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminClientInvoice;
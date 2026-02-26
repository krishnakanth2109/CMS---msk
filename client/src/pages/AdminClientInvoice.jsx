import React, { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import {
  BuildingOfficeIcon,
  CalculatorIcon,
  MagnifyingGlassIcon,
  PlusIcon
} from "@heroicons/react/24/outline";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800";

/* ================= Helpers ================= */

const getOrdinalDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString("default", { month: "short" });
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
  let n = Math.floor(num);
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;

  if (crore > 0) output += convertGroup(crore) + "Crore ";
  if (lakh > 0) output += convertGroup(lakh) + "Lakh ";
  if (thousand > 0) output += convertGroup(thousand) + "Thousand ";
  if (n > 0) output += convertGroup(n);

  return output.trim() + " Rupees Only";
};

/* ================= Main Component ================= */

const SectionCard = ({ title, icon: Icon, children }) => (
  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm p-6 mb-6">
    <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
      <Icon className="h-5 w-5 text-blue-600" />
      {title}
    </h3>
    {children}
  </div>
);

const defaultAccountDetails = {
  accountNumber: "-000805022576",
  name: "Vagarious Solutions Pvt Ltd.",
  bank: "ICICI Bank",
  branch: "Begumpet Branch",
  ifsc: "ICICI0000183",
  pan: "AAHCV0176E",
  gst: "36AAHCV0176E1ZE"
};

const AdminClientInvoice = () => {
  const { toast } = useToast();
  const { authHeaders } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    invoiceDate: new Date().toISOString().split("T")[0],
    clientId: "",
    candidateName: "",
    joiningDate: "",
    role: "",
    actualSalary: "",
    percentage: "",
    payment: 0,
    accountType: "default",
    accountDetails: defaultAccountDetails,
  });

  const [showPreview, setShowPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");

  const getAuthHeader = async () => ({
    "Content-Type": "application/json",
    ...(await authHeaders()),
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const headers = await getAuthHeader();
        const [resClients, resCandidates] = await Promise.all([
          fetch(`${API_URL}/clients`, { headers }),
          fetch(`${API_URL}/candidates`, { headers }),
        ]);
        if (resClients.ok) setClients((await resClients.json()).map((c) => ({ ...c, id: c._id })));
        if (resCandidates.ok) setCandidates((await resCandidates.json()).map((c) => ({ ...c, id: c._id })));
      } catch {
        toast({ title: "Error fetching data", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAddCandidate = (candidate) => {
    const ctc = parseFloat(candidate.ctc ? candidate.ctc.replace(/[^0-9.]/g, "") : "0") * 100000 || 0;
    setForm(p => ({
      ...p,
      candidateName: candidate.name || "",
      role: candidate.position || "",
      joiningDate: candidate.joiningDate ? candidate.joiningDate.split('T')[0] : new Date().toISOString().split("T")[0],
      actualSalary: ctc,
      percentage: p.percentage || 8.33,
    }));
    toast({ title: `Auto-filled details for ${candidate.name}` });
  };

  const selectedClient = useMemo(() => clients.find((c) => c.id === form.clientId), [clients, form.clientId]);

  // Handle Payment Calculation
  useEffect(() => {
    const salary = parseFloat(form.actualSalary) || 0;
    const perc = parseFloat(form.percentage) || 0;
    const payment = Math.round((salary * perc) / 100);
    setForm(prev => ({ ...prev, payment }));
  }, [form.actualSalary, form.percentage]);

  /* PDF Generation Logic Using Exact Provided PDF as Background Template */
  const generateFilledPdf = async () => {
    setIsGenerating(true);
    try {
      // 1. Fetch the exact empty PDF provided
      const response = await fetch('/Empty_invoice.pdf');
      const existingPdfBytes = await response.arrayBuffer();

      // 2. Load the PDF into pdf-lib
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];

      const { height } = firstPage.getSize();
      // Assume A4 size, commonly standard height is ~841.89 points
      // pdf-lib's origin (0,0) is bottom-left.

      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const drawText = (text, x, y, size = 10, isBold = false) => {
        if (!text) return;
        firstPage.drawText(String(text), {
          x,
          y: height - y, // Invert Y to match regular top-down spacing
          size,
          color: rgb(0.1, 0.1, 0.1),
          font: isBold ? helveticaBold : helvetica,
        });
      };

      const drawTextCentered = (text, centerX, y, maxW, isBold = false) => {
        if (!text) return;
        const str = String(text);
        const font = isBold ? helveticaBold : helvetica;
        let sz = 10;
        let w = font.widthOfTextAtSize(str, sz);
        // Shrink font size linearly until perfectly fits inside column bounding box!
        while (w > maxW && sz > 4) {
          sz -= 0.5;
          w = font.widthOfTextAtSize(str, sz);
        }
        const x = centerX - (w / 2);
        firstPage.drawText(str, {
          x,
          y: height - y,
          size: sz,
          color: rgb(0.1, 0.1, 0.1),
          font,
        });
      };

      // == 3. MAP ALL THE DATA ONTO THE TEMPLATE COORDINATES ==
      // Note: Coordinates are estimated from standard layout and easily adjustable

      // -- Client details (Below 'To,') --
      drawText(selectedClient?.companyName || "", 68, 155, 11, true);
      // Display Contact Person neatly below company name if exists, adjusting coordinates automatically
      if (selectedClient?.contactPerson) {
        drawText(selectedClient.contactPerson, 68, 170, 10);
        drawText(selectedClient?.address || "", 68, 185, 10);
        if (selectedClient?.gstNumber) drawText(`GST : ${selectedClient.gstNumber}`, 68, 200, 10);
      } else {
        drawText(selectedClient?.address || "", 68, 170, 10);
        if (selectedClient?.gstNumber) drawText(`GST : ${selectedClient.gstNumber}`, 68, 185, 10);
      }

      // -- Date & Invoice Number --
      // 'Date:' baseline ends exact Y: 291.36, Set to 288 for exact strict typographic baseline match
      drawText(getOrdinalDate(form.invoiceDate), 412, 288, 10);
      drawText(`No: ${form.invoiceNumber}`, 485, 288, 10);

      // -- Table Row Start --
      const rowY = 384; // Exact vertical center baseline for Row 1

      // Centered Alignment Mapping ensuring strict boundaries based exactly on column headers
      // 1. S.no 
      drawTextCentered("1", 74.5, rowY, 20);
      // 2. Candidate Name (Split into two lines if it contains space)
      const candParts = (form.candidateName || "").trim().split(" ");
      if (candParts.length > 1) {
        const line1 = candParts.slice(0, Math.ceil(candParts.length / 2)).join(" ");
        const line2 = candParts.slice(Math.ceil(candParts.length / 2)).join(" ");
        drawTextCentered(line1, 138.5, rowY - 5, 85);
        drawTextCentered(line2, 138.5, rowY + 5, 85);
      } else {
        drawTextCentered(form.candidateName, 138.5, rowY, 85);
      }
      // 3. Role
      drawTextCentered(form.role, 220, rowY, 65);
      // 4. Joining Date
      const joinStr = form.joiningDate ? getOrdinalDate(form.joiningDate) : "";
      drawTextCentered(joinStr, 305, rowY, 70);
      // 5. Salary
      const salStr = form.actualSalary ? Number(form.actualSalary).toLocaleString("en-IN") : "";
      drawTextCentered(salStr, 379.5, rowY, 60);
      // 6. Percentage
      const percStr = form.percentage ? `${form.percentage}%` : "";
      drawTextCentered(percStr, 447, rowY, 50);
      // 7. Payment (Current row)
      const payStr = form.payment ? Number(form.payment).toLocaleString("en-IN") : "0";
      drawTextCentered(payStr, 517.5, rowY, 60);

      // -- Total Row --
      const totalY = 430; // Y position for the Total Payment (perfectly vertical center aligned)
      drawTextCentered(payStr, 517.5, totalY, 60, true);

      // -- In Words --
      // Set to 502 for exact strict typographic baseline match with label
      drawText(numberToWords(form.payment || 0).toUpperCase(), 122, 502, 10);

      // -- Account Details --
      // Label 'Account Details: -' is around Y=530 in our grid
      const accY = 545; // Start slightly below the label
      if (form.accountType !== "no") {
        drawText(`Account No. : ${form.accountDetails.accountNumber}`, 75, accY, 10, true);
        drawText(`Name : ${form.accountDetails.name}`, 75, accY + 15, 10, true);
        drawText(`Bank : ${form.accountDetails.bank}`, 75, accY + 30, 10, true);
        drawText(`Branch : ${form.accountDetails.branch}`, 75, accY + 45, 10, true);
        drawText(`IFSC Code : ${form.accountDetails.ifsc}`, 75, accY + 60, 10, true);
        drawText(`PAN No. : ${form.accountDetails.pan}`, 75, accY + 75, 10, true);
        drawText(`GST : ${form.accountDetails.gst}`, 75, accY + 90, 10, true);
      }

      // Strictly removed "Secondary Client Block below Account Details" 
      // preventing massive overlap with "Authorized Signature" at Y=652

      // 4. Save and return blob
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      return blob;

    } catch (error) {
      console.error("PDF Generation error:", error);
      toast({ title: "Failed to load/generate PDF template.", variant: "destructive" });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = async () => {
    if (showPreview) {
      setShowPreview(false);
      return;
    }
    const blob = await generateFilledPdf();
    if (blob) {
      setPdfPreviewUrl(URL.createObjectURL(blob));
      setShowPreview(true);
    }
  };

  const handleDownload = async () => {
    const blob = await generateFilledPdf();
    if (blob) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Invoice_${form.invoiceNumber}.pdf`;
      link.click();
    }
  };

  return (
    <div className="flex-1 p-8 h-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Invoice Generator</h1>
        <button
          onClick={handlePreview}
          disabled={isGenerating}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
        >
          {showPreview ? "Back to Edit Details" : (isGenerating ? "Processing..." : "Preview Exact PDF")}
        </button>
      </div>

      {!showPreview ? (
        <div className="max-w-5xl">
          {/* Invoice & Client Details */}
          <SectionCard title="Client Info" icon={BuildingOfficeIcon}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Client *</label>
                <select
                  value={form.clientId}
                  onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                  className={inputCls}
                >
                  <option value="">-- Choose a Client --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              </div>
            </div>
            {selectedClient && (
              <div className="mt-4 p-4 bg-gray-50 border rounded-lg text-sm text-gray-700">
                <p><strong>Company:</strong> {selectedClient.companyName}</p>
                <p><strong>Contact Person:</strong> {selectedClient.contactPerson || "N/A"}</p>
                <p><strong>Address:</strong> {selectedClient.address || "N/A"}</p>
                <p><strong>GST:</strong> {selectedClient.gstNumber || "N/A"}</p>
              </div>
            )}
          </SectionCard>

          {/* Invoice Financial Fields */}
          <SectionCard title="Invoice Financial Fields" icon={CalculatorIcon}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Candidate Name (Optional)</label>
                <input
                  type="text"
                  value={form.candidateName}
                  onChange={(e) => setForm({ ...form, candidateName: e.target.value })}
                  className={inputCls}
                  placeholder="E.g. John Doe"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Joining Date (Optional)</label>
                <input
                  type="date"
                  value={form.joiningDate}
                  onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Role</label>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className={inputCls}
                  placeholder="E.g. Software Engineer"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Actual Salary (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={form.actualSalary}
                  onChange={(e) => setForm({ ...form, actualSalary: e.target.value })}
                  className={inputCls}
                  placeholder="E.g. 500000"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.percentage}
                  onChange={(e) => setForm({ ...form, percentage: e.target.value })}
                  className={inputCls}
                  placeholder="E.g. 8.33"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Calculated Payment (₹)</label>
                <input
                  type="text"
                  readOnly
                  value={form.payment.toLocaleString('en-IN')}
                  className={`${inputCls} bg-gray-100 font-bold text-green-700 cursor-not-allowed`}
                />
              </div>

              {/* Account Details Dropdown */}
              <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-4 border-t pt-4 mt-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Account Details</label>
                  <select
                    value={form.accountType}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "default") {
                        setForm({ ...form, accountType: val, accountDetails: defaultAccountDetails });
                      } else {
                        setForm({ ...form, accountType: val, accountDetails: { accountNumber: "", name: "", bank: "", branch: "", ifsc: "", pan: "", gst: "" } });
                      }
                    }}
                    className={inputCls}
                  >
                    <option value="default">Default (Vagarious Solutions Pvt Ltd.)</option>
                    <option value="manual">Enter Manually</option>
                    <option value="no">NO</option>
                  </select>
                </div>

                {form.accountType === "manual" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <input placeholder="Account No." value={form.accountDetails.accountNumber} onChange={(e) => setForm({ ...form, accountDetails: { ...form.accountDetails, accountNumber: e.target.value } })} className={inputCls} />
                    <input placeholder="Name" value={form.accountDetails.name} onChange={(e) => setForm({ ...form, accountDetails: { ...form.accountDetails, name: e.target.value } })} className={inputCls} />
                    <input placeholder="Bank" value={form.accountDetails.bank} onChange={(e) => setForm({ ...form, accountDetails: { ...form.accountDetails, bank: e.target.value } })} className={inputCls} />
                    <input placeholder="Branch" value={form.accountDetails.branch} onChange={(e) => setForm({ ...form, accountDetails: { ...form.accountDetails, branch: e.target.value } })} className={inputCls} />
                    <input placeholder="IFSC Code" value={form.accountDetails.ifsc} onChange={(e) => setForm({ ...form, accountDetails: { ...form.accountDetails, ifsc: e.target.value } })} className={inputCls} />
                    <input placeholder="PAN No." value={form.accountDetails.pan} onChange={(e) => setForm({ ...form, accountDetails: { ...form.accountDetails, pan: e.target.value } })} className={inputCls} />
                    <input placeholder="GST" value={form.accountDetails.gst} onChange={(e) => setForm({ ...form, accountDetails: { ...form.accountDetails, gst: e.target.value } })} className={inputCls} />
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Add Candidates Section */}
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
                  const alreadyAdded = form.candidateName === c.name;
                  return (
                    <div
                      key={c.id}
                      className={`flex justify-between items-center px-4 py-3 ${alreadyAdded ? "bg-gray-50 text-gray-400" : "hover:bg-blue-50 cursor-pointer transition-colors"}`}
                      onClick={() => !alreadyAdded && handleAddCandidate(c)}
                    >
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{c.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{c.position || "No Role"} — {c.client || "No Client Assigned"}</p>
                      </div>
                      {alreadyAdded ? (
                        <Badge variant="secondary" className="bg-gray-200 text-gray-600">Added</Badge>
                      ) : (
                        <button className="flex items-center gap-1 text-blue-600 text-xs font-semibold hover:text-blue-800">
                          <PlusIcon className="h-4 w-4" />
                          Add
                        </button>
                      )}
                    </div>
                  );
                })}
              {candidates.filter((c) => c.name?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                <p className="text-center text-gray-400 text-sm py-4">No candidates found in database.</p>
              )}
            </div>
          </SectionCard>

          <div className="flex justify-end">
            <button
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition shadow-md text-lg disabled:opacity-50"
              onClick={handleDownload}
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : "Download Final PDF"}
            </button>
          </div>

        </div>
      ) : (
        <div className="h-[80vh] bg-gray-200 rounded-xl overflow-hidden flex flex-col justify-between border border-gray-300">
          {/* THE EXACT PDF EMBED PREVIEW */}
          {pdfPreviewUrl ? (
            <iframe
              src={pdfPreviewUrl}
              title="Invoice Exact PDF Preview"
              className="w-full h-full shadow-inner"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 font-medium font-sans">
              Generating precise PDF view...
            </div>
          )}
          <div className="p-4 bg-white border-t flex justify-end">
            <button
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition"
              onClick={handleDownload}
              disabled={isGenerating}
            >
              Download This Invoice
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClientInvoice;

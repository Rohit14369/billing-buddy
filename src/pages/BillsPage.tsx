import { useState, useEffect, useRef } from "react";
import { getBills, deleteBill, updateBill, getTotalPaidForBill, savePaymentRecord, getProducts, updateProduct } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Trash2, Search, Eye, IndianRupee, Pencil, Printer, RotateCcw, ArrowLeft, Users, FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import InvoicePrint from "@/components/InvoicePrint";
import type { BillData, BillItem } from "@/pages/BillingPage";
import * as XLSX from "xlsx";

interface Bill {
  _id: string;
  customerName: string;
  customerType: string;
  subtotal: number;
  total: number;
  items: any[];
  createdAt: string;
  invoiceNo?: string;
  mobile?: string;
  date?: string;
  paidAmount?: number;
  pendingAmount?: number;
  status?: string;
  hamali?: number;
  roundedOff?: number;
}

interface CustomerSummary {
  name: string;
  mobile: string;
  totalBills: number;
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
  bills: Bill[];
}

export default function BillsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);

  // Bill action states
  const [viewBill, setViewBill] = useState<Bill | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payBillId, setPayBillId] = useState("");
  const [payAmount, setPayAmount] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [editBill, setEditBill] = useState<Bill | null>(null);
  const [editPaid, setEditPaid] = useState(0);
  const [printBill, setPrintBill] = useState<BillData | null>(null);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnBill, setReturnBill] = useState<Bill | null>(null);
  const [returnItemIdx, setReturnItemIdx] = useState(0);
  const [returnQty, setReturnQty] = useState(0);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchBillsData = async () => {
    try {
      const data = await getBills();
      setBills(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBillsData(); }, []);

  const getBillPaid = (bill: Bill) => (bill.paidAmount || 0) + getTotalPaidForBill(bill._id);
  const getBillPending = (bill: Bill) => Math.max(0, (bill.total || 0) - getBillPaid(bill));
  const getBillStatus = (bill: Bill) => getBillPending(bill) > 0 ? "PENDING" : "PAID";

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });

  // Export customers to Excel
  const exportCustomersToExcel = () => {
    // Group bills by customer (name + mobile)
    const customers: CustomerSummary[] = (() => {
      const map = new Map<string, CustomerSummary>();
      bills.forEach(bill => {
        const key = `${(bill.customerName || "Unknown").toLowerCase().trim()}-${(bill.mobile || "").toLowerCase().trim()}`;
        if (!map.has(key)) {
          map.set(key, {
            name: bill.customerName || "Unknown",
            mobile: bill.mobile || "",
            totalBills: 0,
            totalAmount: 0,
            totalPaid: 0,
            totalPending: 0,
            bills: []
          });
        }
        const c = map.get(key)!;
        c.totalBills++;
        c.totalAmount += bill.total || 0;
        c.totalPaid += getBillPaid(bill);
        c.totalPending += getBillPending(bill);
        c.bills.push(bill);
      });
      return Array.from(map.values());
    })();

    if (customers.length === 0) {
      toast({ title: "No Data", description: "No customers to export", variant: "warning" });
      return;
    }

    // Prepare data for Excel
    const data = customers.map(customer => ({
      "Customer Name": customer.name,
      "Mobile": customer.mobile || "N/A",
      "Total Bills": customer.totalBills,
      "Total Amount (₹)": customer.totalAmount.toFixed(2),
      "Total Paid (₹)": customer.totalPaid.toFixed(2),
      "Total Pending (₹)": customer.totalPending.toFixed(2),
      "Status": customer.totalPending > 0 ? "PENDING" : "PAID",
      "Last Bill Date": customer.bills.length > 0 ?
        formatDate(customer.bills[customer.bills.length - 1].createdAt || "") : "N/A"
    }));

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");

    // Generate Excel file
    XLSX.writeFile(workbook, `Customers_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "Exported!", description: "Customers Excel file downloaded successfully" });
  };

  // Group bills by customer (name + mobile)
  const customers: CustomerSummary[] = (() => {
    const map = new Map<string, CustomerSummary>();
    bills.forEach(bill => {
      const key = `${(bill.customerName || "Unknown").toLowerCase().trim()}-${(bill.mobile || "").toLowerCase().trim()}`;
      if (!map.has(key)) {
        map.set(key, {
          name: bill.customerName || "Unknown",
          mobile: bill.mobile || "",
          totalBills: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalPending: 0,
          bills: []
        });
      }
      const c = map.get(key)!;
      c.totalBills++;
      c.totalAmount += bill.total || 0;
      c.totalPaid += getBillPaid(bill);
      c.totalPending += getBillPending(bill);
      c.bills.push(bill);
    });
    return Array.from(map.values());
  })();

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.mobile.toLowerCase().includes(search.toLowerCase())
  );

  // Bill actions
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this bill?")) return;
    try {
      await deleteBill(id);
      toast({ title: "Bill deleted" });
      fetchBillsData();
      if (selectedCustomer) {
        setSelectedCustomer(prev => prev ? { ...prev, bills: prev.bills.filter(b => b._id !== id) } : null);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleAddPayment = () => {
    if (payAmount <= 0) return;
    savePaymentRecord({ billId: payBillId, amount: payAmount, date: new Date().toISOString() });
    toast({ title: "Payment Recorded", description: `₹${payAmount} received` });
    setPaymentOpen(false);
    setPayAmount(0);
    fetchBillsData();
  };

  const openEditBill = (bill: Bill) => {
    setEditBill({ ...bill });
    setEditPaid(getBillPaid(bill));
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editBill) return;
    try {
      const payload = {
        customerName: editBill.customerName,
        mobile: editBill.mobile,
        paidAmount: editPaid,
        pendingAmount: Math.max(0, (editBill.total || 0) - editPaid),
        status: editPaid >= (editBill.total || 0) ? "PAID" : "PENDING",
      };
      await updateBill(editBill._id, payload);
      toast({ title: "Bill Updated" });
      setEditOpen(false);
      fetchBillsData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handlePrintBill = (bill: Bill) => {
    const items: BillItem[] = (bill.items || []).filter((i: any) => i.category !== 'charges').map((i: any, idx: number) => ({
      id: String(idx), productName: i.productName || "", quantity: i.quantity || 1,
      grossWeightKg: i.grossWeightKg || 0, grossWeightGm: i.grossWeightGm || 0,
      lessWeightKg: i.lessWeightKg || 0, lessWeightGm: i.lessWeightGm || 0,
      unit: i.unit || "Kgs", rate: i.price || 0,
      netWeight: i.netWeight || i.quantity || 0, amount: i.total || 0,
    }));
    const bd: BillData = {
      partyName: bill.customerName, date: bill.date || bill.createdAt || "",
      mobile: bill.mobile || "", invoiceNo: bill.invoiceNo || "", items,
      hamali: bill.hamali || 0, roundedOff: bill.roundedOff || 0,
      subtotal: bill.subtotal || bill.total || 0, grandTotal: bill.total || 0,
    };
    setPrintBill(bd);
    setTimeout(() => window.print(), 300);
  };

  const handleReturn = async () => {
    if (!returnBill || returnQty <= 0) return;
    const items = (returnBill.items || []).filter((i: any) => i.category !== 'charges');
    const item = items[returnItemIdx];
    if (!item) return;
    try {
      const products = await getProducts();
      const product = (Array.isArray(products) ? products : []).find((p: any) => p.name.toLowerCase() === (item.productName || "").toLowerCase());
      if (product) {
        const restockGrams = returnQty * 1000;
        await updateProduct(product._id, { stock: (product.stock || 0) + restockGrams });
      }
      const rate = item.price || 0;
      const returnAmount = returnQty * rate;
      const updatedItems = [...returnBill.items];
      const realIdx = updatedItems.findIndex((i: any) => i.productName === item.productName && i.category !== 'charges');
      if (realIdx >= 0) {
        updatedItems[realIdx] = {
          ...updatedItems[realIdx],
          quantity: Math.max(0, (updatedItems[realIdx].quantity || 0) - returnQty),
          netWeight: Math.max(0, (updatedItems[realIdx].netWeight || 0) - returnQty),
          total: Math.max(0, (updatedItems[realIdx].total || 0) - returnAmount),
        };
      }
      const newTotal = Math.max(0, (returnBill.total || 0) - returnAmount);
      const paid = getBillPaid(returnBill);
      await updateBill(returnBill._id, {
        items: updatedItems, total: newTotal,
        pendingAmount: Math.max(0, newTotal - paid),
        status: paid >= newTotal ? "PAID" : "PENDING",
      });
      toast({ title: "Return Processed", description: `${returnQty} KG of ${item.productName} returned. ₹${returnAmount.toFixed(2)} adjusted.` });
      setReturnOpen(false);
      setReturnQty(0);
      fetchBillsData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  function renderDialogs() {
    return (
      <>
        {/* View Bill Dialog */}
        <Dialog open={!!viewBill} onOpenChange={(open) => { if (!open) setViewBill(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Bill Details</DialogTitle>
            </DialogHeader>
            {viewBill && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Party:</span> <strong>{viewBill.customerName}</strong></div>
                  <div><span className="text-muted-foreground">Invoice:</span> <strong>{viewBill.invoiceNo || "-"}</strong></div>
                  <div><span className="text-muted-foreground">Date:</span> {formatDate(viewBill.createdAt || viewBill.date || "")}</div>
                  <div><span className="text-muted-foreground">Mobile:</span> {viewBill.mobile || "-"}</div>
                </div>
                <div className="border-t border-border pt-2">
                  <h4 className="font-semibold mb-1">Items:</h4>
                  {(viewBill.items || []).filter((i: any) => i.category !== 'charges').map((item: any, idx: number) => (
                    <div key={idx} className="py-0.5">
                      <div className="flex justify-between">
                        <span className="font-medium">{item.productName}</span>
                        <span className="font-mono">₹{(item.total || 0).toFixed(2)}</span>
                      </div>
                      {(item.grossWeightKg > 0 || item.grossWeightGm > 0) && (
                        <div className="text-xs text-muted-foreground">
                          {((item.grossWeightKg || 0) + (item.grossWeightGm || 0)/1000).toFixed(1)}-{((item.lessWeightKg || 0) + (item.lessWeightGm || 0)/1000).toFixed(1)} = {(item.netWeight || item.quantity || 0).toFixed(2)} {item.unit || 'Kgs'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-2 space-y-1">
                  <div className="flex justify-between"><span>Total:</span><span className="font-mono font-bold">₹{viewBill.total?.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Paid:</span><span className="font-mono text-success">₹{getBillPaid(viewBill).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Pending:</span><span className="font-mono text-destructive">₹{getBillPending(viewBill).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Status:</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${getBillStatus(viewBill) === 'PAID' ? 'badge-success' : 'badge-danger'}`}>
                      {getBillStatus(viewBill)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Bill Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Edit Bill</DialogTitle>
            </DialogHeader>
            {editBill && (
              <div className="space-y-3">
                <div><Label>Customer Name</Label><Input value={editBill.customerName} onChange={(e) => setEditBill({ ...editBill, customerName: e.target.value })} className="input-focus" /></div>
                <div><Label>Mobile</Label><Input value={editBill.mobile || ""} onChange={(e) => setEditBill({ ...editBill, mobile: e.target.value })} className="input-focus" /></div>
                <div><Label>Total: ₹{editBill.total?.toFixed(2)}</Label></div>
                <div><Label>Paid Amount (₹)</Label><Input type="number" value={editPaid || ""} onChange={(e) => setEditPaid(Number(e.target.value))} className="input-focus" /></div>
                <Button onClick={handleEditSave} className="w-full gradient-primary text-primary-foreground">Save Changes</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Record Payment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Payment Amount (₹)</Label><Input type="number" value={payAmount || ""} onChange={(e) => setPayAmount(Number(e.target.value))} min={1} className="input-focus" /></div>
              <Button onClick={handleAddPayment} className="w-full gradient-primary text-primary-foreground">Record Payment</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Return Dialog */}
        <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Return Product</DialogTitle></DialogHeader>
            {returnBill && (
              <div className="space-y-3">
                <div>
                  <Label>Select Item</Label>
                  <select value={returnItemIdx} onChange={(e) => setReturnItemIdx(Number(e.target.value))} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
                    {(returnBill.items || []).filter((i: any) => i.category !== 'charges').map((item: any, idx: number) => (
                      <option key={idx} value={idx}>{item.productName} (Qty: {item.quantity || item.netWeight})</option>
                    ))}
                  </select>
                </div>
                <div><Label>Return Quantity (KG)</Label><Input type="number" value={returnQty || ""} onChange={(e) => setReturnQty(Number(e.target.value))} min={0.01} step="0.01" className="input-focus" /></div>
                <Button onClick={handleReturn} className="w-full gradient-primary text-primary-foreground">Process Return</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Customer history view
  if (selectedCustomer) {
    const key = `${selectedCustomer.name.toLowerCase().trim()}-${selectedCustomer.mobile.toLowerCase().trim()}`;
    const customerBills = bills.filter(b =>
      `${(b.customerName || "").toLowerCase().trim()}-${(b.mobile || "").toLowerCase().trim()}` === key
    );
    const totalAmount = customerBills.reduce((s, b) => s + (b.total || 0), 0);
    const totalPaid = customerBills.reduce((s, b) => s + getBillPaid(b), 0);
    const totalPending = customerBills.reduce((s, b) => s + getBillPending(b), 0);

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="page-header text-xl sm:text-2xl md:text-3xl">
              {selectedCustomer.name} {selectedCustomer.mobile && `(${selectedCustomer.mobile})`}
            </h1>
            <p className="text-sm text-muted-foreground">Customer History — {customerBills.length} invoice(s)</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-xl font-bold font-mono">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Total Paid</p>
            <p className="text-xl font-bold font-mono text-success">₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="stat-card">
            <p className="text-sm text-muted-foreground">Total Pending</p>
            <p className="text-xl font-bold font-mono text-destructive">₹{totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        {/* Invoices table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="gradient-primary text-primary-foreground">
                  <th className="px-3 py-3 text-center font-semibold">Invoice</th>
                  <th className="px-3 py-3 text-center font-semibold">Date</th>
                  <th className="px-3 py-3 text-right font-semibold">Total (₹)</th>
                  <th className="px-3 py-3 text-right font-semibold">Paid (₹)</th>
                  <th className="px-3 py-3 text-right font-semibold">Pending (₹)</th>
                  <th className="px-3 py-3 text-center font-semibold">Status</th>
                  <th className="px-3 py-3 text-center font-semibold w-36">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customerBills.map((bill) => {
                  const paid = getBillPaid(bill);
                  const pending = getBillPending(bill);
                  const billStatus = getBillStatus(bill);
                  return (
                    <tr key={bill._id} className="border-b border-border table-row-hover">
                      <td className="px-3 py-3 text-center font-mono">{bill.invoiceNo || "-"}</td>
                      <td className="px-3 py-3 text-center text-muted-foreground">{formatDate(bill.date || bill.createdAt || "")}</td>
                      <td className="px-3 py-3 text-right font-mono font-medium">₹{bill.total?.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right font-mono text-success">₹{paid.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right font-mono text-destructive">₹{pending.toFixed(2)}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${billStatus === 'PAID' ? 'badge-success' : 'badge-danger'}`}>
                          {billStatus}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setViewBill(bill)} className="text-muted-foreground hover:text-primary transition-colors p-1" title="View"><Eye size={14} /></button>
                          <button onClick={() => openEditBill(bill)} className="text-muted-foreground hover:text-primary transition-colors p-1" title="Edit"><Pencil size={14} /></button>
                          <button onClick={() => handlePrintBill(bill)} className="text-muted-foreground hover:text-primary transition-colors p-1" title="Print"><Printer size={14} /></button>
                          <button onClick={() => { setReturnBill(bill); setReturnItemIdx(0); setReturnQty(0); setReturnOpen(true); }} className="text-muted-foreground hover:text-warning transition-colors p-1" title="Return"><RotateCcw size={14} /></button>
                          {pending > 0 && (
                            <button onClick={() => { setPayBillId(bill._id); setPaymentOpen(true); }} className="text-muted-foreground hover:text-success transition-colors p-1" title="Pay"><IndianRupee size={14} /></button>
                          )}
                          <button onClick={() => handleDelete(bill._id)} className="text-muted-foreground hover:text-destructive transition-colors p-1" title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {renderDialogs()}

        <div className="print-area" ref={printRef}>
          {printBill && <InvoicePrint bill={printBill} />}
        </div>
      </div>
    );
  }

  // Main customers list view with Excel export button
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="page-header text-xl sm:text-2xl md:text-3xl">Customers</h1>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/billing")} className="gradient-primary text-primary-foreground hover-glow">
            New Bill
          </Button>
          <Button
            onClick={exportCustomersToExcel}
            variant="outline"
            className="gap-1"
            disabled={customers.length === 0}
          >
            <FileSpreadsheet size={16} /> Export to Excel
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers by name or mobile..." className="pl-10 input-focus" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users size={48} className="mx-auto mb-3 opacity-40" />
          <p>No customers found</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="gradient-primary text-primary-foreground">
                  <th className="px-3 py-3 text-left font-semibold">Customer Name</th>
                  <th className="px-3 py-3 text-center font-semibold">Mobile</th>
                  <th className="px-3 py-3 text-center font-semibold">Invoices</th>
                  <th className="px-3 py-3 text-right font-semibold">Total (₹)</th>
                  <th className="px-3 py-3 text-right font-semibold">Paid (₹)</th>
                  <th className="px-3 py-3 text-right font-semibold">Pending (₹)</th>
                  <th className="px-3 py-3 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => {
                  const status = c.totalPending > 0 ? "PENDING" : "PAID";
                  return (
                    <tr key={`${c.name}-${c.mobile}`} className="border-b border-border table-row-hover cursor-pointer" onClick={() => setSelectedCustomer(c)}>
                      <td className="px-3 py-3 font-medium text-primary hover:underline">{c.name}</td>
                      <td className="px-3 py-3 text-center font-mono">{c.mobile || "-"}</td>
                      <td className="px-3 py-3 text-center font-mono">{c.totalBills}</td>
                      <td className="px-3 py-3 text-right font-mono font-medium">₹{c.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-3 text-right font-mono text-success">₹{c.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-3 text-right font-mono text-destructive">₹{c.totalPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${status === 'PAID' ? 'badge-success' : 'badge-danger'}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {renderDialogs()}

      <div className="print-area" ref={printRef}>
        {printBill && <InvoicePrint bill={printBill} />}
      </div>
    </div>
  );
}

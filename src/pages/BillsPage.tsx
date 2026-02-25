import { useState, useEffect } from "react";
import { getBills, deleteBill, getTotalPaidForBill, savePaymentRecord } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Trash2, Search, Eye, IndianRupee } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

export default function BillsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewBill, setViewBill] = useState<Bill | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payBillId, setPayBillId] = useState("");
  const [payAmount, setPayAmount] = useState(0);

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

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this bill?")) return;
    try {
      await deleteBill(id);
      toast({ title: "Bill deleted" });
      fetchBillsData();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const getBillPaid = (bill: Bill) => {
    const backendPaid = bill.paidAmount || 0;
    const localPaid = getTotalPaidForBill(bill._id);
    return backendPaid + localPaid;
  };

  const getBillPending = (bill: Bill) => {
    return Math.max(0, (bill.total || 0) - getBillPaid(bill));
  };

  const getBillStatus = (bill: Bill) => {
    return getBillPending(bill) > 0 ? "PENDING" : "PAID";
  };

  const handleAddPayment = () => {
    if (payAmount <= 0) return;
    savePaymentRecord({
      billId: payBillId,
      amount: payAmount,
      date: new Date().toISOString(),
    });
    toast({ title: "Payment Recorded", description: `₹${payAmount} received` });
    setPaymentOpen(false);
    setPayAmount(0);
    // Force re-render
    setBills([...bills]);
  };

  const filtered = bills.filter(b => {
    const q = search.toLowerCase();
    return (b.customerName || "").toLowerCase().includes(q) ||
      (b.invoiceNo || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="page-header text-xl sm:text-2xl md:text-3xl">Bills</h1>
        <Button onClick={() => navigate("/billing")} className="gradient-primary text-primary-foreground hover-glow">New Bill</Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by customer or invoice..." className="pl-10 input-focus" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading bills...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText size={48} className="mx-auto mb-3 opacity-40" />
          <p>No bills found</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="gradient-primary text-primary-foreground">
                  <th className="px-3 py-3 text-left font-semibold">Party</th>
                  <th className="px-3 py-3 text-center font-semibold">Invoice</th>
                  <th className="px-3 py-3 text-right font-semibold">Total (₹)</th>
                  <th className="px-3 py-3 text-right font-semibold">Paid (₹)</th>
                  <th className="px-3 py-3 text-right font-semibold">Pending (₹)</th>
                  <th className="px-3 py-3 text-center font-semibold">Status</th>
                  <th className="px-3 py-3 text-center font-semibold">Date</th>
                  <th className="px-3 py-3 text-center font-semibold w-28">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((bill) => {
                  const paid = getBillPaid(bill);
                  const pending = getBillPending(bill);
                  const billStatus = getBillStatus(bill);
                  return (
                    <tr key={bill._id} className="border-b border-border table-row-hover">
                      <td className="px-3 py-3 font-medium">{bill.customerName}</td>
                      <td className="px-3 py-3 text-center text-muted-foreground">{bill.invoiceNo || "-"}</td>
                      <td className="px-3 py-3 text-right font-mono font-medium">₹{bill.total?.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right font-mono text-success">₹{paid.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right font-mono text-destructive">₹{pending.toFixed(2)}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${billStatus === 'PAID' ? 'badge-success' : 'badge-danger'}`}>
                          {billStatus}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-muted-foreground">{formatDate(bill.createdAt || bill.date || "")}</td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setViewBill(bill)} className="text-muted-foreground hover:text-primary transition-colors p-1" title="View">
                            <Eye size={14} />
                          </button>
                          {pending > 0 && (
                            <button onClick={() => { setPayBillId(bill._id); setPaymentOpen(true); }} className="text-muted-foreground hover:text-success transition-colors p-1" title="Add Payment">
                              <IndianRupee size={14} />
                            </button>
                          )}
                          <button onClick={() => handleDelete(bill._id)} className="text-muted-foreground hover:text-destructive transition-colors p-1" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                  <div key={idx} className="flex justify-between py-0.5">
                    <span>{item.productName} (×{item.quantity || item.netWeight})</span>
                    <span className="font-mono">₹{(item.total || 0).toFixed(2)}</span>
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

      {/* Add Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Payment Amount (₹)</Label>
              <Input type="number" value={payAmount || ""} onChange={(e) => setPayAmount(Number(e.target.value))} min={1} className="input-focus" />
            </div>
            <Button onClick={handleAddPayment} className="w-full gradient-primary text-primary-foreground">Record Payment</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from "react";
import { getBills, getTotalPaidForBill, savePaymentRecord } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, IndianRupee, ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Bill {
  _id: string;
  customerName: string;
  total: number;
  createdAt: string;
  invoiceNo?: string;
  date?: string;
  paidAmount?: number;
  items?: any[];
}

interface CustomerPending {
  name: string;
  bills: Bill[];
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
}

export default function PendingPage() {
  const { toast } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payBillId, setPayBillId] = useState("");
  const [payAmount, setPayAmount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    getBills()
      .then((data) => setBills(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getBillPaid = (bill: Bill) => {
    return (bill.paidAmount || 0) + getTotalPaidForBill(bill._id);
  };

  const getBillPending = (bill: Bill) => {
    return Math.max(0, (bill.total || 0) - getBillPaid(bill));
  };

  // Group by customer, only those with pending > 0
  const customerMap = new Map<string, CustomerPending>();
  bills.forEach((bill) => {
    const pending = getBillPending(bill);
    if (pending <= 0) return;
    const name = bill.customerName || "Unknown";
    if (!customerMap.has(name)) {
      customerMap.set(name, { name, bills: [], totalAmount: 0, totalPaid: 0, totalPending: 0 });
    }
    const c = customerMap.get(name)!;
    c.bills.push(bill);
    c.totalAmount += bill.total || 0;
    c.totalPaid += getBillPaid(bill);
    c.totalPending += pending;
  });

  const customers = Array.from(customerMap.values()).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });

  const handleAddPayment = () => {
    if (payAmount <= 0) return;
    savePaymentRecord({ billId: payBillId, amount: payAmount, date: new Date().toISOString() });
    toast({ title: "Payment Recorded", description: `₹${payAmount} received` });
    setPaymentOpen(false);
    setPayAmount(0);
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="space-y-6" key={refreshKey}>
      <h1 className="page-header text-xl sm:text-2xl md:text-3xl">Pending Payments</h1>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer..." className="pl-10 input-focus" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <IndianRupee size={48} className="mx-auto mb-3 opacity-40" />
          <p>No pending payments</p>
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => (
            <div key={customer.name} className="glass-card overflow-hidden animate-slide-up">
              <button
                onClick={() => setExpandedCustomer(expandedCustomer === customer.name ? null : customer.name)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="text-left">
                  <h3 className="font-semibold text-base">{customer.name}</h3>
                  <p className="text-xs text-muted-foreground">{customer.bills.length} bill(s)</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <p className="font-mono font-bold text-destructive">₹{customer.totalPending.toFixed(2)}</p>
                  </div>
                  {expandedCustomer === customer.name ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {expandedCustomer === customer.name && (
                <div className="border-t border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="px-3 py-2 text-left text-xs">Date</th>
                        <th className="px-3 py-2 text-left text-xs">Invoice</th>
                        <th className="px-3 py-2 text-right text-xs">Total</th>
                        <th className="px-3 py-2 text-right text-xs">Paid</th>
                        <th className="px-3 py-2 text-right text-xs">Pending</th>
                        <th className="px-3 py-2 text-center text-xs">Status</th>
                        <th className="px-3 py-2 text-center text-xs">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customer.bills.map((bill) => {
                        const paid = getBillPaid(bill);
                        const pending = getBillPending(bill);
                        return (
                          <tr key={bill._id} className="border-b border-border/50 table-row-hover">
                            <td className="px-3 py-2">{formatDate(bill.createdAt || bill.date || "")}</td>
                            <td className="px-3 py-2">{bill.invoiceNo || "-"}</td>
                            <td className="px-3 py-2 text-right font-mono">₹{bill.total?.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-mono text-success">₹{paid.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-mono text-destructive">₹{pending.toFixed(2)}</td>
                            <td className="px-3 py-2 text-center">
                              <span className="badge-danger text-xs font-bold">PENDING</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => { setPayBillId(bill._id); setPaymentOpen(true); }}
                                className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              >
                                Pay
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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

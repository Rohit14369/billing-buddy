import { useState, useEffect } from "react";
import { getBills, deleteBill } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Bill {
  _id: string;
  customerName: string;
  customerType: string;
  subtotal: number;
  total: number;
  items: any[];
  createdAt: string;
}

export default function BillsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBillsData = async () => {
    try {
      const data = await getBills();
      setBills(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillsData();
  }, []);

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
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Bills</h1>
        <Button onClick={() => navigate("/billing")}>New Bill</Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading bills...</div>
      ) : bills.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText size={48} className="mx-auto mb-3 opacity-40" />
          <p>No bills yet</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="px-4 py-3 text-left font-semibold">Party</th>
                <th className="px-4 py-3 text-center font-semibold">Items</th>
                <th className="px-4 py-3 text-right font-semibold">Total (₹)</th>
                <th className="px-4 py-3 text-center font-semibold">Date</th>
                <th className="px-4 py-3 text-center font-semibold w-20">Action</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill._id} className="border-b border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{bill.customerName}</td>
                  <td className="px-4 py-3 text-center">{bill.items?.length || 0}</td>
                  <td className="px-4 py-3 text-right font-mono">₹ {bill.total?.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{formatDate(bill.createdAt)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleDelete(bill._id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

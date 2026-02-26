import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createBill, getBills, getProducts, updateProduct } from "@/lib/api";
import { Printer, Plus, Trash2, Save } from "lucide-react";
import InvoicePrint from "@/components/InvoicePrint";

export interface BillItem {
  id: string;
  productName: string;
  quantity: number;
  grossWeightKg: number;
  grossWeightGm: number;
  lessWeightKg: number;
  lessWeightGm: number;
  unit: "Kgs" | "Gms";
  rate: number;
  netWeight: number;
  amount: number;
}

export interface BillData {
  partyName: string;
  date: string;
  mobile: string;
  invoiceNo: string;
  items: BillItem[];
  hamali: number;
  roundedOff: number;
  subtotal: number;
  grandTotal: number;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function calcNetWeight(item: Partial<BillItem>): number {
  const grossKg = Number(item.grossWeightKg) || 0;
  const grossGm = Number(item.grossWeightGm) || 0;
  const lessKg = Number(item.lessWeightKg) || 0;
  const lessGm = Number(item.lessWeightGm) || 0;
  const grossTotal = grossKg + grossGm / 1000;
  const lessTotal = lessKg + lessGm / 1000;
  return Math.max(0, grossTotal - lessTotal);
}

function calcAmount(netWeight: number, rate: number): number {
  return parseFloat((netWeight * rate).toFixed(2));
}

// Updated calcQuantity function to return integer
function calcQuantity(netWeight: number, unit: "Kgs" | "Gms"): number {
  const quantity = unit === "Kgs" ? netWeight : netWeight * 1000;
  return Math.round(quantity); // Round to nearest integer
}

const emptyItem = (): BillItem => ({
  id: generateId(),
  productName: "",
  quantity: 0,
  grossWeightKg: 0,
  grossWeightGm: 0,
  lessWeightKg: 0,
  lessWeightGm: 0,
  unit: "Kgs",
  rate: 0,
  netWeight: 0,
  amount: 0,
});

export default function BillingPage() {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [showPrint, setShowPrint] = useState(false);

  const [partyName, setPartyName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [mobile, setMobile] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [items, setItems] = useState<BillItem[]>([emptyItem()]);
  const [hamali, setHamali] = useState<number>(0);
  const [roundedOff, setRoundedOff] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);

  useEffect(() => {
    getBills()
      .then((data) => {
        const bills = Array.isArray(data) ? data : [];
        const maxNum = bills.reduce((max: number, b: any) => {
          const inv = b.invoiceNo || "";
          const num = parseInt(inv.replace(/\D/g, ""), 10);
          return isNaN(num) ? max : Math.max(max, num);
        }, 0);
        setInvoiceNo(String(maxNum + 1));
      })
      .catch(() => {
        setInvoiceNo(String(Date.now()).slice(-6));
      });
  }, []);

  const updateItem = (id: string, field: keyof BillItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        updated.netWeight = calcNetWeight(updated);
        updated.quantity = calcQuantity(updated.netWeight, updated.unit);
        updated.amount = calcAmount(updated.netWeight, updated.rate);
        return updated;
      })
    );
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
  const grandTotal = subtotal + (Number(hamali) || 0) + (Number(roundedOff) || 0);
  const pendingAmount = Math.max(0, grandTotal - (Number(paidAmount) || 0));
  const status = pendingAmount > 0 ? "PENDING" : "PAID";

  const billData: BillData = {
    partyName,
    date,
    mobile,
    invoiceNo,
    items,
    hamali: Number(hamali) || 0,
    roundedOff: Number(roundedOff) || 0,
    subtotal,
    grandTotal,
  };

  const handleSave = async () => {
    if (!partyName.trim()) {
      toast({ title: "Error", description: "Party name is required", variant: "destructive" });
      return;
    }
    if (items.some((i) => !i.productName.trim())) {
      toast({ title: "Error", description: "All products must have a name", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const backendItems: any[] = items.map((i) => ({
        productName: i.productName,
        category: "general",
        price: i.rate,
        quantity: parseFloat(i.netWeight.toFixed(3)),
        total: i.amount,
        grossWeightKg: i.grossWeightKg,
        grossWeightGm: i.grossWeightGm,
        lessWeightKg: i.lessWeightKg,
        lessWeightGm: i.lessWeightGm,
        unit: i.unit,
        netWeight: parseFloat(i.netWeight.toFixed(3)),
      }));

      if (hamali > 0) {
        backendItems.push({ productName: "Hamali", category: "charges", price: hamali, quantity: 1, total: hamali });
      }
      if (roundedOff !== 0) {
        backendItems.push({ productName: "Rounded Off", category: "charges", price: roundedOff, quantity: 1, total: roundedOff });
      }

      const payload = {
        customerName: partyName,
        customerType: "normal",
        discount: 0,
        items: backendItems,
        invoiceNo,
        mobile,
        date,
        hamali: Number(hamali) || 0,
        roundedOff: Number(roundedOff) || 0,
        paidAmount: Number(paidAmount) || 0,
        pendingAmount,
        status,
      };

      await createBill(payload);

      try {
        const allProducts = await getProducts();
        const productsList = Array.isArray(allProducts) ? allProducts : [];
        for (const item of items) {
          const product = productsList.find(
            (p: any) => p.name?.toLowerCase() === item.productName.toLowerCase()
          );
          if (product && product.stock !== undefined) {
            const deductGrams = item.netWeight * 1000;
            const newStock = Math.max(0, (product.stock || 0) - deductGrams);
            await updateProduct(product._id, { stock: newStock });
          } else {
            console.warn(`Product not found or stock undefined for: ${item.productName}`);
          }
        }
      } catch (stockErr) {
        console.error("Stock deduction error:", stockErr);
        toast({
          title: "Warning",
          description: "Failed to update stock for some products. Check console for details.",
          variant: "warning",
        });
      }

      if (paidAmount > 0) {
        try {
          const { savePaymentRecord } = await import("@/lib/api");
          await savePaymentRecord({
            billId: invoiceNo,
            customerName: partyName,
            amount: Number(paidAmount),
            date: new Date().toISOString(),
          });
        } catch (paymentErr) {
          console.error("Payment record error:", paymentErr);
          toast({
            title: "Warning",
            description: "Failed to save payment record. Check console for details.",
            variant: "warning",
          });
        }
      }

      toast({ title: "Bill Saved!", description: `Bill for ${partyName} created. Status: ${status}` });
      setShowPrint(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    setShowPrint(true);
    setTimeout(() => window.print(), 300);
  };

  const resetForm = () => {
    setPartyName("");
    setDate(new Date().toISOString().split("T")[0]);
    setMobile("");
    setItems([emptyItem()]);
    setHamali(0);
    setRoundedOff(0);
    setPaidAmount(0);
    setShowPrint(false);
    getBills()
      .then((data) => {
        const bills = Array.isArray(data) ? data : [];
        const maxNum = bills.reduce((max: number, b: any) => {
          const inv = b.invoiceNo || "";
          const num = parseInt(inv.replace(/\D/g, ""), 10);
          return isNaN(num) ? max : Math.max(max, num);
        }, 0);
        setInvoiceNo(String(maxNum + 1));
      })
      .catch(() => {
        setInvoiceNo(String(Date.now()).slice(-6));
      });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ... (rest of the UI code remains the same) */}
      <div className="glass-card overflow-hidden animate-slide-up" style={{ animationDelay: "100ms" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {/* ... (table header remains the same) */}
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className="border-b border-border table-row-hover">
                  {/* ... (other table cells remain the same) */}
                  <td className="px-1 py-1">
                    <Input
                      type="number"
                      value={Math.round(item.quantity)} // Display as integer
                      readOnly
                      className="h-8 text-sm text-center border-0 bg-transparent focus-visible:ring-1"
                    />
                  </td>
                  {/* ... (rest of the table cells remain the same) */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* ... (rest of the UI code remains the same) */}
      </div>
      {/* ... (rest of the UI code remains the same) */}
    </div>
  );
}

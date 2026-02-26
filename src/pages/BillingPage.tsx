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

function calcQuantity(netWeight: number, unit: "Kgs" | "Gms"): number {
  const quantity = unit === "Kgs" ? netWeight : netWeight * 1000;
  return parseFloat(quantity.toFixed(2));
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="page-header text-xl sm:text-2xl md:text-3xl">New Bill</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={resetForm}>
            New
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1">
            <Printer size={14} /> Print
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="gradient-primary text-primary-foreground hover-glow gap-1"
          >
            <Save size={14} /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Bill Header */}
      <div className="glass-card p-4 animate-slide-up">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            // Estimate Copy //
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="w-20 text-sm font-medium shrink-0">Party:</Label>
              <Input
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="Party name"
                className="input-focus"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="w-20 text-sm font-medium shrink-0">Date:</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-focus"
              />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="w-20 text-sm font-medium shrink-0">Inv. No.:</Label>
              <Input
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="Auto-generated"
                className="input-focus"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="w-20 text-sm font-medium shrink-0">Mob:</Label>
              <Input
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Mobile number"
                className="input-focus"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="glass-card overflow-hidden animate-slide-up" style={{ animationDelay: "100ms" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="gradient-primary text-primary-foreground">
                <th className="px-2 py-2 text-left font-semibold w-10">SN.</th>
                <th className="px-2 py-2 text-left font-semibold min-w-[140px]">Goods Supplied</th>
                <th className="px-2 py-2 text-center font-semibold w-16">Qty</th>
                <th className="px-2 py-2 text-center font-semibold" colSpan={2}>
                  Gross Weight
                </th>
                <th className="px-2 py-2 text-center font-semibold" colSpan={2}>
                  Less Weight
                </th>
                <th className="px-2 py-2 text-center font-semibold w-20">Net Wt.</th>
                <th className="px-2 py-2 text-center font-semibold w-16">Unit</th>
                <th className="px-2 py-2 text-center font-semibold w-20">Rate</th>
                <th className="px-2 py-2 text-right font-semibold w-24">Amount (₹)</th>
                <th className="px-2 py-2 w-10"></th>
              </tr>
              <tr className="bg-primary/10 text-xs text-muted-foreground">
                <th></th>
                <th></th>
                <th></th>
                <th className="px-2 py-1 text-center">KG</th>
                <th className="px-2 py-1 text-center">Gm</th>
                <th className="px-2 py-1 text-center">KG</th>
                <th className="px-2 py-1 text-center">Gm</th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className="border-b border-border table-row-hover">
                  <td className="px-2 py-1.5 text-center text-muted-foreground">{idx + 1}</td>
                  <td className="px-1 py-1">
                    <div>
                      <Input
                        value={item.productName}
                        onChange={(e) => updateItem(item.id, "productName", e.target.value)}
                        placeholder="Product name"
                        className="h-8 text-sm border-0 bg-transparent focus-visible:ring-1"
                      />
                      {(item.lessWeightKg > 0 || item.lessWeightGm > 0) && (
                        <span className="text-[10px] text-muted-foreground ml-1">
                          {(item.grossWeightKg + item.grossWeightGm / 1000).toFixed(1)}-
                          {(item.lessWeightKg + item.lessWeightGm / 1000).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      type="number"
                      value={item.quantity.toFixed(2)}
                      readOnly
                      className="h-8 text-sm text-center border-0 bg-transparent focus-visible:ring-1"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      type="number"
                      value={item.grossWeightKg || ""}
                      onChange={(e) => updateItem(item.id, "grossWeightKg", Number(e.target.value))}
                      className="h-8 text-sm text-center border-0 bg-transparent focus-visible:ring-1 w-16"
                      step="0.01"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      type="number"
                      value={item.grossWeightGm || ""}
                      onChange={(e) => updateItem(item.id, "grossWeightGm", Number(e.target.value))}
                      className="h-8 text-sm text-center border-0 bg-transparent focus-visible:ring-1 w-16"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      type="number"
                      value={item.lessWeightKg || ""}
                      onChange={(e) => updateItem(item.id, "lessWeightKg", Number(e.target.value))}
                      className="h-8 text-sm text-center border-0 bg-transparent focus-visible:ring-1 w-16"
                      step="0.01"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      type="number"
                      value={item.lessWeightGm || ""}
                      onChange={(e) => updateItem(item.id, "lessWeightGm", Number(e.target.value))}
                      className="h-8 text-sm text-center border-0 bg-transparent focus-visible:ring-1 w-16"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center font-mono text-sm font-medium">
                    {item.netWeight.toFixed(2)}
                  </td>
                  <td className="px-1 py-1">
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, "unit", e.target.value as "Kgs" | "Gms")}
                      className="h-8 text-sm bg-transparent border-0 text-center w-16 rounded focus:ring-1 focus:ring-ring"
                    >
                      <option value="Kgs">Kgs</option>
                      <option value="Gms">Gms</option>
                    </select>
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      type="number"
                      value={item.rate || ""}
                      onChange={(e) => updateItem(item.id, "rate", Number(e.target.value))}
                      className="h-8 text-sm text-center border-0 bg-transparent focus-visible:ring-1 w-20"
                      step="0.01"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-sm font-medium">
                    {item.amount.toFixed(2)}
                  </td>
                  <td className="px-1 py-1">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-muted-foreground hover:text-destructive p-1"
                      disabled={items.length <= 1}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
            <Plus size={14} /> Add Item
          </Button>
        </div>
      </div>

      {/* Totals & Payment */}
      <div className="glass-card p-4 animate-slide-up" style={{ animationDelay: "200ms" }}>
        <div className="max-w-sm ml-auto space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal:</span>
            <span className="font-mono font-medium">₹ {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm text-muted-foreground shrink-0">Add: Hamali</Label>
            <Input
              type="number"
              value={hamali || ""}
              onChange={(e) => setHamali(Number(e.target.value))}
              className="h-8 w-28 text-right text-sm input-focus"
              step="0.01"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm text-muted-foreground shrink-0">Add: Rounded Off</Label>
            <Input
              type="number"
              value={roundedOff || ""}
              onChange={(e) => setRoundedOff(Number(e.target.value))}
              className="h-8 w-28 text-right text-sm input-focus"
              step="0.01"
            />
          </div>
          <div className="border-t border-border pt-2 flex justify-between text-base font-bold">
            <span>Grand Total:</span>
            <span className="font-mono">₹ {grandTotal.toFixed(2)}</span>
          </div>
          <div className="border-t border-border pt-2 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm font-medium shrink-0">Paid Amount:</Label>
              <Input
                type="number"
                value={paidAmount || ""}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                className="h-8 w-28 text-right text-sm input-focus"
                step="0.01"
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pending:</span>
              <span
                className={`font-mono font-medium ${
                  pendingAmount > 0 ? "text-destructive" : "text-success"
                }`}
              >
                ₹ {pendingAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  status === "PAID" ? "badge-success" : "badge-danger"
                }`}
              >
                {status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Goods exchange/Complaint only accepted within 8 days of billed date only
      </p>

      <div className="print-area" ref={printRef}>
        {showPrint && <InvoicePrint bill={billData} />}
      </div>
    </div>
  );
}

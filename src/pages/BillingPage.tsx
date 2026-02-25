import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createBill } from "@/lib/api";
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

const emptyItem = (): BillItem => ({
  id: generateId(),
  productName: "",
  quantity: 1,
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

  const updateItem = (id: string, field: keyof BillItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        updated.netWeight = calcNetWeight(updated);
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
      // Map to backend schema: quantity=netWeight, price=rate, total=amount
      // Add hamali and roundedOff as separate items so they're included in subtotal
      const backendItems: any[] = items.map((i) => ({
        productName: i.productName,
        category: "general",
        price: i.rate,
        quantity: parseFloat(i.netWeight.toFixed(3)),
        total: i.amount,
      }));

      if (hamali > 0) {
        backendItems.push({
          productName: "Hamali",
          category: "charges",
          price: hamali,
          quantity: 1,
          total: hamali,
        });
      }
      if (roundedOff !== 0) {
        backendItems.push({
          productName: "Rounded Off",
          category: "charges",
          price: roundedOff,
          quantity: 1,
          total: roundedOff,
        });
      }

      const payload = {
        customerName: partyName,
        customerType: "normal",
        discount: 0,
        items: backendItems,
      };

      await createBill(payload);
      toast({ title: "Bill Saved!", description: `Bill for ${partyName} created.` });
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">New Bill</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer size={16} /> Print
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? "Saving..." : "Save Bill"}
          </Button>
        </div>
      </div>

      {/* Bill Header */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-foreground">// Estimate Copy //</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="w-20 text-sm font-medium shrink-0">Party:</Label>
              <Input value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder="Party name" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="w-20 text-sm font-medium shrink-0">Date:</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="w-20 text-sm font-medium shrink-0">Inv. No.:</Label>
              <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Invoice number" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="w-20 text-sm font-medium shrink-0">Mob:</Label>
              <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile number" />
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="px-2 py-2 text-left font-semibold w-10">SN.</th>
                <th className="px-2 py-2 text-left font-semibold min-w-[140px]">Goods Supplied</th>
                <th className="px-2 py-2 text-center font-semibold w-16">Qty</th>
                <th className="px-2 py-2 text-center font-semibold" colSpan={2}>Gross Weight</th>
                <th className="px-2 py-2 text-center font-semibold" colSpan={2}>Less Weight</th>
                <th className="px-2 py-2 text-center font-semibold w-20">Net Wt.</th>
                <th className="px-2 py-2 text-center font-semibold w-16">Unit</th>
                <th className="px-2 py-2 text-center font-semibold w-20">Rate</th>
                <th className="px-2 py-2 text-right font-semibold w-24">Amount (₹)</th>
                <th className="px-2 py-2 w-10"></th>
              </tr>
              <tr className="bg-muted/50 border-b border-border text-xs text-muted-foreground">
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
                <tr key={item.id} className="border-b border-border hover:bg-muted/30">
                  <td className="px-2 py-1.5 text-center text-muted-foreground">{idx + 1}</td>
                  <td className="px-1 py-1">
                    <Input
                      value={item.productName}
                      onChange={(e) => updateItem(item.id, "productName", e.target.value)}
                      placeholder="Product name"
                      className="h-8 text-sm border-0 bg-transparent focus-visible:ring-1"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      type="number"
                      value={item.quantity || ""}
                      onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                      className="h-8 text-sm text-center border-0 bg-transparent focus-visible:ring-1"
                      min={1}
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
                      onChange={(e) => updateItem(item.id, "unit", e.target.value)}
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
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus size={14} /> Add Item
          </Button>
        </div>
      </div>

      {/* Totals */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="max-w-xs ml-auto space-y-2">
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
              className="h-8 w-28 text-right text-sm"
              step="0.01"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm text-muted-foreground shrink-0">Add: Rounded Off</Label>
            <Input
              type="number"
              value={roundedOff || ""}
              onChange={(e) => setRoundedOff(Number(e.target.value))}
              className="h-8 w-28 text-right text-sm"
              step="0.01"
            />
          </div>
          <div className="border-t border-border pt-2 flex justify-between text-base font-bold">
            <span>Grand Total:</span>
            <span className="font-mono">₹ {grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Goods exchange/Complaint only accepted within 8 days of billed date only
      </p>

      {/* Print Area */}
      <div className="print-area" ref={printRef}>
        {showPrint && <InvoicePrint bill={billData} />}
      </div>
    </div>
  );
}

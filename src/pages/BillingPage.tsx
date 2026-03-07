import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { createBill, getBills, getProducts, updateProduct } from "@/lib/api";
import { Printer, Plus, Trash2, Save } from "lucide-react";
import InvoicePrint from "@/components/InvoicePrint";

interface Product {
  _id: string;
  name: string;
  stock?: number;
  stockKg: number;
  stockGm: number;
  code: string;
  category?: string;
  bagWeight?: number;
}

export interface BillItem {
  id: string;
  productName: string;
  hsnCode: string;
  quantity: number;
  bags: number;
  bagWeight: number;
  grossWeightKg: number;
  grossWeightGm: number;
  lessWeightKg: number;
  lessWeightGm: number;
  unit: "Kgs" | "Gms";
  rate: number;
  netWeight: number;
  amount: number;
  gstPercent: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalWithGst: number;
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
  gstEnabled: boolean;
  gstNumber: string;
  panNumber: string;
  buyerGstin: string;
  state: string;
  totalGstAmount: number;
  totalCgst: number;
  totalSgst: number;
  paidAmount: number;
  pendingAmount: number;
  status: string;
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
  return Math.round(unit === "Kgs" ? netWeight : netWeight * 1000);
}

const emptyItem = (): BillItem => ({
  id: generateId(),
  productName: "",
  hsnCode: "",
  quantity: 1,
  bags: 0,
  bagWeight: 0,
  grossWeightKg: 0,
  grossWeightGm: 0,
  lessWeightKg: 0,
  lessWeightGm: 0,
  unit: "Kgs",
  rate: 0,
  netWeight: 0,
  amount: 0,
  gstPercent: 0,
  gstAmount: 0,
  cgstAmount: 0,
  sgstAmount: 0,
  totalWithGst: 0,
});

export default function BillingPage() {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const [partyName, setPartyName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [mobile, setMobile] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [items, setItems] = useState<BillItem[]>([emptyItem()]);
  const [hamali, setHamali] = useState<number>(0);
  const [roundedOff, setRoundedOff] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [buyerGstin, setBuyerGstin] = useState("");
  const [state, setState] = useState("");

  const GST_NUMBER = "27ABJPS0885K1Z0";
  const PAN_NUMBER = "ABJPS0885K";

  useEffect(() => {
    getProducts()
      .then((data) => setAllProducts(Array.isArray(data) ? data : []))
      .catch((err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }));
  }, []);

  useEffect(() => {
    if (!productSearch.trim()) {
      setFilteredProducts([]);
      return;
    }
    let filtered = allProducts.filter(p =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.code || "").toLowerCase().includes(productSearch.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [productSearch, allProducts]);

  // Generate separate numbering for GST (INV-XXXX) and Estimate (1, 2, 3...)
  useEffect(() => {
    getBills()
      .then((data) => {
        const bills = Array.isArray(data) ? data : [];
        generateInvoiceNo(bills, gstEnabled);
      })
      .catch(() => {
        setInvoiceNo(gstEnabled ? "INV-1001" : "1");
      });
  }, [gstEnabled]);

  const generateInvoiceNo = (bills: any[], isGst: boolean) => {
    if (isGst) {
      const prefix = "INV-";
      const relevantBills = bills.filter((b: any) => (b.invoiceNo || "").startsWith(prefix));
      const maxNum = relevantBills.reduce((max: number, b: any) => {
        const num = parseInt((b.invoiceNo || "").replace(prefix, ""), 10);
        return isNaN(num) ? max : Math.max(max, num);
      }, 1000);
      setInvoiceNo(`${prefix}${maxNum + 1}`);
    } else {
      // Estimate: simple 1, 2, 3... numbering
      const relevantBills = bills.filter((b: any) => {
        const inv = b.invoiceNo || "";
        return !inv.startsWith("INV-");
      });
      const maxNum = relevantBills.reduce((max: number, b: any) => {
        const num = parseInt(b.invoiceNo || "", 10);
        return isNaN(num) ? max : Math.max(max, num);
      }, 0);
      setInvoiceNo(`${maxNum + 1}`);
    }
  };

  const updateItem = (id: string, field: keyof BillItem, value: any) => {
    if (field === "productName") {
      setProductSearch(value);
      setActiveItemId(id);
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "bags") {
          const numBags = Number(value) || 0;
          const bw = Number(updated.bagWeight) || 0;
          const totalWeight = numBags * bw;
          const wholeKg = Math.floor(totalWeight);
          const remainGm = Math.round((totalWeight - wholeKg) * 1000);
          updated.grossWeightKg = wholeKg;
          updated.grossWeightGm = remainGm;
          updated.lessWeightKg = 0;
          updated.lessWeightGm = 0;
        }
        updated.netWeight = calcNetWeight(updated);
        updated.quantity = calcQuantity(updated.netWeight, updated.unit);
        updated.amount = calcAmount(updated.netWeight, updated.rate);
        const gstPct = Number(updated.gstPercent) || 0;
        updated.gstAmount = parseFloat((updated.amount * gstPct / 100).toFixed(2));
        updated.cgstAmount = parseFloat((updated.gstAmount / 2).toFixed(2));
        updated.sgstAmount = parseFloat((updated.gstAmount / 2).toFixed(2));
        updated.totalWithGst = parseFloat((updated.amount + updated.gstAmount).toFixed(2));
        return updated;
      })
    );
  };

  const handleProductSelect = (product: Product, itemId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        return { ...item, productName: product.name, bagWeight: product.bagWeight || 0 };
      })
    );
    setProductSearch("");
    setActiveItemId(null);
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
  const totalGstAmount = gstEnabled ? items.reduce((sum, i) => sum + i.gstAmount, 0) : 0;
  const totalCgst = gstEnabled ? items.reduce((sum, i) => sum + i.cgstAmount, 0) : 0;
  const totalSgst = gstEnabled ? items.reduce((sum, i) => sum + i.sgstAmount, 0) : 0;
  const grandTotal = subtotal + totalGstAmount + (Number(hamali) || 0) + (Number(roundedOff) || 0);
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
    gstEnabled,
    gstNumber: GST_NUMBER,
    panNumber: PAN_NUMBER,
    buyerGstin,
    state,
    totalGstAmount,
    totalCgst,
    totalSgst,
    paidAmount: Number(paidAmount) || 0,
    pendingAmount,
    status,
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

    try {
      const allProds = await getProducts();
      const productsList = Array.isArray(allProds) ? allProds : [];

      for (const item of items) {
        const product = productsList.find(
          (p: any) => p.name?.toLowerCase() === item.productName.toLowerCase()
        );
        if (!product) {
          toast({ title: "Error", description: `Product "${item.productName}" not found`, variant: "destructive" });
          return;
        }
        const totalStockGrams = ((product.stockKg || 0) * 1000) + (product.stockGm || 0);
        const grossWeight = (item.grossWeightKg || 0) + (item.grossWeightGm || 0) / 1000;
        const requiredGrams = grossWeight * 1000;
        if (totalStockGrams < requiredGrams) {
          toast({ title: "Error", description: `Not enough stock for "${item.productName}"`, variant: "destructive" });
          return;
        }
      }

      setSaving(true);
      const backendItems: any[] = items.map((i) => ({
        productName: i.productName,
        hsnCode: i.hsnCode,
        category: "general",
        price: i.rate,
        quantity: parseFloat(i.netWeight.toFixed(3)),
        total: gstEnabled ? i.totalWithGst : i.amount,
        grossWeightKg: i.grossWeightKg,
        grossWeightGm: i.grossWeightGm,
        lessWeightKg: i.lessWeightKg,
        lessWeightGm: i.lessWeightGm,
        unit: i.unit,
        netWeight: parseFloat(i.netWeight.toFixed(3)),
        gstPercent: gstEnabled ? i.gstPercent : 0,
        gstAmount: gstEnabled ? i.gstAmount : 0,
        cgstAmount: gstEnabled ? i.cgstAmount : 0,
        sgstAmount: gstEnabled ? i.sgstAmount : 0,
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
        gstEnabled,
        gstNumber: gstEnabled ? GST_NUMBER : "",
        panNumber: gstEnabled ? PAN_NUMBER : "",
        buyerGstin: gstEnabled ? buyerGstin : "",
        state: gstEnabled ? state : "",
        totalGstAmount,
        totalCgst,
        totalSgst,
      };

      await createBill(payload);

      try {
        for (const item of items) {
          const product = productsList.find(
            (p: any) => p.name?.toLowerCase() === item.productName.toLowerCase()
          );
          if (product && product._id) {
            const grossWeight = (item.grossWeightKg || 0) + (item.grossWeightGm || 0) / 1000;
            const deductGrams = grossWeight * 1000;
            const totalStockGrams = ((product.stockKg || 0) * 1000) + (product.stockGm || 0);
            const newStockGrams = Math.max(0, totalStockGrams - deductGrams);
            const newStockKg = Math.floor(newStockGrams / 1000);
            const newStockGm = newStockGrams % 1000;
            await updateProduct(product._id, {
              stockKg: newStockKg,
              stockGm: newStockGm,
            });
          }
        }
      } catch (stockErr) {
        console.error("Stock deduction error:", stockErr);
        toast({ title: "Warning", description: "Failed to update stock for some products.", variant: "destructive" });
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
    setTimeout(() => {
      const origTitle = document.title;
      document.title = "Billing Receipt Generated Successfully.";
      window.print();
      document.title = origTitle;
    }, 300);
  };

  const resetForm = () => {
    setPartyName("");
    setDate(new Date().toISOString().split("T")[0]);
    setMobile("");
    setItems([emptyItem()]);
    setHamali(0);
    setRoundedOff(0);
    setPaidAmount(0);
    setBuyerGstin("");
    setState("");
    setShowPrint(false);
    getBills()
      .then((data) => {
        const bills = Array.isArray(data) ? data : [];
        generateInvoiceNo(bills, gstEnabled);
      })
      .catch(() => {
        setInvoiceNo(gstEnabled ? "INV-1001" : "1");
      });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="page-header text-xl sm:text-2xl md:text-3xl">New Bill</h1>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="flex items-center gap-2 mr-2">
            <Label className="text-sm font-medium">GST</Label>
            <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
          </div>
          <Button variant="outline" size="sm" onClick={resetForm}>New</Button>
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
          {gstEnabled ? (
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Subject to Nanded Jurisdiction</p>
              <div className="flex items-center justify-center gap-3 mb-1">
                <img src="/logo.jpeg" alt="Sadik Traders" className="h-10 w-10 rounded-full object-cover" />
                <div>
                  <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                    SADIK TRADERS
                  </h2>
                  <p className="text-[10px] text-muted-foreground">KIRANA MERCHANT & COMMISSION AGENT</p>
                  <p className="text-[10px] text-muted-foreground">Old Mondha, Nanded - 431604 (M.S.)</p>
                </div>
              </div>
              <div className="flex justify-center gap-6 text-xs text-muted-foreground mt-1">
                <span>GST NO: <strong className="text-foreground">{GST_NUMBER}</strong></span>
                <span>PAN NO: <strong className="text-foreground">{PAN_NUMBER}</strong></span>
              </div>
              <p className="text-sm font-semibold text-foreground mt-2">// Tax Invoice //</p>
            </div>
          ) : (
            <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
              // Estimate Copy //
            </h2>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="w-20 text-sm font-medium shrink-0">Name:</Label>
              <Input value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder="Party name" className="input-focus" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="w-20 text-sm font-medium shrink-0">Date:</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-focus" />
            </div>
            {gstEnabled && (
              <div className="flex items-center gap-2">
                <Label className="w-20 text-sm font-medium shrink-0">Buyer GSTIN:</Label>
                <Input value={buyerGstin} onChange={(e) => setBuyerGstin(e.target.value)} placeholder="Buyer's GSTIN" className="input-focus" />
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Label className="w-20 text-sm font-medium shrink-0">{gstEnabled ? "Invoice No.:" : "No.:"}</Label>
              <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Auto-generated" className="input-focus" />
            </div>
            <div className="flex items-center gap-2">
              <Label className="w-20 text-sm font-medium shrink-0">Mobile:</Label>
              <Input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile number" className="input-focus" />
            </div>
            {gstEnabled && (
              <div className="flex items-center gap-2">
                <Label className="w-20 text-sm font-medium shrink-0">State:</Label>
                <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className="input-focus" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="glass-card overflow-visible animate-slide-up relative z-10" style={{ animationDelay: "100ms" }}>
        <div className="overflow-x-auto" style={{ overflow: "visible" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="gradient-primary text-primary-foreground">
                <th className="px-2 py-2 text-left font-semibold w-10">SN.</th>
                <th className="px-2 py-2 text-left font-semibold min-w-[140px]">Particulars</th>
                {gstEnabled && <th className="px-2 py-2 text-center font-semibold w-20">HSN Code</th>}
                <th className="px-2 py-2 text-center font-semibold w-14">Bags</th>
                <th className="px-2 py-2 text-center font-semibold w-16">Qty</th>
                <th className="px-2 py-2 text-center font-semibold" colSpan={2}>Gross Weight</th>
                <th className="px-2 py-2 text-center font-semibold" colSpan={2}>Less Weight</th>
                <th className="px-2 py-2 text-center font-semibold w-20">Net Wt.</th>
                <th className="px-2 py-2 text-center font-semibold w-16">Unit</th>
                <th className="px-2 py-2 text-center font-semibold w-20">Rate</th>
                {gstEnabled && <th className="px-2 py-2 text-center font-semibold w-16">GST%</th>}
                <th className="px-2 py-2 text-right font-semibold w-24">Amount (₹)</th>
                <th className="px-2 py-2 w-10"></th>
              </tr>
              <tr className="bg-primary/10 text-xs text-muted-foreground">
                <th></th>
                <th></th>
                {gstEnabled && <th></th>}
                <th></th>
                <th></th>
                <th className="px-2 py-1 text-center">KG</th>
                <th className="px-2 py-1 text-center">Gm</th>
                <th className="px-2 py-1 text-center">KG</th>
                <th className="px-2 py-1 text-center">Gm</th>
                <th></th>
                <th></th>
                <th></th>
                {gstEnabled && <th></th>}
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} className="border-b border-border table-row-hover">
                  <td className="px-2 py-1.5 text-center text-muted-foreground">{idx + 1}</td>
                  <td className="px-1 py-1">
                    <div className="relative">
                      <Input
                        value={item.productName}
                        onChange={(e) => updateItem(item.id, "productName", e.target.value)}
                        onFocus={() => setActiveItemId(item.id)}
                        placeholder="Product name"
                        className="h-8 text-sm border-0 bg-transparent focus-visible:ring-1"
                      />
                      {productSearch && filteredProducts.length > 0 && activeItemId === item.id && (
                        <div className="absolute z-[9999] w-full mt-1 bg-background border border-border rounded-md shadow-xl max-h-48 overflow-y-auto">
                          {filteredProducts.map((product) => (
                            <div
                              key={product._id}
                              className="p-2 cursor-pointer hover:bg-accent hover:text-accent-foreground text-sm"
                              onClick={() => handleProductSelect(product, item.id)}
                            >
                              <span className="font-medium">{product.name}</span>
                              {product.code && <span className="text-xs text-muted-foreground ml-1">({product.code})</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      {(item.lessWeightKg > 0 || item.lessWeightGm > 0) && (
                        <span className="text-[10px] text-muted-foreground ml-1">
                          {(item.grossWeightKg + item.grossWeightGm/1000).toFixed(1)}-
                          {(item.lessWeightKg + item.lessWeightGm/1000).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </td>
                  {gstEnabled && (
                    <td className="px-1 py-1">
                      <Input
                        value={item.hsnCode}
                        onChange={(e) => updateItem(item.id, "hsnCode", e.target.value)}
                        className="h-8 text-sm text-center border-0 bg-transparent focus-visible:ring-1 w-20"
                        placeholder="HSN"
                      />
                    </td>
                  )}
                  <td className="px-1 py-1">
                    {item.bagWeight > 0 ? (
                      <Input
                        type="number"
                        value={item.bags || ""}
                        onChange={(e) => updateItem(item.id, "bags", Number(e.target.value))}
                        className="h-8 text-sm text-center border-0 bg-transparent focus-visible:ring-1 w-14"
                        placeholder="Bags"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground px-1">-</span>
                    )}
                  </td>
                  <td className="px-1 py-1">
                    <Input
                      type="number"
                      value={Math.round(item.quantity)}
                      onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                      className="h-8 text-sm text-center border-0 bg-transparent focus-visible:ring-1"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <Input type="number" value={item.grossWeightKg || ""} onChange={(e) => updateItem(item.id, "grossWeightKg", Number(e.target.value))} className="h-8 text-sm text-center border-0 bg-transparent focus-visible:ring-1 w-16" step="0.01" />
                  </td>
                  <td className="px-1 py-1">
                    <Input type="number" value={item.grossWeightGm || ""} onChange={(e) => updateItem(item.id, "grossWeightGm", Number(e.target.value))} className="h-8 text-sm text-center border-0 bg-transparent focus-visible:ring-1 w-16" />
                  </td>
                  <td className="px-1 py-1">
                    <Input type="number" value={item.lessWeightKg || ""} onChange={(e) => updateItem(item.id, "lessWeightKg", Number(e.target.value))} className="h-8 text-sm text-center border-0 bg-transparent focus-visible:ring-1 w-16" step="0.01" />
                  </td>
                  <td className="px-1 py-1">
                    <Input type="number" value={item.lessWeightGm || ""} onChange={(e) => updateItem(item.id, "lessWeightGm", Number(e.target.value))} className="h-8 text-sm text-center border-0 bg-transparent focus-visible:ring-1 w-16" />
                  </td>
                  <td className="px-2 py-1.5 text-center font-mono text-sm font-medium">{item.netWeight.toFixed(2)}</td>
                  <td className="px-1 py-1">
                    <select value={item.unit} onChange={(e) => updateItem(item.id, "unit", e.target.value as "Kgs" | "Gms")} className="h-8 text-sm bg-transparent border-0 text-center w-16 rounded focus:ring-1 focus:ring-ring">
                      <option value="Kgs">Kgs</option>
                      <option value="Gms">Gms</option>
                    </select>
                  </td>
                  <td className="px-1 py-1">
                    <Input type="number" value={item.rate || ""} onChange={(e) => updateItem(item.id, "rate", Number(e.target.value))} className="h-8 text-sm text-center border-0 bg-transparent focus-visible:ring-1 w-20" step="0.01" />
                  </td>
                  {gstEnabled && (
                    <td className="px-1 py-1">
                      <Input type="number" value={item.gstPercent || ""} onChange={(e) => updateItem(item.id, "gstPercent", Number(e.target.value))} className="h-8 text-sm text-center border-0 bg-transparent focus-visible:ring-1 w-16" step="0.01" placeholder="%" />
                    </td>
                  )}
                  <td className="px-2 py-1.5 text-right font-mono text-sm font-medium">
                    {gstEnabled ? item.totalWithGst.toFixed(2) : item.amount.toFixed(2)}
                  </td>
                  <td className="px-1 py-1">
                    <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive p-1" disabled={items.length <= 1}>
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
      <div className="glass-card p-4 animate-slide-up relative z-0" style={{ animationDelay: "200ms" }}>
        <div className="max-w-sm ml-auto space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Amount Before Tax:</span>
            <span className="font-mono font-medium">₹ {subtotal.toFixed(2)}</span>
          </div>
          {gstEnabled && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Add: CGST:</span>
                <span className="font-mono font-medium">₹ {totalCgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Add: SGST:</span>
                <span className="font-mono font-medium">₹ {totalSgst.toFixed(2)}</span>
              </div>
            </>
          )}
          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm text-muted-foreground shrink-0">Add: Hamali</Label>
            <Input type="number" value={hamali || ""} onChange={(e) => setHamali(Number(e.target.value))} className="h-8 w-28 text-right text-sm input-focus" step="0.01" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm text-muted-foreground shrink-0">Round Off</Label>
            <Input type="number" value={roundedOff || ""} onChange={(e) => setRoundedOff(Number(e.target.value))} className="h-8 w-28 text-right text-sm input-focus" step="0.01" />
          </div>
          <div className="border-t border-border pt-2 flex justify-between text-base font-bold">
            <span>{gstEnabled ? "Total Amount After Tax:" : "Grand Total:"}</span>
            <span className="font-mono">₹ {grandTotal.toFixed(2)}</span>
          </div>
          <div className="border-t border-border pt-2 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm font-medium shrink-0">Paid Amount:</Label>
              <Input type="number" value={paidAmount || ""} onChange={(e) => setPaidAmount(Number(e.target.value))} className="h-8 w-28 text-right text-sm input-focus" step="0.01" />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pending:</span>
              <span className={`font-mono font-medium ${pendingAmount > 0 ? "text-destructive" : "text-success"}`}>
                ₹ {pendingAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${status === "PAID" ? "badge-success" : "badge-danger"}`}>
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

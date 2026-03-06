import { useState, useEffect } from "react";
import { getProducts, createProduct, updateProduct, deleteProduct } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Package, Pencil, Search } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

interface Product {
  _id: string;
  name: string;
  buyingPrice: number;
  normalPrice: number;
  retailerPrice: number;
  stockKg: number;
  stockGm: number;
  category: string;
  code: string;
  image: string;
  bagWeight?: number;
}

const emptyForm = {
  name: "",
  category: "",
  code: "",
  image: "",
  normalPrice: "",
  retailerPrice: "",
  buyingPrice: "",
  stockKg: "",
  stockGm: "",
  bags: "",
  bagWeightKg: "",
  bagWeightGm: "",
};

export default function ProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  // Combined bag weight in KG (decimal)
  const getBagWeightDecimal = (bwKg?: string, bwGm?: string) => {
    return (Number(bwKg) || 0) + (Number(bwGm) || 0) / 1000;
  };

  // Auto-calculate stock KG and Gm from bags
  const recalcBagTotal = (bags: string, bwKg: string, bwGm: string) => {
    const numBags = Number(bags) || 0;
    const bagWt = getBagWeightDecimal(bwKg, bwGm);
    const totalKg = numBags * bagWt;
    const wholeKg = Math.floor(totalKg);
    const remainGm = Math.round((totalKg - wholeKg) * 1000);
    return { stockKg: String(wholeKg), stockGm: String(remainGm) };
  };

  const handleBagsChange = (bags: string) => {
    const stock = recalcBagTotal(bags, form.bagWeightKg, form.bagWeightGm);
    setForm({ ...form, bags, ...stock });
  };

  const handleBagWeightKgChange = (bagWeightKg: string) => {
    const stock = recalcBagTotal(form.bags, bagWeightKg, form.bagWeightGm);
    setForm({ ...form, bagWeightKg, ...stock });
  };

  const handleBagWeightGmChange = (bagWeightGm: string) => {
    const stock = recalcBagTotal(form.bags, form.bagWeightKg, bagWeightGm);
    setForm({ ...form, bagWeightGm, ...stock });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }

    const productCode = form.code.trim() || `PROD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const cleanForm = {
      name: form.name,
      category: form.category,
      code: productCode,
      image: form.image,
      normalPrice: Number(form.normalPrice),
      retailerPrice: Number(form.retailerPrice),
      buyingPrice: Number(form.buyingPrice),
      stockKg: Number(form.stockKg) || 0,
      stockGm: Number(form.stockGm) || 0,
      bagWeight: getBagWeightDecimal(form.bagWeightKg, form.bagWeightGm),
    };

    try {
      if (editing) {
        await updateProduct(editing, cleanForm);
        toast({ title: "Product Updated" });
      } else {
        await createProduct(cleanForm);
        toast({ title: "Product Created" });
      }
      setForm(emptyForm);
      setEditing(null);
      setDialogOpen(false);
      fetchProducts();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleEdit = (p: Product) => {
    const bw = p.bagWeight || 0;
    const bwKg = Math.floor(bw);
    const bwGm = Math.round((bw - bwKg) * 1000);
    setForm({
      name: p.name,
      category: p.category || "",
      code: p.code || "",
      image: p.image || "",
      normalPrice: String(p.normalPrice || ""),
      retailerPrice: String(p.retailerPrice || ""),
      buyingPrice: String(p.buyingPrice || ""),
      stockKg: String(p.stockKg || ""),
      stockGm: String(p.stockGm || ""),
      bags: "",
      bagWeightKg: bwKg ? String(bwKg) : "",
      bagWeightGm: bwGm ? String(bwGm) : "",
    });
    setEditing(p._id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteProduct(id);
      toast({ title: "Deleted" });
      fetchProducts();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.code || "").toLowerCase().includes(search.toLowerCase())
  );

  const formatStock = (stockKg: number, stockGm: number) => {
    if (stockKg > 0 && stockGm > 0) {
      return `${stockKg} KG ${stockGm} Gm`;
    } else if (stockKg > 0) {
      return `${stockKg} KG`;
    } else if (stockGm > 0) {
      return `${stockGm} Gm`;
    }
    return "0 Gm";
  };

  const getStockBadge = (stockKg: number, stockGm: number) => {
    const totalGrams = (stockKg * 1000) + stockGm;
    if (totalGrams === 0) return "badge-danger";
    if (totalGrams < 1000) return "badge-warning";
    return "badge-success";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="page-header text-xl sm:text-2xl md:text-3xl">Products</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setForm(emptyForm); setEditing(null); } }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground hover-glow gap-1"><Plus size={16} /> Add Product</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>{editing ? "Edit Product" : "Add New Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label>Product Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kaju, Almond" className="input-focus" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Buying Price (per KG)</Label>
                  <Input type="number" value={form.buyingPrice} onChange={(e) => setForm({ ...form, buyingPrice: e.target.value })} className="input-focus" />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Dry Fruits" className="input-focus" />
                </div>
              </div>

              {/* Bag Concept */}
              <div className="border border-border rounded-md p-3 space-y-2">
                <Label className="text-sm font-semibold">Bag Entry (Optional)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <Label className="text-xs">Bag Weight (KG)</Label>
                    <Input type="number" value={form.bagWeightKg} onChange={(e) => handleBagWeightKgChange(e.target.value)} className="input-focus" step="1" placeholder="e.g. 20" />
                  </div>
                  <div>
                    <Label className="text-xs">Bag Weight (Gm)</Label>
                    <Input type="number" value={form.bagWeightGm} onChange={(e) => handleBagWeightGmChange(e.target.value)} className="input-focus" step="1" placeholder="e.g. 500" />
                  </div>
                  <div>
                    <Label className="text-xs">No. of Bags</Label>
                    <Input type="number" value={form.bags} onChange={(e) => handleBagsChange(e.target.value)} className="input-focus" placeholder="e.g. 6" />
                  </div>
                  <div>
                    <Label className="text-xs">Auto Total</Label>
                    {(() => {
                      const totalKg = (Number(form.bags) || 0) * getBagWeightDecimal(form.bagWeightKg, form.bagWeightGm);
                      const wholeKg = Math.floor(totalKg);
                      const remainGm = Math.round((totalKg - wholeKg) * 1000);
                      return (
                        <div className="h-10 flex items-center px-3 text-sm font-medium bg-muted rounded-md">
                          {wholeKg} KG {remainGm > 0 ? `${remainGm} Gm` : ""}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Stock (KG)</Label>
                  <Input type="number" value={form.stockKg} onChange={(e) => setForm({ ...form, stockKg: e.target.value })} className="input-focus" step="0.01" placeholder="e.g. 10" />
                </div>
                <div>
                  <Label>Stock (Gram)</Label>
                  <Input type="number" value={form.stockGm} onChange={(e) => setForm({ ...form, stockGm: e.target.value })} className="input-focus" step="1" placeholder="e.g. 500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Normal Price</Label>
                  <Input type="number" value={form.normalPrice} onChange={(e) => setForm({ ...form, normalPrice: e.target.value })} className="input-focus" />
                </div>
                <div>
                  <Label>Retailer Price</Label>
                  <Input type="number" value={form.retailerPrice} onChange={(e) => setForm({ ...form, retailerPrice: e.target.value })} className="input-focus" />
                </div>
              </div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground hover-glow">
                {editing ? "Update Product" : "Create Product"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="pl-10 input-focus" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading products...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package size={48} className="mx-auto mb-3 opacity-40" />
          <p>No products found</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="gradient-primary text-primary-foreground">
                  <th className="px-4 py-3 text-left font-semibold">Product Name</th>
                  <th className="px-4 py-3 text-right font-semibold">Buying Price</th>
                  <th className="px-4 py-3 text-center font-semibold">Bag Info</th>
                  <th className="px-4 py-3 text-right font-semibold">Stock</th>
                  <th className="px-4 py-3 text-center font-semibold w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  return (
                    <tr key={p._id} className="border-b border-border table-row-hover">
                      <td className="px-4 py-3">
                        <p className="font-medium">{p.name}</p>
                        {p.category && <p className="text-xs text-muted-foreground">{p.category}</p>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">₹{p.buyingPrice?.toFixed(2) || "0.00"}</td>
                      <td className="px-4 py-3 text-center text-xs">
                        {p.bagWeight ? (
                          (() => {
                            const bwKg = Math.floor(p.bagWeight);
                            const bwGm = Math.round((p.bagWeight - bwKg) * 1000);
                            const bagLabel = bwGm > 0 ? `${bwKg} KG ${bwGm} Gm` : `${bwKg} KG`;
                            const totalStockKg = p.stockKg + p.stockGm / 1000;
                            const bagsAvail = Math.floor(totalStockKg / p.bagWeight);
                            return (
                              <div>
                                <span className="font-medium">1 Bag = {bagLabel}</span>
                                <br />
                                <span className="text-muted-foreground">
                                  {bagsAvail} Bags Available
                                </span>
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <span className={getStockBadge(p.stockKg, p.stockGm)}>
                          {formatStock(p.stockKg, p.stockGm)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleEdit(p)} className="text-muted-foreground hover:text-primary transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(p._id)} className="text-muted-foreground hover:text-destructive transition-colors">
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
    </div>
  );
}

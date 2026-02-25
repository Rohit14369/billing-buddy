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
  stock: number;
  category: string;
  code: string;
  image: string;
}

const emptyForm = { name: "", category: "", code: "", image: "", normalPrice: "", retailerPrice: "", buyingPrice: "", stock: "" };

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }
    const cleanForm = {
      ...form,
      normalPrice: Number(form.normalPrice),
      retailerPrice: Number(form.retailerPrice),
      buyingPrice: Number(form.buyingPrice),
      stock: Number(form.stock),
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
    setForm({
      name: p.name, category: p.category || "", code: p.code || "",
      image: p.image || "", normalPrice: String(p.normalPrice || ""),
      retailerPrice: String(p.retailerPrice || ""), buyingPrice: String(p.buyingPrice || ""),
      stock: String(p.stock || ""),
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="page-header text-xl sm:text-2xl md:text-3xl">Products</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setForm(emptyForm); setEditing(null); } }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground hover-glow gap-1"><Plus size={16} /> Add Product</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>{editing ? "Edit Product" : "Add New Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label>Product Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name" className="input-focus" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Dry Fruits" className="input-focus" />
                </div>
                <div>
                  <Label>Code</Label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. DF001" className="input-focus" />
                </div>
              </div>
              <div>
                <Label>Image URL</Label>
                <Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." className="input-focus" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Buying Price</Label>
                  <Input type="number" value={form.buyingPrice} onChange={(e) => setForm({ ...form, buyingPrice: e.target.value })} className="input-focus" />
                </div>
                <div>
                  <Label>Normal Price</Label>
                  <Input type="number" value={form.normalPrice} onChange={(e) => setForm({ ...form, normalPrice: e.target.value })} className="input-focus" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Retailer Price</Label>
                  <Input type="number" value={form.retailerPrice} onChange={(e) => setForm({ ...form, retailerPrice: e.target.value })} className="input-focus" />
                </div>
                <div>
                  <Label>Stock (KG)</Label>
                  <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="input-focus" />
                </div>
              </div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground hover-glow">
                {editing ? "Update Product" : "Create Product"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
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
                  <th className="px-4 py-3 text-right font-semibold">Buying</th>
                  <th className="px-4 py-3 text-right font-semibold">Normal</th>
                  <th className="px-4 py-3 text-right font-semibold">Retailer</th>
                  <th className="px-4 py-3 text-right font-semibold">Stock</th>
                  <th className="px-4 py-3 text-center font-semibold w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p._id} className="border-b border-border table-row-hover">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.image && <img src={p.image} alt={p.name} className="w-8 h-8 rounded object-cover" />}
                        <div>
                          <p className="font-medium">{p.name}</p>
                          {p.category && <p className="text-xs text-muted-foreground">{p.category}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">₹{p.buyingPrice?.toFixed(2) || "0.00"}</td>
                    <td className="px-4 py-3 text-right font-mono">₹{p.normalPrice?.toFixed(2) || "0.00"}</td>
                    <td className="px-4 py-3 text-right font-mono">₹{p.retailerPrice?.toFixed(2) || "0.00"}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      <span className={p.stock <= 50 ? "badge-danger" : "badge-success"}>
                        {p.stock?.toFixed(2) || "0.00"}
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

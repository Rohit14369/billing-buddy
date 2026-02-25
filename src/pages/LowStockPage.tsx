import { useState, useEffect } from "react";
import { getLowStock, getProducts, updateProduct } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LowStockProduct {
  _id: string;
  name: string;
  category: string;
  stock: number;
  normalPrice: number;
  image?: string;
}

export default function LowStockPage() {
  const { toast } = useToast();
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockId, setRestockId] = useState("");
  const [restockQty, setRestockQty] = useState(0);

  const fetchLowStock = async () => {
    setLoading(true);
    try {
      const res = await getLowStock();
      if (res?.success && res.data?.length > 0) {
        setLowStock(res.data);
      } else {
        // Fallback: filter from all products
        const all = await getProducts();
        const filtered = (Array.isArray(all) ? all : []).filter((p: any) => p.stock <= 50);
        setLowStock(filtered);
      }
    } catch {
      try {
        const all = await getProducts();
        const filtered = (Array.isArray(all) ? all : []).filter((p: any) => p.stock <= 50);
        setLowStock(filtered);
      } catch { setLowStock([]); }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLowStock(); }, []);

  const handleRestock = async () => {
    if (!restockId || restockQty <= 0) return;
    const product = lowStock.find(p => p._id === restockId);
    if (!product) return;
    try {
      await updateProduct(restockId, { stock: product.stock + restockQty });
      toast({ title: "Restocked!", description: `${product.name} updated.` });
      setRestockOpen(false);
      setRestockQty(0);
      fetchLowStock();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="page-header text-xl sm:text-2xl md:text-3xl">Low Stock Items</h1>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : lowStock.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package size={48} className="mx-auto mb-3 opacity-40" />
          <p>No low stock items</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lowStock.map((p) => (
            <div key={p._id} className="glass-card p-4 animate-slide-up">
              <div className="flex items-start gap-3">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    <Package size={20} className="text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                </div>
                <AlertTriangle size={18} className={`shrink-0 ${p.stock === 0 ? 'text-destructive' : 'text-warning'}`} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className={`text-lg font-bold ${p.stock === 0 ? 'text-destructive' : 'text-warning'}`}>
                  {p.stock} units
                </span>
                <Button size="sm" variant="outline" onClick={() => { setRestockId(p._id); setRestockOpen(true); }}>
                  Restock
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={restockOpen} onOpenChange={setRestockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Restock Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Add Quantity</Label>
              <Input type="number" value={restockQty || ""} onChange={(e) => setRestockQty(Number(e.target.value))} min={1} className="input-focus" />
            </div>
            <Button onClick={handleRestock} className="w-full gradient-primary text-primary-foreground">Update Stock</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

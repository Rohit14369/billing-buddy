import { useState, useEffect } from "react";
import { getProducts, createProduct, deleteProduct } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Product {
  _id: string;
  name: string;
  buyingPrice: number;
  normalPrice: number;
  retailerPrice: number;
  stock: number;
  category: string;
}

export default function ProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // New product form
  const [newName, setNewName] = useState("");
  const [newBuyingPrice, setNewBuyingPrice] = useState<number>(0);
  const [newNormalPrice, setNewNormalPrice] = useState<number>(0);
  const [newStock, setNewStock] = useState<number>(0);

  const fetchProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }
    try {
      await createProduct({
        name: newName,
        buyingPrice: newBuyingPrice,
        normalPrice: newNormalPrice,
        stock: newStock,
      });
      toast({ title: "Product Created" });
      setNewName("");
      setNewBuyingPrice(0);
      setNewNormalPrice(0);
      setNewStock(0);
      setDialogOpen(false);
      fetchProducts();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Products</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus size={16} /> Add Product</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Product Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Product name" />
              </div>
              <div>
                <Label>Buying Price</Label>
                <Input type="number" value={newBuyingPrice || ""} onChange={(e) => setNewBuyingPrice(Number(e.target.value))} />
              </div>
              <div>
                <Label>Selling Price (Normal)</Label>
                <Input type="number" value={newNormalPrice || ""} onChange={(e) => setNewNormalPrice(Number(e.target.value))} />
              </div>
              <div>
                <Label>Stock (KG)</Label>
                <Input type="number" value={newStock || ""} onChange={(e) => setNewStock(Number(e.target.value))} />
              </div>
              <Button onClick={handleCreate} className="w-full">Create Product</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package size={48} className="mx-auto mb-3 opacity-40" />
          <p>No products yet</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="px-4 py-3 text-left font-semibold">Product Name</th>
                <th className="px-4 py-3 text-right font-semibold">Buying Price</th>
                <th className="px-4 py-3 text-right font-semibold">Stock (KG)</th>
                <th className="px-4 py-3 text-center font-semibold w-16">Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id} className="border-b border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-right font-mono">₹ {p.buyingPrice?.toFixed(2) || "0.00"}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span className={p.stock < 10 ? "text-destructive font-bold" : ""}>
                      {p.stock?.toFixed(2) || "0.00"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleDelete(p._id)} className="text-muted-foreground hover:text-destructive">
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

import { useState, useEffect } from "react";
import { getProducts, updateProduct } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Package, FileSpreadsheet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import * as XLSX from "xlsx";

interface Product {
  _id: string;
  name: string;
  category: string;
  stock: number; // in grams
  buyingPrice: number;
  image?: string;
}

export default function LowStockPage() {
  const { toast } = useToast();
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockId, setRestockId] = useState("");
  const [restockKg, setRestockKg] = useState(0);
  const [restockGm, setRestockGm] = useState(0);
  const [showAlert, setShowAlert] = useState(false);

  // Low stock threshold: 50 KG = 50,000 grams
  const LOW_STOCK_THRESHOLD = 50000;

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await getProducts();
      const products = Array.isArray(data) ? data : [];
      setAllProducts(products);

      // Filter products with stock less than 50 KG (50,000 grams)
      const lowStockItems = products.filter((p: any) => (p.stock || 0) < LOW_STOCK_THRESHOLD);

      // Show alert if any products are low on stock
      if (lowStockItems.length > 0) {
        setShowAlert(true);
        toast({
          title: "Low Stock Alert!",
          description: `${lowStockItems.length} product(s) have stock below 50 KG`,
          variant: "warning"
        });
      } else {
        setShowAlert(false);
      }

      setLowStock(lowStockItems);
    } catch (err) {
      setLowStock([]);
      setAllProducts([]);
      toast({ title: "Error", description: "Failed to fetch products", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Function to update low stock list after restock
  const updateLowStockList = () => {
    const updatedLowStock = allProducts.filter(p => (p.stock || 0) < LOW_STOCK_THRESHOLD);
    setLowStock(updatedLowStock);

    // Update alert visibility
    if (updatedLowStock.length > 0) {
      setShowAlert(true);
    } else {
      setShowAlert(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // Refresh every 5 minutes
    const interval = setInterval(fetchProducts, 300000);
    return () => clearInterval(interval);
  }, []);

  const formatStock = (grams: number) => {
    if (grams >= 1000) {
      const kg = grams / 1000;
      return `${kg.toFixed(kg % 1 === 0 ? 0 : 1)} KG`;
    }
    return `${grams} Gm`;
  };

  const handleRestock = async () => {
    if (!restockId || (restockKg <= 0 && restockGm <= 0)) {
      toast({ title: "Error", description: "Please enter valid restock amount", variant: "destructive" });
      return;
    }

    const product = allProducts.find(p => p._id === restockId);
    if (!product) return;

    try {
      const addGrams = (restockKg * 1000) + restockGm;
      const newStock = (product.stock || 0) + addGrams;

      // Update product stock in database
      await updateProduct(restockId, { stock: newStock });

      // Update local state
      const updatedProducts = allProducts.map(p =>
        p._id === restockId ? { ...p, stock: newStock } : p
      );
      setAllProducts(updatedProducts);

      // Update low stock list
      updateLowStockList();

      toast({
        title: "Restocked!",
        description: `${product.name} updated with ${restockKg} KG ${restockGm} Gm`
      });

      // Close dialog and reset values
      setRestockOpen(false);
      setRestockKg(0);
      setRestockGm(0);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const exportToExcel = () => {
    if (lowStock.length === 0) {
      toast({ title: "No Data", description: "No low stock items to export", variant: "warning" });
      return;
    }

    // Prepare data for Excel
    const data = lowStock.map(product => ({
      "Product Name": product.name,
      "Category": product.category,
      "Stock": formatStock(product.stock || 0),
      "Stock (grams)": product.stock || 0,
      "Buying Price (₹)": product.buyingPrice?.toFixed(2) || "0.00",
      "Status": product.stock === 0 ? "Out of Stock" : "Low Stock"
    }));

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Low Stock Items");

    // Generate Excel file
    XLSX.writeFile(workbook, `LowStock_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "Exported!", description: "Excel file downloaded successfully" });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="page-header text-xl sm:text-2xl md:text-3xl">Low Stock Items</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={exportToExcel}
          className="gap-1"
          disabled={lowStock.length === 0}
        >
          <FileSpreadsheet size={16} /> Export to Excel
        </Button>
      </div>

      {showAlert && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                {lowStock.length} product(s) have stock below 50 KG. Please restock soon.
              </p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : lowStock.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package size={48} className="mx-auto mb-3 opacity-40" />
          <p>No low stock items (below 50 KG)</p>
        </div>
      ) : (
        <>
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
                    <p className="text-xs text-muted-foreground">₹{p.buyingPrice?.toFixed(2)}/KG</p>
                  </div>
                  <AlertTriangle
                    size={18}
                    className={`shrink-0 ${(p.stock || 0) === 0 ? 'text-destructive' : 'text-warning'}`}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <span className={`text-lg font-bold ${(p.stock || 0) === 0 ? 'text-destructive' : 'text-warning'}`}>
                      {formatStock(p.stock || 0)}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({p.stock || 0}g)
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRestockId(p._id);
                      setRestockKg(0);
                      setRestockGm(0);
                      setRestockOpen(true);
                    }}
                  >
                    Restock
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={restockOpen} onOpenChange={setRestockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-display)' }}>Restock Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Add KG</Label>
                <Input
                  type="number"
                  value={restockKg || ""}
                  onChange={(e) => setRestockKg(Number(e.target.value))}
                  min={0}
                  step="0.01"
                  className="input-focus"
                />
              </div>
              <div>
                <Label>Add Gram</Label>
                <Input
                  type="number"
                  value={restockGm || ""}
                  onChange={(e) => setRestockGm(Number(e.target.value))}
                  min={0}
                  step="1"
                  className="input-focus"
                />
              </div>
            </div>
            <Button onClick={handleRestock} className="w-full gradient-primary text-primary-foreground">
              Update Stock
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

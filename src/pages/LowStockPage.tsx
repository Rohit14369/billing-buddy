import { useEffect, useState } from "react";
import { getProducts } from "@/lib/api";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// Define the Product type
interface Product {
  _id: string;
  name: string;
  stockKg: number | string;
  stockGm: number | string;
}

export default function LowStock() {
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  // Calculate total stock in KG
  const calculateTotalStock = (stockKg: number | string, stockGm: number | string): number => {
    const kg = typeof stockKg === "string" ? parseFloat(stockKg) || 0 : stockKg || 0;
    const gm = typeof stockGm === "string" ? parseFloat(stockGm) || 0 : stockGm || 0;
    return kg + gm / 1000;
  };

  // Check if product is low stock (< 50 KG)
  const isLowStock = (product: Product): boolean => {
    const totalStock = calculateTotalStock(product.stockKg, product.stockGm);
    return totalStock < 50;
  };

  // Fetch products and filter low-stock items
  const fetchProducts = async () => {
    try {
      const data: Product[] = await getProducts();
      setProducts(data);

      // Filter products with less than 50 KG stock
      const filtered = data.filter((product) => isLowStock(product));
      setLowStockProducts(filtered);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Export low-stock products to Excel
  const exportToExcel = () => {
    const excelData = lowStockProducts.map((product) => {
      const totalKg = calculateTotalStock(product.stockKg, product.stockGm);

      return {
        Name: product.name,
        "Stock (KG)": product.stockKg,
        "Stock (GM)": product.stockGm,
        "Total (KG)": totalKg.toFixed(2),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "LowStock");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const fileData = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(fileData, "Low_Stock_Products.xlsx");
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Low Stock Items</h1>
        <Button onClick={exportToExcel}>Export Excel</Button>
      </div>

      {/* Count of low-stock products */}
      <div className="mb-4 text-yellow-600">
        {lowStockProducts.length} product(s) below 50 KG
      </div>

      {/* List of low-stock products */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {lowStockProducts.map((product) => {
          const totalKg = calculateTotalStock(product.stockKg, product.stockGm);

          return (
            <div key={product._id} className="border rounded-xl p-4 shadow">
              <h2 className="text-lg font-semibold">{product.name}</h2>
              <p className="text-sm text-gray-500">
                {product.stockKg} KG {product.stockGm} GM
              </p>
              <p className="font-bold text-red-600">{totalKg.toFixed(2)} KG</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

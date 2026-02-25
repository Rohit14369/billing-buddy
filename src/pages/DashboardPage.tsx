import { useState, useEffect } from "react";
import { getDashboard, getBills, getProducts } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Package, ShoppingCart, Users, AlertTriangle, TrendingUp, IndianRupee, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";

interface DashboardData {
  totalProducts: number;
  totalStock: number;
  lowStockItems: number;
  totalCustomers: number;
  todayBills: number;
  totalRevenue: number;
  normalCustomerRevenue: number;
  retailerCustomerRevenue: number;
  todayRevenue: number;
  todayBillsGenerated: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [apiData, setApiData] = useState<DashboardData | null>(null);
  const [apiBills, setApiBills] = useState<any[]>([]);
  const [apiProducts, setApiProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDashboard().then(res => {
        if (res?.success) setApiData(res.data);
        else setApiData(res);
      }).catch(() => {}),
      getBills().then(res => setApiBills(Array.isArray(res) ? res : [])).catch(() => {}),
      getProducts().then(res => setApiProducts(Array.isArray(res) ? res : [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const totalProducts = apiData?.totalProducts ?? apiProducts.length;
  const totalStock = apiData?.totalStock ?? apiProducts.reduce((s: number, p: any) => s + (p.stock || 0), 0);
  const lowStockCount = apiData?.lowStockItems ?? apiProducts.filter((p: any) => p.stock <= 50).length;
  const totalRevenue = apiData?.totalRevenue ?? apiBills.reduce((s: number, b: any) => s + (b.total || 0), 0);

  const totalProfit = (() => {
    let profit = 0;
    apiBills.forEach((bill: any) => {
      (bill.items || []).forEach((item: any) => {
        const product = apiProducts.find((p: any) => p.name === item.productName || p._id === item.productId);
        const buyingPrice = product?.buyingPrice || 0;
        const sellingPrice = item.price || 0;
        const qty = item.quantity || 0;
        profit += (sellingPrice - buyingPrice) * qty;
      });
    });
    return profit;
  })();

  const normalCustomerRevenue = apiData?.normalCustomerRevenue ?? apiBills.filter((b: any) => b.customerType === 'normal').reduce((s: number, b: any) => s + (b.total || 0), 0);
  const retailerCustomerRevenue = apiData?.retailerCustomerRevenue ?? apiBills.filter((b: any) => b.customerType === 'retailer').reduce((s: number, b: any) => s + (b.total || 0), 0);

  const todayDateString = new Date().toLocaleDateString('en-CA');
  const todayBillsCount = apiData?.todayBillsGenerated ?? apiBills.filter((b: any) => {
    const billDate = new Date(b.createdAt || b.date).toLocaleDateString('en-CA');
    return billDate === todayDateString;
  }).length;

  const stats = [
    { label: 'Total Products', value: totalProducts, icon: Package, color: 'text-primary' },
    { label: 'Total Stock', value: totalStock + ' units', icon: TrendingUp, color: 'text-primary' },
    { label: 'Low Stock Items', value: lowStockCount, icon: AlertTriangle, color: 'text-warning', link: '/low-stock' },
    { label: "Today's Bills", value: todayBillsCount, icon: ShoppingCart, color: 'text-primary' },
    { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-primary' },
    { label: 'Total Profit', value: `₹${totalProfit.toLocaleString('en-IN')}`, icon: TrendingDown, color: totalProfit >= 0 ? 'text-primary' : 'text-destructive' },
    { label: 'Normal Revenue', value: `₹${normalCustomerRevenue.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-primary' },
    { label: 'Retailer Revenue', value: `₹${retailerCustomerRevenue.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-warning' },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="page-header text-xl sm:text-2xl md:text-3xl">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Welcome back, {user?.name || "User"}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {stats.map((stat, i) => {
            const Card = (
              <div key={i} className="stat-card group animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl md:text-3xl font-bold mt-1" style={{ fontFamily: 'var(--font-display)' }}>{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-muted ${stat.color} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}>
                    <stat.icon size={22} />
                  </div>
                </div>
              </div>
            );
            return stat.link ? <Link to={stat.link} key={i}>{Card}</Link> : <div key={i}>{Card}</div>;
          })}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { getDashboard, getBills, getProducts, getTotalPaidForBill } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Package, ShoppingCart, AlertTriangle, TrendingUp, IndianRupee, TrendingDown, Clock, Users } from "lucide-react";
import { Link } from "react-router-dom";

export default function DashboardPage() {
  const { user } = useAuth();
  const [apiBills, setApiBills] = useState<any[]>([]);
  const [apiProducts, setApiProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getBills().then(res => setApiBills(Array.isArray(res) ? res : [])).catch(() => {}),
      getProducts().then(res => setApiProducts(Array.isArray(res) ? res : [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const totalProducts = apiProducts.length;

  // Stock is stored in grams
  const totalStockGrams = apiProducts.reduce((s: number, p: any) => s + (p.stock || 0), 0);
  const totalStockDisplay = totalStockGrams >= 1000
    ? `${(totalStockGrams / 1000).toFixed(1)} KG`
    : `${totalStockGrams} Gm`;

  // Low stock: less than 1 KG (1000 grams)
  const lowStockCount = apiProducts.filter((p: any) => (p.stock || 0) < 1000).length;

  const totalRevenue = apiBills.reduce((s: number, b: any) => s + (b.total || 0), 0);

  // Proportional profit
  const profitData = (() => {
    let totalProfit = 0;
    let receivedProfit = 0;
    let totalPending = 0;
    let totalPaid = 0;

    apiBills.forEach((bill: any) => {
      const billTotal = bill.total || 0;
      const billPaid = (bill.paidAmount || 0) + getTotalPaidForBill(bill._id);
      const billPending = Math.max(0, billTotal - billPaid);
      totalPaid += billPaid;
      totalPending += billPending;

      let billCost = 0;
      (bill.items || []).forEach((item: any) => {
        if (item.category === 'charges') return;
        const product = apiProducts.find((p: any) => p.name === item.productName || p._id === item.productId);
        const buyingPrice = product?.buyingPrice || 0;
        const qty = item.quantity || item.netWeight || 0;
        billCost += buyingPrice * qty;
      });
      const billProfit = billTotal - billCost;
      totalProfit += billProfit;
      if (billTotal > 0) {
        receivedProfit += billProfit * Math.min(1, billPaid / billTotal);
      }
    });
    return { totalProfit, receivedProfit, totalPending, totalPaid };
  })();

  const todayDateString = new Date().toLocaleDateString('en-CA');
  const todayBillsCount = apiBills.filter((b: any) => {
    const billDate = new Date(b.createdAt || b.date).toLocaleDateString('en-CA');
    return billDate === todayDateString;
  }).length;

  const pendingCustomers = new Set(
    apiBills.filter(b => {
      const paid = (b.paidAmount || 0) + getTotalPaidForBill(b._id);
      return (b.total || 0) - paid > 0;
    }).map(b => b.customerName)
  ).size;

  const stats = [
    { label: 'Total Products', value: totalProducts, icon: Package, color: 'text-primary' },
    { label: 'Total Stock', value: totalStockDisplay, icon: TrendingUp, color: 'text-primary' },
    { label: 'Low Stock', value: lowStockCount, icon: AlertTriangle, color: 'text-warning', link: '/low-stock' },
    { label: "Today's Bills", value: todayBillsCount, icon: ShoppingCart, color: 'text-primary' },
    { label: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: IndianRupee, color: 'text-primary' },
    { label: 'Received Profit', value: `₹${profitData.receivedProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: TrendingDown, color: profitData.receivedProfit >= 0 ? 'text-success' : 'text-destructive' },
    { label: 'Total Pending', value: `₹${profitData.totalPending.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: Clock, color: 'text-destructive', link: '/pending' },
    { label: 'Pending Customers', value: pendingCustomers, icon: Users, color: 'text-warning', link: '/pending' },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="page-header text-xl sm:text-2xl md:text-3xl">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome back, {user?.name || "User"}</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          {stats.map((stat, i) => {
            const Card = (
              <div className="stat-card group animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1" style={{ fontFamily: 'var(--font-display)' }}>{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-muted ${stat.color} transition-transform duration-300 group-hover:scale-110`}>
                    <stat.icon size={20} />
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
import { useState, useEffect } from "react";
import { getDashboard } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Package, TrendingUp, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      label: "Total Bills",
      value: stats?.totalBills || 0,
      icon: FileText,
      color: "text-primary",
      onClick: () => navigate("/bills"),
    },
    {
      label: "Total Products",
      value: stats?.totalProducts || 0,
      icon: Package,
      color: "text-success",
      onClick: () => navigate("/products"),
    },
    {
      label: "Total Revenue",
      value: `₹ ${(stats?.totalRevenue || 0).toLocaleString("en-IN")}`,
      icon: TrendingUp,
      color: "text-accent",
    },
    {
      label: "Low Stock Items",
      value: stats?.lowStockCount || 0,
      icon: AlertTriangle,
      color: "text-destructive",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome, {user?.name || "User"}
        </h1>
        <p className="text-sm text-muted-foreground">Sadik Traders — Dashboard</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div
              key={card.label}
              onClick={card.onClick}
              className={`bg-card border border-border rounded-lg p-5 ${card.onClick ? "cursor-pointer hover:border-primary/40 transition-colors" : ""}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{card.label}</span>
                <card.icon size={20} className={card.color} />
              </div>
              <div className="text-2xl font-bold text-foreground">{card.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

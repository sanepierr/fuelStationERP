import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import {
  Building2, Fuel, TrendingUp, AlertTriangle, Activity, RefreshCw,
  ArrowUpRight, Gauge, Users, Receipt, Zap, CheckCircle
} from "lucide-react";
import { useLocation } from "wouter";
import { useMemo, useState } from "react";

const COLORS = ['#2563eb', '#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b'];

function formatUGX(amount: number) {
  if (amount >= 1000000) return `UGX ${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `UGX ${(amount / 1000).toFixed(0)}K`;
  return `UGX ${amount.toLocaleString()}`;
}

function StatCard({ title, value, subtitle, icon: Icon, color, trend }: {
  title: string; value: string; subtitle?: string; icon: any; color: string; trend?: string;
}) {
  return (
    <Card className="bg-card border-border card-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1 text-emerald-600 text-xs">
            <ArrowUpRight className="w-3 h-3" />
            <span>{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TankGaugeWidget({ tank }: { tank: any }) {
  const pct = Math.min(100, Math.max(0, (parseFloat(tank.currentLevel) / parseFloat(tank.capacity)) * 100));
  const statusColors: Record<string, string> = {
    normal: 'bg-emerald-500',
    low: 'bg-amber-500',
    critical: 'bg-red-500',
    overfill: 'bg-blue-500',
    maintenance: 'bg-gray-500',
  };
  const textColors: Record<string, string> = {
    normal: 'text-emerald-600',
    low: 'text-amber-600',
    critical: 'text-red-600',
    overfill: 'text-blue-600',
    maintenance: 'text-gray-500',
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
      <div className="relative w-8 h-16 bg-muted rounded border border-border overflow-hidden">
        <div
          className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ${statusColors[tank.status] || 'bg-emerald-500'}`}
          style={{ height: `${pct}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[8px] font-bold text-white drop-shadow">{Math.round(pct)}%</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{tank.name}</p>
        <p className="text-xs text-muted-foreground">{parseFloat(tank.currentLevel).toLocaleString()}L / {parseFloat(tank.capacity).toLocaleString()}L</p>
        <span className={`text-xs font-medium ${textColors[tank.status] || 'text-emerald-600'}`}>
          {tank.status.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedStation, setSelectedStation] = useState<number | null>(null);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.dashboard.stats.useQuery(undefined, { refetchInterval: 30000 });
  const { data: multiStation, isLoading: stationsLoading } = trpc.dashboard.multiStation.useQuery(undefined, { refetchInterval: 60000 });
  const { data: stations } = trpc.stations.list.useQuery();

  const firstStationId = stations?.[0]?.id || 1;
  const activeStationId = selectedStation || firstStationId;

  const { data: tanks } = trpc.tanks.forStation.useQuery({ stationId: activeStationId });
  const { data: txStats } = trpc.transactions.stats.useQuery({ stationId: activeStationId });

  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const { data: salesReport } = trpc.reports.sales.useQuery({ stationId: activeStationId, from: weekAgo, to: today });
  const { data: paymentBreakdown } = trpc.reports.paymentBreakdown.useQuery({ stationId: activeStationId, from: weekAgo, to: today });

  const chartData = useMemo(() => {
    if (!salesReport) return [];
    const grouped: Record<string, number> = {};
    salesReport.forEach(r => {
      const d = r.date as string;
      grouped[d] = (grouped[d] || 0) + Number(r.totalAmount);
    });
    return Object.entries(grouped).map(([date, amount]) => ({
      date: new Date(date).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' }),
      revenue: amount,
    }));
  }, [salesReport]);

  const pieData = useMemo(() => {
    if (!paymentBreakdown) return [];
    const labels: Record<string, string> = {
      cash: 'Cash', mtn_momo: 'MTN MoMo', airtel_money: 'Airtel', visa: 'Visa', credit: 'Credit', prepaid: 'Prepaid'
    };
    return paymentBreakdown.map(p => ({ name: labels[p.paymentMethod] || p.paymentMethod, value: Number(p.total) }));
  }, [paymentBreakdown]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {new Date().toLocaleDateString('en-UG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchStats()} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => navigate('/transactions/new')} className="gap-2">
            <Zap className="w-3.5 h-3.5" />
            New Transaction
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Stations"
          value={statsLoading ? '...' : String(stats?.totalStations || 0)}
          subtitle="Connected to portal"
          icon={Building2}
          color="bg-blue-100 text-blue-600"
          trend="All systems operational"
        />
        <StatCard
          title="Today's Revenue"
          value={statsLoading ? '...' : formatUGX(stats?.todayRevenue || 0)}
          subtitle={`${stats?.todayTransactions || 0} transactions`}
          icon={TrendingUp}
          color="bg-emerald-100 text-emerald-600"
          trend="Live tracking"
        />
        <StatCard
          title="Active Shifts"
          value={statsLoading ? '...' : String(stats?.activeShifts || 0)}
          subtitle="Across all stations"
          icon={Activity}
          color="bg-primary/15 text-primary"
        />
        <StatCard
          title="Tank Alerts"
          value={statsLoading ? '...' : String(stats?.tankAlerts || 0)}
          subtitle={stats?.tankAlerts ? 'Requires attention' : 'All levels normal'}
          icon={AlertTriangle}
          color={stats?.tankAlerts ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}
        />
      </div>

      {/* Multi-Station Overview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Station Performance</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/stations')} className="text-xs text-muted-foreground">
            View All →
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stationsLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="bg-card border-border animate-pulse h-36" />
            ))
          ) : multiStation?.map((station) => (
            <Card
              key={station.id}
              className={`bg-card border-border card-hover cursor-pointer transition-all ${selectedStation === station.id ? 'border-primary/50 bg-primary/5' : ''}`}
              onClick={() => setSelectedStation(station.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{station.name}</p>
                    <p className="text-xs text-muted-foreground">{station.city}, {station.country}</p>
                  </div>
                  <Badge className={station.status === 'active' ? 'badge-active' : 'badge-inactive'} variant="outline">
                    {station.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="text-sm font-bold text-foreground">{formatUGX(station.todayRevenue)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Txns</p>
                    <p className="text-sm font-bold text-foreground">{station.todayTransactions}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Alerts</p>
                    <p className={`text-sm font-bold ${station.tankAlerts > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {station.tankAlerts}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              7-Day Revenue Trend
              <span className="text-xs text-muted-foreground font-normal ml-auto">
                {stations?.find(s => s.id === activeStationId)?.name}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8 }}
                  formatter={(v: any) => [formatUGX(v), 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="var(--color-primary)" fill="url(#revenueGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Breakdown */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8 }}
                    formatter={(v: any) => [formatUGX(v), '']}
                  />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tank Gauges & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tank Gauges */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Gauge className="w-4 h-4 text-primary" />
              Tank Levels - {stations?.find(s => s.id === activeStationId)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {tanks?.map(tank => <TankGaugeWidget key={tank.id} tank={tank} />) || (
                <p className="text-sm text-muted-foreground col-span-2 text-center py-4">No tanks configured</p>
              )}
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-3 text-xs" onClick={() => navigate('/tanks')}>
              View All Tanks →
            </Button>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Today's Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Today Revenue', value: formatUGX(txStats?.todayTotal || 0), icon: TrendingUp, color: 'text-emerald-600' },
              { label: 'Today Transactions', value: String(txStats?.todayCount || 0), icon: Receipt, color: 'text-blue-600' },
              { label: 'Fuel Dispensed', value: `${(txStats?.todayVolume || 0).toFixed(0)}L`, icon: Fuel, color: 'text-primary' },
              { label: 'Week Revenue', value: formatUGX(txStats?.weekTotal || 0), icon: TrendingUp, color: 'text-purple-600' },
              { label: 'Month Revenue', value: formatUGX(txStats?.monthTotal || 0), icon: TrendingUp, color: 'text-cyan-700' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
                <span className={`text-sm font-semibold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

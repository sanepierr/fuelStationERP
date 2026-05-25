import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Download, Printer, TrendingUp, BarChart2, FileText } from "lucide-react";
import { useState } from "react";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Reports() {
  const [stationId, setStationId] = useState<string>('');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual'>('monthly');
  const { data: stations } = trpc.stations.list.useQuery();
  const activeStationId = parseInt(stationId) || stations?.[0]?.id || 1;
  const now = new Date();
  const getRange = () => {
    const to = now.toISOString().split('T')[0];
    const from = new Date(now);
    if (period === 'daily') from.setDate(from.getDate() - 1);
    else if (period === 'weekly') from.setDate(from.getDate() - 7);
    else if (period === 'monthly') from.setMonth(from.getMonth() - 1);
    else if (period === 'quarterly') from.setMonth(from.getMonth() - 3);
    else from.setFullYear(from.getFullYear() - 1);
    return { from: from.toISOString().split('T')[0], to };
  };
  const range = getRange();
  const { data: salesReport, isLoading } = trpc.reports.sales.useQuery({ stationId: activeStationId, ...range });
  const { data: paymentReport } = trpc.reports.paymentBreakdown.useQuery({ stationId: activeStationId, ...range });
  const { data: fuelReport } = trpc.reports.fuelConsumption.useQuery({ stationId: activeStationId, ...range });

  const salesData = salesReport?.map((r: any) => ({ date: r.date, sales: parseFloat(r.totalSales || '0') })) || [];
  const fuelData = fuelReport?.map((r: any) => ({ name: r.fuelType || 'Unknown', volume: parseFloat(r.totalVolume || '0') })) || [];
  const paymentData = paymentReport?.map((r: any) => ({ method: r.paymentMethod?.replace(/_/g, ' '), amount: parseFloat(r.totalAmount || '0') })) || [];
  const totalSales = salesReport?.reduce((s: number, r: any) => s + parseFloat(r.totalSales || '0'), 0) || 0;
  const totalVolume = fuelReport?.reduce((s: number, r: any) => s + parseFloat(r.totalVolume || '0'), 0) || 0;
  const totalTransactions = salesReport?.reduce((s: number, r: any) => s + (r.transactionCount || 0), 0) || 0;

  const handlePrint = () => window.print();
  const handleDownloadCSV = () => {
    const rows = [
      ['Period', 'Total Sales', 'Total Volume', 'Transactions'],
      [period, totalSales, totalVolume, totalTransactions],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `fuelsync-report-${period}.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm">Comprehensive performance reports with live metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={stationId} onValueChange={setStationId}>
            <SelectTrigger className="w-48 bg-input border-border"><SelectValue placeholder="All Stations" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">All Stations</SelectItem>
              {stations?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={v => setPeriod(v as any)}>
            <SelectTrigger className="w-36 bg-input border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2"><Printer className="w-4 h-4" />Print</Button>
          <Button variant="outline" size="sm" onClick={handleDownloadCSV} className="gap-2"><Download className="w-4 h-4" />CSV</Button>
        </div>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">{Array(4).fill(0).map((_, i) => <Card key={i} className="h-24 animate-pulse bg-card border-border" />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Revenue', value: `UGX ${totalSales.toLocaleString()}`, icon: TrendingUp, color: 'text-primary' },
            { label: 'Total Volume', value: `${totalVolume.toLocaleString()}L`, icon: BarChart2, color: 'text-emerald-600' },
            { label: 'Transactions', value: totalTransactions.toLocaleString(), icon: FileText, color: 'text-blue-600' },
            { label: 'Avg per Txn', value: `UGX ${totalTransactions ? Math.round(totalSales / totalTransactions).toLocaleString() : '0'}`, icon: TrendingUp, color: 'text-amber-600' },
          ].map(kpi => (
            <Card key={kpi.label} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{kpi.label}</span>
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
                <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm">Sales Trend</CardTitle></CardHeader>
          <CardContent>
            {salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} />
                  <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} dot={false} name="Sales (UGX)" />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No data for this period</div>}
          </CardContent>
        </Card>

        {/* Fuel by Type */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm">Volume by Fuel Type</CardTitle></CardHeader>
          <CardContent>
            {fuelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={fuelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} />
                  <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="volume" fill="#10b981" radius={[4, 4, 0, 0]} name="Volume (L)" />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No data for this period</div>}
          </CardContent>
        </Card>

        {/* Payment Breakdown */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm">Payment Method Breakdown</CardTitle></CardHeader>
          <CardContent>
            {paymentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" outerRadius={80} dataKey="amount" nameKey="method" label={({ method, percent }) => `${method} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {paymentData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No data for this period</div>}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-sm">Top Products by Revenue</CardTitle></CardHeader>
          <CardContent>
{false ? (
          <div className="space-y-3">
            {[].map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: COLORS[i % COLORS.length] + '33', color: COLORS[i % COLORS.length] }}>{i + 1}</div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-foreground font-medium">{p.name}</span>
                        <span className="text-primary font-bold">UGX {parseFloat(p.revenue).toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${p.percent}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No product data</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

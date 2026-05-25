import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Receipt, Search, Printer, Download, Eye, FileText, Info } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

function exportToCSV(transactions: any[]) {
  const headers = ['Receipt #', 'Type', 'Payment Method', 'Volume (L)', 'Unit Price', 'Subtotal', 'Tax', 'Discount', 'Total Amount', 'Status', 'Date'];
  const rows = transactions.map(tx => [
    tx.receiptNumber,
    tx.transactionType?.replace(/_/g, ' '),
    tx.paymentMethod?.replace(/_/g, ' '),
    tx.fuelVolume ? parseFloat(tx.fuelVolume).toFixed(3) : '',
    tx.pricePerUnit ? parseFloat(tx.pricePerUnit).toFixed(2) : '',
    parseFloat(tx.subtotal).toFixed(2),
    parseFloat(tx.taxAmount || '0').toFixed(2),
    parseFloat(tx.discountAmount || '0').toFixed(2),
    parseFloat(tx.totalAmount).toFixed(2),
    tx.status,
    new Date(tx.createdAt).toLocaleString(),
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
  toast.success('Transactions exported to CSV');
}

const paymentColors: Record<string, string> = {
  cash: 'badge-active', mtn_momo: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  airtel_money: 'bg-red-50 text-red-700 border border-red-200', visa: 'badge-info',
  credit: 'bg-purple-50 text-purple-700 border border-purple-200', prepaid: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
};

function ReceiptModal({ tx, onClose }: { tx: any; onClose: () => void }) {
  const handlePrint = () => window.print();
  
  return (
    <DialogContent className="bg-card border-border max-w-sm">
      <DialogHeader><DialogTitle>Transaction Receipt</DialogTitle></DialogHeader>
      <div id="receipt-content" className="space-y-3">
        <div className="text-center border-b border-border pb-3">
          <p className="font-bold text-lg text-foreground">FUEL RECEIPT</p>
          <p className="text-xs text-muted-foreground">Uganda Revenue Authority Verified</p>
          <p className="text-xs font-mono text-primary mt-1">{tx.receiptNumber}</p>
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{new Date(tx.createdAt).toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="capitalize">{tx.transactionType?.replace(/_/g, ' ')}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="capitalize">{tx.paymentMethod?.replace(/_/g, ' ')}</span></div>
          {tx.fuelVolume && <div className="flex justify-between"><span className="text-muted-foreground">Volume</span><span>{parseFloat(tx.fuelVolume).toFixed(2)}L</span></div>}
          {tx.pricePerUnit && <div className="flex justify-between"><span className="text-muted-foreground">Price/L</span><span>UGX {parseFloat(tx.pricePerUnit).toLocaleString()}</span></div>}
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>UGX {parseFloat(tx.subtotal).toLocaleString()}</span></div>
          {tx.taxAmount && parseFloat(tx.taxAmount) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>UGX {parseFloat(tx.taxAmount).toLocaleString()}</span></div>}
          {tx.discountAmount && parseFloat(tx.discountAmount) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-emerald-600">-UGX {parseFloat(tx.discountAmount).toLocaleString()}</span></div>}
          <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-2">
            <span>TOTAL</span><span className="text-primary">UGX {parseFloat(tx.totalAmount).toLocaleString()}</span>
          </div>
        </div>
        {tx.qrCode && (
          <div className="text-center pt-2 border-t border-border">
            <img src={tx.qrCode} alt="QR Code" className="w-24 h-24 mx-auto" />
            <p className="text-xs text-muted-foreground mt-1">Scan to verify with URA</p>
            <p className="text-xs font-mono text-muted-foreground">{tx.uraVerificationCode}</p>
          </div>
        )}
        {tx.loyaltyPointsEarned > 0 && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 text-center">
            <p className="text-xs text-primary font-medium">+{tx.loyaltyPointsEarned} Loyalty Points Earned!</p>
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-2">
        <Button onClick={handlePrint} className="flex-1 gap-2"><Printer className="w-4 h-4" />Print</Button>
        <Button variant="outline" onClick={onClose} className="flex-1">Close</Button>
      </div>
    </DialogContent>
  );
}

export default function Transactions() {
  const [, navigate] = useLocation();
  const [stationId, setStationId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const { data: stations } = trpc.stations.list.useQuery();
  const activeStationId = parseInt(stationId) || stations?.[0]?.id || 1;
  const { data: transactions, isLoading } = trpc.transactions.list.useQuery({ stationId: activeStationId, limit: 100 });

  const filtered = transactions?.filter(tx =>
    !search || tx.receiptNumber?.toLowerCase().includes(search.toLowerCase()) ||
    tx.paymentMethod?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const totalRevenue = filtered.reduce((sum, tx) => sum + parseFloat(tx.totalAmount), 0);

  return (
    <div className="space-y-6">
      {/* PTS-2 read-only notice */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
        <Info className="w-4 h-4 flex-shrink-0" />
        Transaction records are fetched automatically from the PTS-2 pump controller and are read-only. Manual entries are available for non-controller stations via New Transaction.
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <p className="text-muted-foreground text-sm">All forecourt transactions with URA-verified receipts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportToCSV(filtered)} className="gap-2 bg-transparent">
            <Download className="w-4 h-4" />Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2 bg-transparent">
            <Printer className="w-4 h-4" />Print
          </Button>
          <Button onClick={() => navigate('/transactions/new')} className="gap-2">
            <Receipt className="w-4 h-4" />New Transaction
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Select value={stationId} onValueChange={setStationId}>
          <SelectTrigger className="w-48 bg-input border-border"><SelectValue placeholder="Select station" /></SelectTrigger>
          <SelectContent>{stations?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by receipt #, payment method..." className="pl-9 bg-input border-border" />
        </div>
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          Total: <span className="text-primary font-bold">UGX {totalRevenue.toLocaleString()}</span>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading transactions...</div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No transactions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Receipt #</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Type</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Payment</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Volume</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Amount</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Date</th>
                    <th className="text-center px-4 py-3 text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(tx => (
                    <tr key={tx.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-primary">{tx.receiptNumber}</td>
                      <td className="px-4 py-3 capitalize text-foreground">{tx.transactionType?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={paymentColors[tx.paymentMethod] || 'badge-inactive'}>
                          {tx.paymentMethod?.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{tx.fuelVolume ? `${parseFloat(tx.fuelVolume).toFixed(2)}L` : '-'}</td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">UGX {parseFloat(tx.totalAmount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(tx.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelectedTx(tx)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        {selectedTx && <ReceiptModal tx={selectedTx} onClose={() => setSelectedTx(null)} />}
      </Dialog>
    </div>
  );
}

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Fuel, CreditCard, Smartphone, Banknote, Zap, CheckCircle, QrCode } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const paymentMethods = [
  { id: 'cash', label: 'Cash', icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-500/20 border-emerald-500/40' },
  { id: 'mtn_momo', label: 'MTN MoMo', icon: Smartphone, color: 'text-yellow-600', bg: 'bg-yellow-500/20 border-yellow-500/40' },
  { id: 'airtel_money', label: 'Airtel Money', icon: Smartphone, color: 'text-red-600', bg: 'bg-red-500/20 border-red-500/40' },
  { id: 'visa', label: 'Visa/Card', icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-500/20 border-blue-500/40' },
  { id: 'credit', label: 'Credit', icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-500/20 border-purple-500/40' },
  { id: 'prepaid', label: 'Prepaid', icon: CreditCard, color: 'text-cyan-700', bg: 'bg-cyan-500/20 border-cyan-500/40' },
];

export default function NewTransaction() {
  const [, navigate] = useLocation();
  const [stationId, setStationId] = useState<string>('');
  const [pumpId, setPumpId] = useState<string>('');
  const [fuelTypeId, setFuelTypeId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [transactionType, setTransactionType] = useState('fuel_sale');
  const [volume, setVolume] = useState('');
  const [amount, setAmount] = useState('');
  const [loyaltyCard, setLoyaltyCard] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [receipt, setReceipt] = useState<any>(null);

  const { data: stations } = trpc.stations.list.useQuery();
  const activeStationId = parseInt(stationId) || stations?.[0]?.id || 1;
  const { data: pumps } = trpc.pumps.forStation.useQuery({ stationId: activeStationId });
  const { data: fuelTypes } = trpc.fuelTypes.list.useQuery();
  const { data: prices } = trpc.fuelPrices.forStation.useQuery({ stationId: activeStationId });
  const { data: activeShift } = trpc.shifts.active.useQuery({ stationId: activeStationId });

  const createTx = trpc.transactions.create.useMutation({
    onSuccess: (data) => {
      setReceipt(data);
      toast.success("Transaction recorded successfully!");
    },
    onError: (e) => toast.error(e.message),
  });

  const selectedPrice = prices?.find(p => p.fuelTypeId === parseInt(fuelTypeId));
  const pricePerUnit = selectedPrice ? parseFloat(selectedPrice.pricePerUnit) : 0;
  const calculatedAmount = volume && pricePerUnit ? (parseFloat(volume) * pricePerUnit).toFixed(0) : amount;
  const totalAmount = calculatedAmount || '0';

  const handleSubmit = () => {
    if (!totalAmount || parseFloat(totalAmount) <= 0) { toast.error("Please enter a valid amount"); return; }
    createTx.mutate({
      stationId: activeStationId,
      shiftId: activeShift?.id,
      pumpId: pumpId ? parseInt(pumpId) : undefined,
      transactionType: transactionType as any,
      paymentMethod: paymentMethod as any,
      fuelTypeId: fuelTypeId ? parseInt(fuelTypeId) : undefined,
      fuelVolume: volume || undefined,
      pricePerUnit: selectedPrice?.pricePerUnit,
      subtotal: totalAmount,
      totalAmount,
      loyaltyCardId: loyaltyCard || undefined,
      mobileMoneyPhone: mobilePhone || undefined,
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Transaction</h1>
          <p className="text-muted-foreground text-sm">Record a forecourt sale</p>
        </div>
      </div>

      {activeShift && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-600">Active Shift: {activeShift.shiftName}</span>
        </div>
      )}

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-sm">Transaction Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Station</Label>
              <Select value={stationId} onValueChange={setStationId}>
                <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Select station" /></SelectTrigger>
                <SelectContent>{stations?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Transaction Type</Label>
              <Select value={transactionType} onValueChange={setTransactionType}>
                <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fuel_sale">Fuel Sale</SelectItem>
                  <SelectItem value="product_sale">Product Sale</SelectItem>
                  <SelectItem value="prepaid_topup">Prepaid Top-up</SelectItem>
                  <SelectItem value="credit_sale">Credit Sale</SelectItem>
                  <SelectItem value="rtt">RTT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {transactionType === 'fuel_sale' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Pump</Label>
                <Select value={pumpId} onValueChange={setPumpId}>
                  <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Select pump" /></SelectTrigger>
                  <SelectContent>{pumps?.filter(p => p.status === 'active').map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fuel Type</Label>
                <Select value={fuelTypeId} onValueChange={setFuelTypeId}>
                  <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Select fuel" /></SelectTrigger>
                  <SelectContent>{fuelTypes?.map(ft => <SelectItem key={ft.id} value={String(ft.id)}>{ft.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Volume (Litres)</Label>
                <Input value={volume} onChange={e => setVolume(e.target.value)} type="number" placeholder="0.00" className="bg-input border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Price/Litre {selectedPrice && <span className="text-primary">UGX {parseFloat(selectedPrice.pricePerUnit).toLocaleString()}</span>}
                </Label>
                <Input value={calculatedAmount} onChange={e => setAmount(e.target.value)} type="number" placeholder="0" className="bg-input border-border" />
              </div>
            </div>
          )}

          {transactionType !== 'fuel_sale' && (
            <div>
              <Label className="text-xs text-muted-foreground">Amount (UGX)</Label>
              <Input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="0" className="bg-input border-border" />
            </div>
          )}

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Payment Method</Label>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map(pm => (
                <button
                  key={pm.id}
                  onClick={() => setPaymentMethod(pm.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-medium ${paymentMethod === pm.id ? pm.bg + ' border-opacity-100' : 'bg-secondary/50 border-border hover:border-primary/30'}`}
                >
                  <pm.icon className={`w-4 h-4 ${paymentMethod === pm.id ? pm.color : 'text-muted-foreground'}`} />
                  <span className={paymentMethod === pm.id ? pm.color : 'text-muted-foreground'}>{pm.label}</span>
                </button>
              ))}
            </div>
          </div>

          {(paymentMethod === 'mtn_momo' || paymentMethod === 'airtel_money') && (
            <div className="space-y-3">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <p className="text-xs text-amber-600 font-medium mb-1">
                  {paymentMethod === 'mtn_momo' ? '📱 MTN Mobile Money' : '📱 Airtel Money'} Payment
                </p>
                <p className="text-xs text-muted-foreground">
                  {paymentMethod === 'mtn_momo'
                    ? 'Customer dials *165# → Send Money → Enter amount. Confirm payment before completing transaction.'
                    : 'Customer dials *185# → Send Money → Enter amount. Confirm payment before completing transaction.'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Customer Phone Number *</Label>
                <Input value={mobilePhone} onChange={e => setMobilePhone(e.target.value)} placeholder="+256 7XX XXX XXX" className="bg-input border-border" />
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs text-muted-foreground">Loyalty Card (NFC/RFID) — Optional</Label>
            <Input value={loyaltyCard} onChange={e => setLoyaltyCard(e.target.value)} placeholder="Scan or enter card ID" className="bg-input border-border" />
          </div>

          <div className="bg-secondary/50 rounded-xl p-4 flex items-center justify-between">
            <span className="text-muted-foreground font-medium">Total Amount</span>
            <span className="text-2xl font-bold text-primary">UGX {parseFloat(totalAmount || '0').toLocaleString()}</span>
          </div>

          <Button onClick={handleSubmit} disabled={createTx.isPending} className="w-full h-12 text-base gap-2">
            <Zap className="w-5 h-5" />
            {createTx.isPending ? 'Processing...' : 'Complete Transaction'}
          </Button>
        </CardContent>
      </Card>

      {/* Receipt Dialog */}
      <Dialog open={!!receipt} onOpenChange={() => setReceipt(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-emerald-600" />Transaction Complete</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <p className="text-emerald-600 font-bold text-lg">UGX {parseFloat(totalAmount).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Payment Received</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Receipt #</span><span className="font-mono text-primary">{receipt?.receiptNumber}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">URA Code</span><span className="font-mono text-xs">{receipt?.uraCode}</span></div>
            </div>
            {receipt?.qrCode && (
              <div className="text-center">
                <img src={receipt.qrCode} alt="QR" className="w-28 h-28 mx-auto" />
                <p className="text-xs text-muted-foreground mt-1">URA Verification QR Code</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={() => window.print()} variant="outline" className="flex-1 gap-2"><QrCode className="w-4 h-4" />Print Receipt</Button>
              <Button onClick={() => { setReceipt(null); setVolume(''); setAmount(''); setLoyaltyCard(''); }} className="flex-1">New Sale</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

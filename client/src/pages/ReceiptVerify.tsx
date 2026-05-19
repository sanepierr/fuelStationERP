import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Search, QrCode, Shield } from "lucide-react";
import { useState } from "react";

export default function ReceiptVerify() {
  const [receiptNumber, setReceiptNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { data: receipt, isLoading, error } = trpc.transactions.byReceipt.useQuery(
    { receiptNumber: searchQuery },
    { enabled: !!searchQuery }
  );

  const handleSearch = () => {
    if (receiptNumber.trim()) setSearchQuery(receiptNumber.trim());
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Receipt Verification</h1>
          <p className="text-muted-foreground text-sm mt-1">Verify fuel transaction receipts — compliant with Uganda Revenue Authority (URA)</p>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex gap-2">
              <Input
                value={receiptNumber}
                onChange={e => setReceiptNumber(e.target.value)}
                placeholder="Enter receipt number (e.g. RCP-123456)"
                className="bg-input border-border flex-1"
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isLoading} className="gap-2">
                <Search className="w-4 h-4" />Verify
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading && (
          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-muted-foreground">Verifying receipt...</p>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="p-6 text-center">
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <h3 className="font-bold text-red-400 text-lg">Receipt Not Found</h3>
              <p className="text-muted-foreground text-sm mt-1">No valid receipt found with number: <strong>{searchQuery}</strong></p>
              <p className="text-xs text-muted-foreground mt-2">This receipt may be invalid, tampered, or not issued by a FuelSync-registered station.</p>
            </CardContent>
          </Card>
        )}

        {receipt && (
          <Card className="bg-emerald-500/10 border-emerald-500/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-10 h-10 text-emerald-400 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-emerald-400 text-lg">Receipt Verified</h3>
                  <p className="text-xs text-muted-foreground">This receipt is authentic and URA-compliant</p>
                </div>
              </div>

              <div className="space-y-3 border-t border-emerald-500/20 pt-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground text-xs">Receipt #</p><p className="font-mono font-bold text-foreground">{receipt.receiptNumber}</p></div>
                  <div><p className="text-muted-foreground text-xs">Date</p><p className="font-medium text-foreground">{new Date(receipt.createdAt).toLocaleString()}</p></div>
                  <div><p className="text-muted-foreground text-xs">Station</p><p className="font-medium text-foreground">{(receipt as any).stationName || 'FuelSync Station'}</p></div>
                  <div><p className="text-muted-foreground text-xs">Fuel Type</p><p className="font-medium text-foreground">{(receipt as any).fuelTypeName || receipt.transactionType}</p></div>
                  <div><p className="text-muted-foreground text-xs">Volume</p><p className="font-bold text-foreground">{receipt.fuelVolume ? parseFloat(receipt.fuelVolume).toFixed(2) : '—'}L</p></div>
                  <div><p className="text-muted-foreground text-xs">Unit Price</p><p className="font-medium text-foreground">UGX {receipt.pricePerUnit ? parseFloat(receipt.pricePerUnit).toLocaleString() : '—'}/L</p></div>
                  <div><p className="text-muted-foreground text-xs">Amount Paid</p><p className="font-bold text-emerald-400 text-lg">UGX {parseFloat(receipt.totalAmount).toLocaleString()}</p></div>
                  <div><p className="text-muted-foreground text-xs">Payment Method</p><Badge variant="outline" className="badge-info capitalize">{receipt.paymentMethod?.replace(/_/g, ' ')}</Badge></div>
                </div>

                <div className="flex items-center gap-2 bg-emerald-500/10 rounded-lg p-3 mt-2">
                  <QrCode className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-400">URA Fiscal Receipt</p>
                    <p className="text-xs text-muted-foreground">TIN: {(receipt as any).stationTin || 'N/A'} · Verified by FuelSync Pro</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Powered by <strong>FuelSync Pro</strong> · Compliant with Uganda Revenue Authority fiscal requirements
        </p>
      </div>
    </div>
  );
}

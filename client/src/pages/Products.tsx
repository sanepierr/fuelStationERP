import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Package, Plus, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

const categoryColors: Record<string, string> = {
  gas: 'bg-blue-500/20 text-blue-600 border border-blue-500/30',
  lubes: 'bg-amber-500/20 text-amber-600 border border-amber-500/30',
  tyres: 'bg-gray-500/20 text-gray-500 border border-gray-500/30',
  accessories: 'bg-purple-500/20 text-purple-600 border border-purple-500/30',
  food: 'bg-green-500/20 text-green-600 border border-green-500/30',
  other: 'bg-muted text-muted-foreground border border-border',
};

export default function Products() {
  const [stationId, setStationId] = useState<string>('');
  const [addOpen, setAddOpen] = useState(false);
  const { data: stations } = trpc.stations.list.useQuery();
  const activeStationId = parseInt(stationId) || stations?.[0]?.id || 1;
  const { data: products, isLoading, refetch } = trpc.products.list.useQuery({ stationId: activeStationId });
  const createProduct = trpc.products.create.useMutation({ onSuccess: () => { toast.success("Product added"); setAddOpen(false); refetch(); } });
  const { register, handleSubmit } = useForm();

  const lowStock = products?.filter(p => parseFloat(p.stockQuantity) <= parseFloat(p.minStockLevel || '0')) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground text-sm">Gas, lubes, tyres, accessories and other station products</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={stationId} onValueChange={setStationId}>
            <SelectTrigger className="w-48 bg-input border-border"><SelectValue placeholder="Select station" /></SelectTrigger>
            <SelectContent>{stations?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />Add Product</Button></DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(d => createProduct.mutate({ name: d.name, sku: d.sku || undefined, category: d.category || undefined, unit: d.unit || undefined, stationId: activeStationId, sellingPrice: String(d.sellingPrice), costPrice: d.costPrice ? String(d.costPrice) : undefined, stockQuantity: d.stockQuantity ? String(d.stockQuantity) : '0', minStockLevel: d.minStockLevel ? String(d.minStockLevel) : '0' }))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><Label>Product Name *</Label><Input {...register("name", { required: true })} placeholder="e.g. Engine Oil 5W30" className="bg-input border-border" /></div>
                  <div><Label>SKU</Label><Input {...register("sku")} placeholder="Optional" className="bg-input border-border" /></div>
                  <div><Label>Category</Label>
                    <select {...register("category")} className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground">
                      <option value="gas">Gas (LPG)</option>
                      <option value="lubes">Lubricants</option>
                      <option value="tyres">Tyres</option>
                      <option value="accessories">Accessories</option>
                      <option value="food">Food & Beverages</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div><Label>Unit</Label><Input {...register("unit")} defaultValue="unit" placeholder="unit/litre/kg" className="bg-input border-border" /></div>
                  <div><Label>Selling Price (UGX)</Label><Input {...register("sellingPrice", { required: true })} type="number" placeholder="0" className="bg-input border-border" /></div>
                  <div><Label>Cost Price (UGX)</Label><Input {...register("costPrice")} type="number" placeholder="Optional" className="bg-input border-border" /></div>
                  <div><Label>Stock Quantity</Label><Input {...register("stockQuantity")} type="number" defaultValue="0" className="bg-input border-border" /></div>
                  <div><Label>Min Stock Level</Label><Input {...register("minStockLevel")} type="number" defaultValue="0" className="bg-input border-border" /></div>
                </div>
                <Button type="submit" className="w-full" disabled={createProduct.isPending}>Add Product</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="text-sm text-amber-600">{lowStock.length} product{lowStock.length > 1 ? 's' : ''} at or below minimum stock level</span>
        </div>
      )}

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Product</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Category</th>
              <th className="text-right px-4 py-3 text-muted-foreground font-medium">Stock</th>
              <th className="text-right px-4 py-3 text-muted-foreground font-medium">Selling Price</th>
              <th className="text-right px-4 py-3 text-muted-foreground font-medium">Cost Price</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
            </tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : products?.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground"><Package className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>No products added</p></td></tr>
              ) : products?.map(p => {
                const isLow = parseFloat(p.stockQuantity) <= parseFloat(p.minStockLevel || '0');
                return (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sku || 'No SKU'} · {p.unit}</p>
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline" className={categoryColors[p.category] || categoryColors.other}>{p.category}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <span className={isLow ? 'text-red-600 font-bold' : 'text-foreground'}>{parseFloat(p.stockQuantity).toLocaleString()}</span>
                      {isLow && <AlertTriangle className="w-3 h-3 text-red-600 inline ml-1" />}
                    </td>
                    <td className="px-4 py-3 text-right text-primary font-bold">UGX {parseFloat(p.sellingPrice).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{p.costPrice ? `UGX ${parseFloat(p.costPrice).toLocaleString()}` : '-'}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className={p.isActive ? 'badge-active' : 'badge-inactive'}>{p.isActive ? 'Active' : 'Inactive'}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

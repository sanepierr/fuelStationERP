import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Plus, Printer, Download, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";
import { useAuth } from "@/_core/hooks/useAuth";

const statusColors: Record<string, string> = { draft: 'badge-inactive', sent: 'badge-info', paid: 'badge-active', overdue: 'badge-danger', cancelled: 'badge-warning' };

export default function Invoices() {
  const { user } = useAuth();
  const isAdmin = ['admin', 'owner'].includes(user?.role || '');
  const [addOpen, setAddOpen] = useState(false);
  const { data: invoices, isLoading, refetch } = trpc.invoices.list.useQuery();
  const createInvoice = trpc.invoices.create.useMutation({ onSuccess: () => { toast.success("Invoice created"); setAddOpen(false); refetch(); } });
  const sendInvoice = trpc.invoices.updateStatus.useMutation({ onSuccess: () => { toast.success("Invoice sent"); refetch(); } });
  const { register, handleSubmit, control, watch } = useForm({ defaultValues: { clientName: '', clientEmail: '', dueDate: '', notes: '', items: [{ description: '', quantity: 1, unitPrice: 0, total: 0 }] } });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items');
  const subtotal = items.reduce((s: number, i: any) => s + (parseFloat(i.unitPrice) * parseInt(i.quantity) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground text-sm">{isAdmin ? 'Send invoices to clients for system services' : 'Your invoices from FuelSync'}</p>
        </div>
        {isAdmin && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" />Create Invoice</Button></DialogTrigger>
            <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(d => {
                const sub = d.items.reduce((s: number, i: any) => s + (parseFloat(i.unitPrice) * parseInt(i.quantity) || 0), 0);
                const tax = sub * 0.18;
                createInvoice.mutate({ clientName: d.clientName, clientEmail: d.clientEmail || undefined, items: d.items.map((i: any) => ({ description: i.description, quantity: parseInt(i.quantity), unitPrice: parseFloat(i.unitPrice), total: parseFloat(i.unitPrice) * parseInt(i.quantity) })), subtotal: String(sub), taxAmount: String(tax), totalAmount: String(sub + tax), dueDate: d.dueDate || undefined, notes: d.notes || undefined });
              })} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Client Name *</Label><Input {...register("clientName", { required: true })} className="bg-input border-border" /></div>
                  <div><Label>Client Email</Label><Input {...register("clientEmail")} type="email" className="bg-input border-border" /></div>
                  <div><Label>Due Date</Label><Input {...register("dueDate")} type="date" className="bg-input border-border" /></div>
                </div>
                <div>
                  <Label className="mb-2 block">Line Items</Label>
                  <div className="space-y-2">
                    {fields.map((field, i) => (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5"><Input {...register(`items.${i}.description`)} placeholder="Description" className="bg-input border-border text-xs" /></div>
                        <div className="col-span-2"><Input {...register(`items.${i}.quantity`)} type="number" placeholder="Qty" className="bg-input border-border text-xs" /></div>
                        <div className="col-span-3"><Input {...register(`items.${i}.unitPrice`)} type="number" placeholder="Unit Price" className="bg-input border-border text-xs" /></div>
                        <div className="col-span-1 text-xs text-muted-foreground text-right">{((parseFloat(items[i]?.unitPrice as any) || 0) * (parseInt(items[i]?.quantity as any) || 0)).toLocaleString()}</div>
                        <div className="col-span-1"><Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => remove(i)}>×</Button></div>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ description: '', quantity: 1, unitPrice: 0, total: 0 })}>+ Add Line</Button>
                  </div>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>UGX {subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">VAT (18%)</span><span>UGX {(subtotal * 0.18).toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold"><span>Total</span><span className="text-primary">UGX {(subtotal * 1.18).toLocaleString()}</span></div>
                </div>
                <div><Label>Notes</Label><Textarea {...register("notes")} placeholder="Optional notes..." className="bg-input border-border" /></div>
                <Button type="submit" className="w-full" disabled={createInvoice.isPending}>Create Invoice</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Invoice #</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Client</th>
              <th className="text-right px-4 py-3 text-muted-foreground font-medium">Amount</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Due Date</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
              <th className="text-center px-4 py-3 text-muted-foreground font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : invoices?.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground"><FileText className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>No invoices yet</p></td></tr>
              ) : invoices?.map(inv => (
                <tr key={inv.id} className="border-b border-border/50 hover:bg-secondary/20">
                  <td className="px-4 py-3 font-mono text-xs text-primary">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{inv.clientName}</p>
                    <p className="text-xs text-muted-foreground">{inv.clientEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">UGX {parseFloat(inv.totalAmount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className={statusColors[inv.status] || 'badge-inactive'}>{inv.status}</Badge></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => window.print()}><Printer className="w-3.5 h-3.5" /></Button>
                      {isAdmin && inv.status === 'draft' && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary" onClick={() => sendInvoice.mutate({ id: inv.id, status: 'sent' })}><Send className="w-3.5 h-3.5" /></Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

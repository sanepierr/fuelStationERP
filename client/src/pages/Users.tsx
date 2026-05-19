import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users as UsersIcon, Shield, UserCheck } from "lucide-react";
import { toast } from "sonner";

const roleColors: Record<string, string> = {
  admin: 'badge-danger', owner: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  manager: 'badge-warning', supervisor: 'badge-info', accountant: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
  technician: 'bg-orange-500/20 text-orange-400 border border-orange-500/30', attendant: 'badge-active', user: 'badge-inactive',
};

export default function Users() {
  const { data: users, isLoading, refetch } = trpc.users.list.useQuery();
  const updateUser = trpc.users.update.useMutation({ onSuccess: () => { toast.success("User updated"); refetch(); } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground text-sm">Manage roles and access for all system users</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UsersIcon className="w-4 h-4" />
          <span>{users?.length || 0} total users</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {(['admin', 'owner', 'manager', 'attendant'] as const).map(role => (
          <Card key={role} className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <p className="text-xl font-bold text-foreground">{users?.filter(u => u.role === role).length || 0}</p>
              <Badge variant="outline" className={`${roleColors[role]} mt-1 capitalize`}>{role}s</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary/30">
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">User</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Email</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Role</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium">Joined</th>
              <th className="text-center px-4 py-3 text-muted-foreground font-medium">Change Role</th>
            </tr></thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
              ) : users?.map(u => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-secondary/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground">{u.name || 'Unnamed'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email || '—'}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className={roleColors[u.role] || 'badge-inactive'}>{u.role}</Badge></td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={(u as any).isActive !== false ? 'badge-active' : 'badge-inactive'}>
                      {(u as any).isActive !== false ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-center">
                    <Select value={u.role} onValueChange={v => updateUser.mutate({ id: u.id, role: v as any })}>
                      <SelectTrigger className="w-32 h-7 bg-input border-border text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['admin', 'owner', 'manager', 'supervisor', 'accountant', 'technician', 'attendant', 'user'].map(r => (
                          <SelectItem key={r} value={r} className="text-xs capitalize">{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

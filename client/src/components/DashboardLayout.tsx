import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Camera,
  CreditCard,
  FileText,
  Fuel,
  Gauge,
  LayoutDashboard,
  LogOut,
  Map,
  Package,
  Power,
  Receipt,
  RefreshCw,
  Settings,
  ShieldCheck,
  Ticket,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

const navGroups = [
  {
    label: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
      { icon: Map, label: "Station Map", path: "/map" },
    ],
  },
  {
    label: "Station Operations",
    items: [
      { icon: Building2, label: "Stations", path: "/stations" },
      { icon: Gauge, label: "Tank Gauges", path: "/tanks" },
      { icon: Fuel, label: "Pumps", path: "/pumps" },
      { icon: Truck, label: "Fuel Deliveries", path: "/deliveries" },
      { icon: Users, label: "Pump Attendants", path: "/attendants" },
    ],
  },
  {
    label: "Forecourt & POS",
    items: [
      { icon: Receipt, label: "Transactions", path: "/transactions" },
      { icon: Zap, label: "New Transaction", path: "/transactions/new" },
      { icon: ShieldCheck, label: "Loyalty Program", path: "/loyalty" },
      { icon: Package, label: "Products", path: "/products" },
      { icon: CreditCard, label: "Credit Notes", path: "/credit-notes" },
    ],
  },
  {
    label: "Operations",
    items: [
      { icon: BookOpen, label: "Shifts", path: "/shifts" },
      { icon: RefreshCw, label: "RTT Reconciliation", path: "/rtt" },
      { icon: BarChart3, label: "Reports", path: "/reports" },
    ],
  },
  {
    label: "Management",
    items: [
      { icon: Ticket, label: "Support Tickets", path: "/tickets" },
      { icon: FileText, label: "Invoices", path: "/invoices" },
      { icon: Users, label: "User Management", path: "/users" },
    ],
  },
  {
    label: "System",
    items: [
      { icon: Power, label: "Pump Control", path: "/pump-control" },
      { icon: Camera, label: "CCTV", path: "/cctv" },
      { icon: Settings, label: "Settings", path: "/settings" },
    ],
  },
];

const SIDEBAR_WIDTH_KEY = "fuelsync-sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 380;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-6 p-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Fuel className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">FuelSync Pro</h1>
              <p className="text-xs text-muted-foreground">Station Management System</p>
            </div>
          </div>
          <Button onClick={() => { window.location.href = getLoginUrl(); }} size="lg" className="px-8">
            Sign In to Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({ children, setSidebarWidth }: { children: React.ReactNode; setSidebarWidth: (w: number) => void }) {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { data: notifications } = trpc.notifications.list.useQuery(undefined, { refetchInterval: 30000 });
  const { data: tankAlerts } = trpc.tankAlerts.list.useQuery(undefined, { refetchInterval: 60000 });
  const unreadNotifs = notifications?.filter(n => !n.isRead).length || 0;
  const tankAlertCount = tankAlerts?.length || 0;
  const unreadCount = unreadNotifs + tankAlertCount;
  const { data: dashStats } = trpc.dashboard.stats.useQuery(undefined, { refetchInterval: 60000 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const roleColors: Record<string, string> = {
    admin: "bg-red-500/20 text-red-600",
    owner: "bg-purple-500/20 text-purple-600",
    manager: "bg-blue-500/20 text-blue-600",
    supervisor: "bg-cyan-500/20 text-cyan-700",
    accountant: "bg-green-500/20 text-green-600",
    technician: "bg-orange-500/20 text-orange-400",
    attendant: "bg-yellow-500/20 text-yellow-600",
    user: "bg-gray-500/20 text-gray-500",
  };

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
          <SidebarHeader className="h-16 border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-3 h-full">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <Fuel className="w-4 h-4 text-primary-foreground" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="text-sm font-bold text-sidebar-foreground truncate">FuelSync Pro</p>
                  <p className="text-xs text-muted-foreground truncate">Management System</p>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="overflow-y-auto">
            <div className="flex flex-col py-2">
              {/* Tank Alerts Banner */}
              {!isCollapsed && dashStats && (dashStats.tankAlerts ?? 0) > 0 && (
                <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="text-xs text-amber-600">{dashStats.tankAlerts ?? 0} tank alert{(dashStats.tankAlerts ?? 0) > 1 ? 's' : ''}</span>
                </div>
              )}

              {navGroups.map((group, gi) => (
                <div key={group.label} className={gi > 0 ? "mt-4" : ""}>
                  {!isCollapsed && (
                    <p className="text-[10px] font-semibold text-sidebar-foreground/35 uppercase tracking-widest px-4 mb-1">
                      {group.label}
                    </p>
                  )}
                  <div className="flex flex-col gap-0.5 px-2">
                    {group.items.map((item) => {
                      const isActive = location === item.path || (item.path !== '/' && location.startsWith(item.path));
                      return (
                        <SidebarMenuButton
                          key={item.path}
                          isActive={isActive}
                          onClick={() => navigate(item.path)}
                          tooltip={item.label}
                          className={`h-8 w-full rounded-md text-sm transition-all flex items-center gap-2 px-2 ${
                            isActive
                              ? 'bg-white/15 text-white font-medium'
                              : 'text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-white/8'
                          }`}
                        >
                          <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-sidebar-foreground/50'}`} />
                          {!isCollapsed && <span className="truncate">{item.label}</span>}
                        </SidebarMenuButton>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors w-full text-left focus:outline-none">
                  <Avatar className="h-8 w-8 shrink-0 border border-sidebar-border">
                    <AvatarFallback className="text-xs font-semibold bg-primary/20 text-primary">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-sidebar-foreground truncate">{user?.name || 'User'}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${roleColors[user?.role || 'user'] || roleColors.user}`}>
                        {user?.role || 'user'}
                      </span>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="bg-background">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/95 backdrop-blur px-4">
          <SidebarTrigger className="h-8 w-8 rounded-lg hover:bg-accent transition-colors" />
          <div className="flex-1" />
          
          {/* Live Stats Pills */}
          {dashStats && (
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-600 font-medium">{dashStats.totalStations} Stations</span>
              </div>
              <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1">
                <span className="text-xs text-blue-600 font-medium">{dashStats.activeShifts} Active Shifts</span>
              </div>
            </div>
          )}
          
          {/* Notifications Bell Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative h-8 w-8 rounded-lg hover:bg-accent transition-colors flex items-center justify-center">
                <Bell className="h-4 w-4 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-semibold">Notifications</p>
              </div>
              {tankAlertCount > 0 && (
                <>
                  <div className="px-3 py-1.5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Tank Alerts</p>
                  </div>
                  {tankAlerts?.map(alert => (
                    <DropdownMenuItem key={alert.id} className="flex flex-col items-start gap-0.5 px-3 py-2 cursor-pointer" onClick={() => navigate('/tanks')}>
                      <div className="flex items-center gap-2 w-full">
                        <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${alert.status === 'critical' ? 'text-red-600' : 'text-yellow-600'}`} />
                        <span className="text-sm font-medium truncate">{alert.stationName} - {alert.fuelTypeName}</span>
                        <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${alert.status === 'critical' ? 'bg-red-500/20 text-red-600' : 'bg-yellow-500/20 text-yellow-600'}`}>{alert.status}</span>
                      </div>
                      <span className="text-xs text-muted-foreground ml-5">{alert.name} - {Number(alert.currentLevel).toLocaleString()}L remaining</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              {unreadNotifs > 0 && (
                <>
                  <div className="px-3 py-1.5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">System</p>
                  </div>
                  {notifications?.filter(n => !n.isRead).slice(0, 5).map(n => (
                    <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 px-3 py-2">
                      <span className="text-sm font-medium">{n.title}</span>
                      <span className="text-xs text-muted-foreground">{n.message}</span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              {unreadCount === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">No new notifications</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="text-xs text-muted-foreground hidden sm:block">
            {new Date().toLocaleDateString('en-UG', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </SidebarInset>
    </>
  );

}

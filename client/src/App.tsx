import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import { getLoginUrl } from "./const";
import { Loader2, Fuel } from "lucide-react";

// Pages
import Dashboard from "./pages/Dashboard";
import Stations from "./pages/Stations";
import StationDetail from "./pages/StationDetail";
import Tanks from "./pages/Tanks";
import Pumps from "./pages/Pumps";
import Transactions from "./pages/Transactions";
import NewTransaction from "./pages/NewTransaction";
import Deliveries from "./pages/Deliveries";
import Loyalty from "./pages/Loyalty";
import Products from "./pages/Products";
import Shifts from "./pages/Shifts";
import Reports from "./pages/Reports";
import Tickets from "./pages/Tickets";
import TicketDetail from "./pages/TicketDetail";
import Invoices from "./pages/Invoices";
import CreditNotes from "./pages/CreditNotes";
import Users from "./pages/Users";
import Attendants from "./pages/Attendants";
import RTT from "./pages/RTT";
import StationMap from "./pages/StationMap";
import ReceiptVerify from "./pages/ReceiptVerify";
import DashboardLayout from "./components/DashboardLayout";

function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Fuel className="w-7 h-7 text-primary-foreground" />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-bold text-foreground">FuelSync Pro</h1>
            <p className="text-xs text-muted-foreground">Station Management System</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-8 max-w-sm mx-auto shadow-xl">
          <h2 className="text-xl font-semibold text-foreground mb-2">Welcome Back</h2>
          <p className="text-muted-foreground text-sm mb-6">Sign in to access your fuel station management portal</p>
          <a
            href={getLoginUrl()}
            className="block w-full bg-primary text-primary-foreground py-3 px-6 rounded-xl font-semibold text-center hover:opacity-90 transition-opacity"
          >
            Sign In to FuelSync Pro
          </a>
        </div>
        <p className="text-xs text-muted-foreground">Secure, role-based access for all station personnel</p>
      </div>
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Loading FuelSync Pro...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) return <LoginPage />;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/verify/:receipt" component={ReceiptVerify} />
      <Route>
        <AuthGuard>
          <DashboardLayout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/stations" component={Stations} />
              <Route path="/stations/:id" component={StationDetail} />
              <Route path="/tanks" component={Tanks} />
              <Route path="/pumps" component={Pumps} />
              <Route path="/transactions" component={Transactions} />
              <Route path="/transactions/new" component={NewTransaction} />
              <Route path="/deliveries" component={Deliveries} />
              <Route path="/loyalty" component={Loyalty} />
              <Route path="/products" component={Products} />
              <Route path="/shifts" component={Shifts} />
              <Route path="/reports" component={Reports} />
              <Route path="/tickets" component={Tickets} />
              <Route path="/tickets/:id" component={TicketDetail} />
              <Route path="/invoices" component={Invoices} />
              <Route path="/credit-notes" component={CreditNotes} />
              <Route path="/users" component={Users} />
              <Route path="/attendants" component={Attendants} />
              <Route path="/rtt" component={RTT} />
              <Route path="/map" component={StationMap} />
              <Route path="/404" component={NotFound} />
              <Route component={NotFound} />
            </Switch>
          </DashboardLayout>
        </AuthGuard>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

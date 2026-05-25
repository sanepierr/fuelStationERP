import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import { Loader2, Fuel } from "lucide-react";
import { useState } from "react";
import { trpc } from "./lib/trpc";

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
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const utils = trpc.useUtils();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body: Record<string, string> = { email, password };
      if (mode === "register" && name) body.name = name;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      await utils.auth.me.invalidate();
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Fuel className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">FuelSync Pro</h1>
            <p className="text-xs text-muted-foreground">Station Management System</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
          <h2 className="text-xl font-semibold text-foreground mb-1">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            {mode === "login" ? "Sign in to your account" : "Register a new account"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min 8 characters"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && (
              <p className="text-destructive text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2.5 px-6 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="text-primary hover:underline font-medium"
            >
              {mode === "login" ? "Register" : "Sign in"}
            </button>
          </p>
        </div>
        <p className="text-center text-xs text-muted-foreground">Secure, role-based access for all station personnel</p>
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

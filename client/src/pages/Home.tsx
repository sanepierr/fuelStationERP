import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { Fuel, BarChart2, Shield, Wifi, MapPin, CreditCard, Zap, Users, ArrowRight, CheckCircle } from "lucide-react";
import { useEffect } from "react";

const features = [
  { icon: Fuel, title: "Fuel Tracking", desc: "Track fuel from depot to station, delivery, offloading, and every litre dispensed at the forecourt." },
  { icon: BarChart2, title: "Live Dashboard", desc: "Real-time KPIs, tank levels, sales metrics, and multi-station performance on one screen." },
  { icon: Shield, title: "Role-Based Access", desc: "Admin, Owner, Manager, Supervisor, Accountant, Technician, and Attendant roles with granular permissions." },
  { icon: Wifi, title: "ATG Integration", desc: "Automatic Tank Gauge integration for live tank level monitoring and alerts." },
  { icon: MapPin, title: "Geo-Location Map", desc: "Interactive map showing all connected stations with live status indicators." },
  { icon: CreditCard, title: "Multi-Payment", desc: "Cash, MTN MoMo, Airtel Money, Visa, Credit Sales, and Prepaid accounts." },
  { icon: Zap, title: "Loyalty Program", desc: "NFC/RFID-based loyalty cards with points earning and redemption for fuel consumers." },
  { icon: Users, title: "Pump Attendants", desc: "Register attendants with NFC/RFID tags - only registered attendants can operate pumps." },
];

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading FuelSync Pro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Fuel className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">FuelSync <span className="text-primary">Pro</span></span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/verify" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Verify Receipt</a>
            <Button onClick={() => window.location.href = getLoginUrl()} className="gap-2">
              Sign In <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="relative max-w-7xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-xs text-primary font-medium mb-6">
            <Zap className="w-3.5 h-3.5" />Uganda's Most Advanced Fuel Station Management Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-foreground mb-6 leading-tight">
            Complete Fuel Station<br /><span className="text-primary">Management System</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            From depot to forecourt - track every litre, every transaction, every shilling. 
            URA-compliant receipts, live ATG monitoring, loyalty programs, and multi-station dashboards.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button size="lg" onClick={() => window.location.href = getLoginUrl()} className="gap-2 px-8 h-12 text-base">
              Get Started <ArrowRight className="w-5 h-5" />
            </Button>
            <a href="/verify">
              <Button size="lg" variant="outline" className="gap-2 px-8 h-12 text-base bg-transparent">
                Verify a Receipt
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '24/7', label: 'Live Monitoring' },
            { value: '8+', label: 'User Roles' },
            { value: 'URA', label: 'Compliant Receipts' },
            { value: 'NFC/RFID', label: 'Loyalty Cards' },
          ].map(stat => (
            <div key={stat.label}>
              <p className="text-3xl font-extrabold text-primary mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-3">Everything You Need to Run Your Station</h2>
          <p className="text-muted-foreground">A complete platform built for Uganda's fuel industry</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(f => (
            <div key={f.title} className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Compliance */}
      <section className="bg-card/50 border-y border-border">
        <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">URA-Compliant Fiscal Receipts</h2>
            <p className="text-muted-foreground mb-6">Every transaction generates a QR-coded, verifiable receipt compliant with Uganda Revenue Authority requirements. Customers can verify receipts online instantly.</p>
            <div className="space-y-3">
              {['QR code on every receipt', 'TIN number embedded', 'Online verification portal', 'Tamper-proof audit trail', 'Downloadable in PDF/CSV/Excel'].map(item => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Fuel className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground">FuelSync Pro Receipt</p>
                <p className="text-xs text-muted-foreground">RCP-{Date.now().toString().slice(-6)}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Fuel Type</span><span className="text-foreground">Petrol (ULP)</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Volume</span><span className="text-foreground">20.00 L</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Price/L</span><span className="text-foreground">UGX 5,200</span></div>
              <div className="flex justify-between font-bold border-t border-border pt-2"><span className="text-foreground">Total</span><span className="text-primary">UGX 104,000</span></div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-xs text-emerald-600 text-center">
              ✓ URA Verified · TIN: 1000123456
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Transform Your Station Operations?</h2>
        <p className="text-muted-foreground mb-8">Join fuel stations across Uganda using FuelSync Pro for complete operational control.</p>
        <Button size="lg" onClick={() => window.location.href = getLoginUrl()} className="gap-2 px-10 h-12 text-base">
          Start Managing Your Station <ArrowRight className="w-5 h-5" />
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Fuel className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">FuelSync Pro</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} FuelSync Pro. Built for Uganda's fuel industry.</p>
          <a href="/verify" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Verify Receipt</a>
        </div>
      </footer>
    </div>
  );
}

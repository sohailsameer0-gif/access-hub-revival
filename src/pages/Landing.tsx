import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { UtensilsCrossed, QrCode, ShoppingCart, Receipt, Smartphone, ChevronRight, Sun, Moon } from 'lucide-react';
import heroImage from '@/assets/hero-illustration.jpg';
import logoImage from '@/assets/menuqr-logo.png';
import { useTheme } from '@/lib/theme';
import { useAuth } from '@/lib/auth';

const features = [
  { icon: UtensilsCrossed, title: 'Digital Menu', description: 'Create a beautiful digital menu your customers can browse on their phones.' },
  { icon: QrCode, title: 'QR Code Ordering', description: 'Each table gets its own QR code. Customers scan and order instantly.' },
  { icon: ShoppingCart, title: 'Live Orders', description: 'See orders in real-time on your dashboard with table numbers.' },
  { icon: Receipt, title: 'Easy Billing', description: 'Customers request bills from their phone. Accept cash or mobile payments.' },
];

const steps = [
  { step: '1', title: 'Sign Up Free', description: 'Create your account and get 7 days free demo.' },
  { step: '2', title: 'Set Up Menu', description: 'Add your categories, items, prices and images.' },
  { step: '3', title: 'Print QR Codes', description: 'Download QR codes for each table and place them.' },
  { step: '4', title: 'Start Receiving Orders', description: 'Customers scan, order, and you manage everything.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, isAdmin, isOutletOwner, loading } = useAuth();
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Auto-redirect signed-in users (incl. OAuth callbacks landing on "/") to their panel.
  useEffect(() => {
    if (loading || !user) return;
    if (isAdmin) navigate('/admin', { replace: true });
    else if (isOutletOwner) navigate('/outlet', { replace: true });
  }, [user, isAdmin, isOutletOwner, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={logoImage}
              alt="MenuQR logo"
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg object-contain"
              decoding="async"
            />
            <span className="font-heading text-xl font-bold text-foreground">MenuQR</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              aria-label="Toggle theme"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/auth')}>Sign In</Button>
            <Button variant="hero" onClick={() => navigate('/auth')}>Start Free Demo</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-12 md:py-20">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full border bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground">
              <Smartphone className="h-4 w-4" />
              Made for Pakistan
            </div>
            <h1 className="font-heading text-4xl font-extrabold tracking-tight text-foreground md:text-5xl lg:text-6xl text-balance">
              QR Menu & Ordering for Your Restaurant
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              Let your customers scan, browse your menu, order from their table, and request the bill — all from their phone. No app download needed.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="hero" size="lg" className="text-base px-8" onClick={() => navigate('/auth')}>
                Start Free Demo <ChevronRight className="ml-1 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="text-base" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                See How It Works
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">✓ 7 days free &nbsp; ✓ No credit card &nbsp; ✓ PKR currency</p>
          </div>
          <div className="relative animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <img src={heroImage} alt="QR menu ordering illustration" className="rounded-2xl shadow-card-hover w-full" loading="lazy" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t bg-muted/30 py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl font-bold text-foreground">Everything You Need</h2>
            <p className="mt-2 text-muted-foreground">Simple tools for restaurants, cafes, hotels, and fast food outlets</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <div key={i} className="rounded-xl border bg-card p-6 shadow-card hover:shadow-card-hover transition-shadow">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
                  <f.icon className="h-6 w-6 text-accent-foreground" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-card-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl font-bold text-foreground">How It Works</h2>
            <p className="mt-2 text-muted-foreground">Get started in minutes</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full gradient-primary text-primary-foreground font-heading text-xl font-bold">{s.step}</div>
                <h3 className="font-heading text-lg font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/30 py-16">
        <div className="container text-center">
          <h2 className="font-heading text-3xl font-bold text-foreground">Ready to Digitize Your Menu?</h2>
          <p className="mt-2 text-muted-foreground mb-6">Start your 7-day free demo today. No credit card required.</p>
          <Button variant="hero" size="lg" className="text-base px-8" onClick={() => navigate('/auth')}>
            Start Free Demo <ChevronRight className="ml-1 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} MenuQR — QR Menu & Ordering Platform for Pakistan</p>
        </div>
      </footer>
    </div>
  );
}

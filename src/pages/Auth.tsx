import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { lovable } from '@/integrations/lovable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Eye, EyeOff, UtensilsCrossed, Loader2 } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signUp, resetPassword, user, isAdmin, isOutletOwner } = useAuth();
  const navigate = useNavigate();

  // Role-based post-login redirect: admin -> /admin, outlet -> /outlet.
  // Done in an effect to avoid "navigate during render" warnings and Google-OAuth races.
  useEffect(() => {
    if (!user) return;
    if (isAdmin) navigate('/admin', { replace: true });
    else if (isOutletOwner) navigate('/outlet', { replace: true });
    // If roles haven't loaded yet, the next auth-state tick will re-run this effect.
  }, [user, isAdmin, isOutletOwner, navigate]);

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: `${window.location.origin}/auth/callback`,
      });

      if (result.error) {
        console.error('[GoogleSignIn] error:', result.error);
        toast.error(result.error.message || 'Google sign-in failed');
        return;
      }
      if (result.redirected) return; // browser is redirecting to Google
      // Tokens received & session set — useEffect handles role-based redirect
    } catch (err: any) {
      console.error('[GoogleSignIn] exception:', err);
      toast.error(err?.message || 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success('Welcome back!');
        // The redirect happens in the useEffect once auth + roles update.
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password);
        if (error) throw error;
        toast.success('Account created! Check your email to verify.');
      } else {
        const { error } = await resetPassword(email);
        if (error) throw error;
        toast.success('Password reset email sent!');
        setMode('login');
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
            <UtensilsCrossed className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="font-heading text-2xl">
            {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Start Free Demo' : 'Reset Password'}
          </CardTitle>
          <CardDescription>
            {mode === 'login' ? 'Sign in to manage your outlet' : mode === 'signup' ? 'Get 7 days free to try everything' : "We'll send you a reset link"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode !== 'forgot' && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center gap-2"
                size="lg"
                disabled={googleLoading}
                onClick={handleGoogleSignIn}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {googleLoading ? 'Please wait...' : mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
              </Button>

              <div className="relative my-4">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                  or
                </span>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            {mode !== 'forgot' && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            <Button type="submit" className="w-full" variant={mode === 'signup' ? 'hero' : 'default'} size="lg" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Start Free Demo' : 'Send Reset Link'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground space-y-1">
            {mode === 'login' && (
              <>
                <button className="text-primary hover:underline block mx-auto" onClick={() => setMode('forgot')}>Forgot password?</button>
                <p>Don't have an account? <button className="text-primary hover:underline font-semibold" onClick={() => setMode('signup')}>Start Free Demo</button></p>
              </>
            )}
            {mode === 'signup' && (
              <p>Already have an account? <button className="text-primary hover:underline font-semibold" onClick={() => setMode('login')}>Sign In</button></p>
            )}
            {mode === 'forgot' && (
              <button className="text-primary hover:underline" onClick={() => setMode('login')}>Back to Sign In</button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

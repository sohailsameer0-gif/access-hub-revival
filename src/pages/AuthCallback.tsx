import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

/**
 * OAuth callback landing page.
 *
 * The Lovable Cloud managed OAuth broker returns the user here after a
 * successful Google sign-in. The session has typically already been set
 * by `lovable.auth.signInWithOAuth(...).setSession(...)` before redirect,
 * but on hosted environments the page can be re-loaded fresh — in that
 * case we also handle:
 *   1. Supabase implicit-flow hash tokens (#access_token=...&refresh_token=...)
 *   2. Supabase PKCE flow ?code=... callbacks
 *
 * Once a session exists, the AuthProvider's role check populates
 * isAdmin / isOutletOwner and we redirect into the right panel.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { user, isAdmin, isOutletOwner, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // 1. Try to recover a session from URL fragments / query params on first mount.
  useEffect(() => {
    let cancelled = false;

    const recoverSession = async () => {
      try {
        const url = new URL(window.location.href);
        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.slice(1)
          : window.location.hash;
        const hashParams = new URLSearchParams(hash);

        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');
        const code = url.searchParams.get('code');
        const errParam = url.searchParams.get('error_description') || hashParams.get('error_description');

        if (errParam) {
          if (!cancelled) setError(errParam);
          return;
        }

        // Implicit flow tokens in URL hash
        if (access_token && refresh_token) {
          const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
          if (setErr && !cancelled) setError(setErr.message);
          // Clean the hash so tokens don't sit in the URL bar
          window.history.replaceState({}, '', window.location.pathname);
          return;
        }

        // PKCE flow ?code=...
        if (code) {
          const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchErr && !cancelled) setError(exchErr.message);
          window.history.replaceState({}, '', window.location.pathname);
          return;
        }
        // Otherwise: session was already set client-side before redirect; nothing to do.
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Authentication failed');
      }
    };

    recoverSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Once auth state is known, route the user to the correct panel.
  useEffect(() => {
    if (loading) return;
    if (!user) return; // wait for session pick-up
    if (isAdmin) {
      navigate('/admin', { replace: true });
    } else if (isOutletOwner) {
      navigate('/outlet', { replace: true });
    } else {
      // Authenticated but no role yet — send to home; AuthProvider will catch up.
      navigate('/', { replace: true });
    }
  }, [user, isAdmin, isOutletOwner, loading, navigate]);

  // 3. On hard error, surface message and offer fallback.
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-3 p-4 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">
        {error ? 'Sign-in failed. Redirecting…' : 'Completing sign-in…'}
      </p>
      {error && (
        <button
          className="text-sm text-primary hover:underline"
          onClick={() => navigate('/auth', { replace: true })}
        >
          Back to sign in
        </button>
      )}
    </div>
  );
}

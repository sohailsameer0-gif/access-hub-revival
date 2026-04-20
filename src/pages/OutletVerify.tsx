import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOutletAccess } from '@/hooks/useOutletAccess';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ShieldCheck, Clock, Ban, XCircle, Mail, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { logActivity } from '@/lib/activityLog';

export default function OutletVerify() {
  const { data: access, isLoading, refresh } = useOutletAccess();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (access?.status === 'verified') {
      navigate('/outlet', { replace: true });
    }
  }, [access?.status, navigate]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setErrorMsg('Please enter all 6 digits.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    const { data, error } = await supabase.rpc('verify_outlet_otp' as any, { _code: code });
    setSubmitting(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }
    const res = data as any;
    if (res?.ok) {
      toast.success('Verified! Welcome aboard.');
      await logActivity({
        action: 'outlet.access_approve' as any,
        entity_type: 'outlet',
        entity_id: access?.outlet_id ?? null,
        metadata: { event: 'otp_verified' },
      });
      refresh();
      navigate('/outlet', { replace: true });
    } else {
      setCode('');
      setErrorMsg(res?.message ?? 'Verification failed.');
      refresh();
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const status = access?.status ?? 'pending';
  const attemptsLeft = access ? Math.max(access.otp_max_attempts - access.otp_attempts, 0) : 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="font-heading text-2xl">Account Verification</CardTitle>
          <CardDescription>
            For your security, your outlet panel needs to be unlocked.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {status === 'pending' && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle>Awaiting admin approval</AlertTitle>
              <AlertDescription>
                Your account is being reviewed. Once approved, the admin will share a 6-digit code with you to unlock your panel.
              </AlertDescription>
            </Alert>
          )}

          {status === 'rejected' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Application rejected</AlertTitle>
              <AlertDescription>
                {access?.rejected_reason || 'Your application was not approved. Please contact support.'}
              </AlertDescription>
            </Alert>
          )}

          {status === 'blocked' && (
            <Alert variant="destructive">
              <Ban className="h-4 w-4" />
              <AlertTitle>Account locked</AlertTitle>
              <AlertDescription>
                Too many wrong codes were entered. Please contact admin to unblock your account and issue a new code.
              </AlertDescription>
            </Alert>
          )}

          {status === 'approved' && (
            <>
              <Alert className="border-primary/30 bg-primary/5">
                <Mail className="h-4 w-4" />
                <AlertTitle>Enter your verification code</AlertTitle>
                <AlertDescription>
                  Your account was approved. Enter the 6-digit code shared by the admin to activate your panel.
                  {access?.otp_expires_at && (
                    <div className="text-xs mt-1.5 text-muted-foreground">
                      Code expires {new Date(access.otp_expires_at).toLocaleString()}
                    </div>
                  )}
                </AlertDescription>
              </Alert>

              <div className="flex justify-center py-2">
                <InputOTP maxLength={6} value={code} onChange={setCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {errorMsg && (
                <Alert variant="destructive">
                  <AlertDescription className="flex items-center justify-between gap-2">
                    <span>{errorMsg}</span>
                    {attemptsLeft > 0 && attemptsLeft < access!.otp_max_attempts && (
                      <span className="text-xs font-medium whitespace-nowrap">{attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} left</span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={handleVerify} disabled={submitting || code.length !== 6} className="w-full" size="lg">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Verify & Unlock Panel
              </Button>
            </>
          )}

          <div className="pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full text-muted-foreground">
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

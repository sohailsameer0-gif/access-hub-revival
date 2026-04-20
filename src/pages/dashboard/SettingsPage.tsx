import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useOutlet, useSubscriptionStatus } from '@/hooks/useData';
import { useOutletAccess } from '@/hooks/useOutletAccess';
import { useTheme } from '@/lib/theme';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Sun, Moon, Monitor, Shield, AlertTriangle, Eye, EyeOff, KeyRound, CheckCircle2, Mail, Loader2, Clock } from 'lucide-react';
import PasswordStrengthMeter, { isPasswordStrong } from '@/components/PasswordStrengthMeter';
import { logActivity } from '@/lib/activityLog';
import { formatDistanceToNow } from 'date-fns';

export default function SettingsPage() {
  const { user, resetPassword } = useAuth();
  const { data: outlet } = useOutlet();
  const { data: sub } = useSubscriptionStatus(outlet?.id);
  const { data: access, refresh: refreshAccess } = useOutletAccess();
  const { theme, setTheme } = useTheme();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [sendingReset, setSendingReset] = useState(false);

  const passwordsMatch = newPassword === repeatPassword;
  const newIsStrong = isPasswordStrong(newPassword);
  const sameAsCurrent = currentPassword.length > 0 && newPassword.length > 0 && currentPassword === newPassword;
  const canSubmit = currentPassword && newPassword && repeatPassword && passwordsMatch && newIsStrong && !sameAsCurrent;

  const handleChangePassword = async () => {
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!currentPassword) return setErrorMsg('Please enter your current password.');
    if (!newIsStrong) return setErrorMsg('New password does not meet the strength requirements.');
    if (!passwordsMatch) return setErrorMsg('New password and confirmation do not match.');
    if (sameAsCurrent) return setErrorMsg('New password must be different from your current one.');

    setChangingPassword(true);

    // 1. Re-authenticate to verify current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email || '',
      password: currentPassword,
    });
    if (signInError) {
      setChangingPassword(false);
      setErrorMsg('Current password is incorrect.');
      return;
    }

    // 2. Update password
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setChangingPassword(false);
      setErrorMsg(error.message);
      return;
    }

    // 3. Stamp last password changed and log activity (best-effort)
    try {
      await supabase.rpc('stamp_password_changed' as any);
      await logActivity({
        action: 'account.password_changed' as any,
        entity_type: 'outlet',
        entity_id: outlet?.id ?? null,
        entity_label: outlet?.name ?? null,
      });
    } catch { /* non-blocking */ }

    setChangingPassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setRepeatPassword('');
    setSuccessMsg('Password updated successfully. We recommend signing back in on other devices.');
    toast.success('Password updated');
    refreshAccess();
  };

  const handleSendReset = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    const { error } = await resetPassword(user.email);
    setSendingReset(false);
    if (error) toast.error(error.message);
    else toast.success(`Reset link sent to ${user.email}`);
  };

  const themeOptions = [
    { value: 'light' as const, label: 'Light', icon: <Sun className="h-4 w-4" /> },
    { value: 'dark' as const, label: 'Dark', icon: <Moon className="h-4 w-4" /> },
    { value: 'system' as const, label: 'System', icon: <Monitor className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Account, preferences & security</p>
      </div>

      {/* Account */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <Shield className="h-5 w-5" /> Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Email Address</Label>
            <div className="flex items-center gap-2">
              <Input value={user?.email || ''} disabled className="bg-muted/50" />
              {access?.status === 'verified' && (
                <Badge variant="outline" className="border-green-600 text-green-700 whitespace-nowrap">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                </Badge>
              )}
            </div>
          </div>

          {/* Change Password */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <Label className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Change Password</Label>
                {access?.last_password_changed_at && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last changed {formatDistanceToNow(new Date(access.last_password_changed_at), { addSuffix: true })}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={handleSendReset} disabled={sendingReset || !user?.email} className="text-xs">
                {sendingReset ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Mail className="h-3 w-3 mr-1" />}
                Forgot password? Email me a reset link
              </Button>
            </div>

            <div className="space-y-3">
              {/* Current */}
              <div className="space-y-1.5">
                <Label htmlFor="current-pw" className="text-xs text-muted-foreground">Current password</Label>
                <div className="relative">
                  <Input
                    id="current-pw"
                    type={showCurrent ? 'text' : 'password'}
                    placeholder="Enter your current password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowCurrent(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground" aria-label={showCurrent ? 'Hide password' : 'Show password'}>
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New */}
              <div className="space-y-1.5">
                <Label htmlFor="new-pw" className="text-xs text-muted-foreground">New password</Label>
                <div className="relative">
                  <Input
                    id="new-pw"
                    type={showNew ? 'text' : 'password'}
                    placeholder="Create a new strong password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowNew(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground" aria-label={showNew ? 'Hide password' : 'Show password'}>
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {newPassword && <PasswordStrengthMeter password={newPassword} />}
                {sameAsCurrent && (
                  <p className="text-xs text-destructive">New password must be different from current.</p>
                )}
              </div>

              {/* Confirm */}
              <div className="space-y-1.5">
                <Label htmlFor="repeat-pw" className="text-xs text-muted-foreground">Confirm new password</Label>
                <div className="relative">
                  <Input
                    id="repeat-pw"
                    type={showRepeat ? 'text' : 'password'}
                    placeholder="Repeat the new password"
                    value={repeatPassword}
                    onChange={e => setRepeatPassword(e.target.value)}
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowRepeat(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground" aria-label={showRepeat ? 'Hide password' : 'Show password'}>
                    {showRepeat ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {repeatPassword && (
                  <p className={`text-xs ${passwordsMatch ? 'text-green-600' : 'text-destructive'}`}>
                    {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </p>
                )}
              </div>

              {errorMsg && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}
              {successMsg && (
                <Alert className="border-green-600/40 bg-green-50 dark:bg-green-950/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">{successMsg}</AlertDescription>
                </Alert>
              )}

              <Button onClick={handleChangePassword} disabled={changingPassword || !canSubmit} className="w-full sm:w-auto">
                {changingPassword && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Update Password
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="shadow-card">
        <CardHeader><CardTitle className="font-heading">Appearance</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  theme === opt.value ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/30'
                }`}
              >
                {opt.icon}
                <span className="text-sm font-semibold text-foreground">{opt.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card className="shadow-card">
        <CardHeader><CardTitle className="font-heading">Status</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Plan</span>
            <Badge variant={sub?.isPaid ? 'default' : 'secondary'}>
              {sub?.plan === 'free_demo' ? 'Free Demo' : sub?.plan === 'basic' ? 'Basic' : sub?.plan === 'pro' ? 'Pro' : 'N/A'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={sub?.isExpired ? 'destructive' : 'default'}>
              {sub?.isExpired ? 'Expired' : sub?.status === 'paid_active' ? 'Active (Paid)' : 'Active'}
            </Badge>
          </div>
          {sub?.isDemo && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Demo Days Remaining</span>
              <span className="text-sm font-semibold text-foreground">{sub.daysLeft}</span>
            </div>
          )}
          {access && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Access</span>
              <Badge variant="outline" className={
                access.status === 'verified' ? 'border-green-600 text-green-700' :
                access.status === 'blocked' || access.status === 'rejected' ? 'border-destructive text-destructive' :
                'border-amber-500 text-amber-700'
              }>
                {access.status === 'verified' ? 'Verified' : access.status === 'approved' ? 'Awaiting OTP' : access.status.charAt(0).toUpperCase() + access.status.slice(1)}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="shadow-card border-destructive/30">
        <CardHeader>
          <CardTitle className="font-heading text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Reset operational data (orders, payments, bills). This does NOT affect your menu, outlet profile, tables, or QR codes.
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            To reset data, please contact support with your account email. This ensures secure and verified data deletion.
          </p>
          <Button variant="destructive" disabled>
            Contact Support to Reset Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

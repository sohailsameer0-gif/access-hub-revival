import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PasswordRules {
  length: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  symbol: boolean;
}

export function evaluatePassword(pw: string): PasswordRules & { score: number; label: string } {
  const rules: PasswordRules = {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
  const score = Object.values(rules).filter(Boolean).length;
  const label =
    score <= 1 ? 'Very weak'
    : score === 2 ? 'Weak'
    : score === 3 ? 'Fair'
    : score === 4 ? 'Strong'
    : 'Very strong';
  return { ...rules, score, label };
}

const ITEMS: { key: keyof PasswordRules; label: string }[] = [
  { key: 'length', label: 'At least 8 characters' },
  { key: 'upper', label: 'One uppercase letter' },
  { key: 'lower', label: 'One lowercase letter' },
  { key: 'number', label: 'One number' },
  { key: 'symbol', label: 'One symbol' },
];

export default function PasswordStrengthMeter({ password }: { password: string }) {
  const r = evaluatePassword(password);
  const barColor =
    r.score <= 1 ? 'bg-destructive'
    : r.score === 2 ? 'bg-orange-500'
    : r.score === 3 ? 'bg-yellow-500'
    : r.score === 4 ? 'bg-lime-500'
    : 'bg-green-600';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
          <div className={cn('h-full transition-all duration-300', barColor)} style={{ width: `${(r.score / 5) * 100}%` }} />
        </div>
        <span className="text-xs font-medium text-muted-foreground w-20 text-right">{password ? r.label : ''}</span>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
        {ITEMS.map(it => {
          const ok = r[it.key];
          return (
            <li key={it.key} className={cn('flex items-center gap-1.5', ok ? 'text-green-600' : 'text-muted-foreground')}>
              {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              {it.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function isPasswordStrong(pw: string) {
  const r = evaluatePassword(pw);
  return r.length && r.upper && r.lower && r.number;
}

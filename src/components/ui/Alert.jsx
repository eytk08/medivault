import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const styles = {
  error: { icon: AlertCircle, cls: 'border-rose-200 bg-rose-50 text-rose-800' },
  success: { icon: CheckCircle2, cls: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  info: { icon: Info, cls: 'border-sky-200 bg-sky-50 text-sky-800' }
};
export function Alert({ variant = 'error', title, children, className = '' }) {
  const style = styles[variant] || styles.error;
  const Icon = style.icon;
  return <div role={variant === 'error' ? 'alert' : 'status'} aria-live="polite" className={`flex gap-3 rounded-xl border p-3.5 text-sm ${style.cls} ${className}`}>
    <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><div>{title && <p className="font-semibold">{title}</p>}{children && <p className={title ? 'mt-0.5' : ''}>{children}</p>}</div>
  </div>;
}

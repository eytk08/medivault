import * as Label from '@radix-ui/react-label';

export function Field({ id, label, description, error, required = false, children, className = '' }) {
  return <div className={`min-w-0 space-y-1.5 ${className}`}>
    {label && <Label.Root htmlFor={id} className="block text-sm font-semibold text-slate-700">{label}{required && <span className="ml-1 text-rose-500" aria-hidden="true">*</span>}</Label.Root>}
    {children}
    {description && !error && <p className="text-xs leading-5 text-slate-500">{description}</p>}
    {error && <p id={`${id}-error`} role="alert" className="text-xs font-medium text-rose-600">{error}</p>}
  </div>;
}

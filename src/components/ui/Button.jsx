import { forwardRef } from 'react';
import { LoaderCircle } from 'lucide-react';

const variants = {
  primary: 'bg-teal-600 text-white hover:bg-teal-700 focus-visible:ring-teal-500 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus-visible:ring-teal-500',
  ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-teal-500',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500 shadow-sm',
  soft: 'bg-teal-50 text-teal-700 hover:bg-teal-100 focus-visible:ring-teal-500'
};
const sizes = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-4 text-sm', lg: 'h-12 px-5 text-base', icon: 'h-9 w-9' };

export const Button = forwardRef(function Button({ variant = 'primary', size = 'md', loading = false, className = '', children, disabled, type = 'button', ...props }, ref) {
  return <button ref={ref} type={type} disabled={disabled || loading} className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55 ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`} {...props}>
    {loading ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : null}{children}
  </button>;
});

import { forwardRef } from 'react';

export const Input = forwardRef(function Input({ className = '', invalid = false, ...props }, ref) {
  return <input ref={ref} aria-invalid={invalid || props['aria-invalid'] || undefined} className={`flex h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 ${invalid ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10' : 'border-slate-200'} ${className}`} {...props} />;
});

export const Select = forwardRef(function Select({ className = '', invalid = false, children, ...props }, ref) {
  return <select ref={ref} aria-invalid={invalid || props['aria-invalid'] || undefined} className={`h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 ${invalid ? 'border-rose-400' : 'border-slate-200'} ${className}`} {...props}>{children}</select>;
});

export const Textarea = forwardRef(function Textarea({ className = '', invalid = false, ...props }, ref) {
  return <textarea ref={ref} aria-invalid={invalid || props['aria-invalid'] || undefined} className={`min-h-24 w-full rounded-xl border bg-white px-3.5 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 ${invalid ? 'border-rose-400' : 'border-slate-200'} ${className}`} {...props} />;
});

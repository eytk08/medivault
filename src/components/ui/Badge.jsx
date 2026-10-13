const tones = {
  neutral: 'bg-slate-100 text-slate-700',
  teal: 'bg-teal-50 text-teal-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-800',
  red: 'bg-rose-50 text-rose-700',
  blue: 'bg-sky-50 text-sky-700',
  mild: 'bg-emerald-50 text-emerald-700',
  moderate: 'bg-amber-50 text-amber-800',
  severe: 'bg-rose-50 text-rose-700'
};
export function Badge({ children, tone = 'neutral', className = '' }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tones[tone] || tones.neutral} ${className}`}>{children}</span>;
}

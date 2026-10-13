export function Card({ children, className = '' }) {
  return <section className={`rounded-2xl border border-slate-200/80 bg-white shadow-soft ${className}`}>{children}</section>;
}
export function CardHeader({ title, description, action, icon: Icon, className = '' }) {
  return <div className={`flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6 ${className}`}>
    <div className="flex min-w-0 items-start gap-3">
      {Icon && <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Icon size={19} aria-hidden="true" /></span>}
      <div><h2 className="text-base font-bold text-ink">{title}</h2>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div>
    </div>{action}
  </div>;
}
export function CardBody({ children, className = '' }) { return <div className={`px-5 py-5 sm:px-6 ${className}`}>{children}</div>; }

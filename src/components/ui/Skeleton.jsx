export function Skeleton({ className = '' }) { return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} />; }
export function PageSkeleton() {
  return <div className="space-y-6" role="status" aria-label="Loading page">
    <Skeleton className="h-10 w-56" /><Skeleton className="h-28 w-full" />
    <div className="grid gap-4 md:grid-cols-3">{[1, 2, 3].map((n) => <Skeleton key={n} className="h-36" />)}</div>
    <Skeleton className="h-64 w-full" /><span className="sr-only">Loading your medical record…</span>
  </div>;
}

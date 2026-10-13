import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ClipboardPlus, FileHeart, Fingerprint, LockKeyhole, ShieldCheck, Sparkles, Stethoscope } from 'lucide-react';
import { useSession } from '../hooks/useSession';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ThemeToggle';

const benefits = [
  { icon: FileHeart, title: 'Your whole story, together', text: 'Keep conditions, allergies, procedures, and essential vitals in one organized record.' },
  { icon: LockKeyhole, title: 'Privacy by design', text: 'Secure sign-in with HTTP-only session cookies and server-checked access to your record.' },
  { icon: ClipboardPlus, title: 'Ready when care happens', text: 'A clear snapshot helps you review important health details before an appointment.' }
];

export default function LandingPage() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  if (!loading && user) return <Navigate to={user.hasProfile ? '/dashboard' : '/records/edit'} replace />;

  return <div className="min-h-screen overflow-hidden bg-white text-ink">
    <header className="relative z-10 mx-auto flex h-[82px] max-w-7xl items-center justify-between px-5 sm:px-8">
      <Link to="/" className="flex items-center gap-3">
        <img src="/MV_logo.svg" alt="MediVault Logo" className="h-14 w-14 rounded-2xl object-contain" />
        <span className="text-xl font-extrabold tracking-tight">MediVault</span>
      </Link>
      <nav className="flex items-center gap-2 sm:gap-3" aria-label="Public navigation">
        <ThemeToggle />
        <Link to="/login" className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Sign in</Link>
        <Button size="sm" className="sm:h-11 sm:px-4" onClick={() => navigate('/register')}>Create account <ArrowRight size={15} /></Button>
      </nav>
    </header>

    <main>
    <section className="relative mx-auto flex min-h-[calc(100vh-82px)] max-w-7xl items-center gap-14 px-5 py-12 sm:px-8 lg:grid-cols-[1.03fr_.97fr] lg:gap-10 lg:py-0">        <div className="relative z-10 max-w-2xl">
          <h1 className="text-[2.85rem] font-extrabold leading-[1.05] tracking-[-0.045em] text-ink sm:text-6xl lg:text-[4.35rem]">Your health story, <span className="text-teal-600">securely</span> in one place.</h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">A personal medical records vault to keep the details that matter organized, easy to review, and ready for your next care conversation.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" className="w-full sm:w-auto" onClick={() => navigate('/register')}>Build your health record <ArrowRight size={17} /></Button>
            <Button size="lg" variant="secondary" className="w-full sm:w-auto" onClick={() => navigate('/login')}>I already have an account</Button>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[520px] lg:ml-auto">
          <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-teal-100/80 blur-3xl" /><div className="absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-sky-100/80 blur-3xl" />
          <div className="relative rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_32px_100px_rgba(15,39,53,0.12)] sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><FileHeart size={21} /></div><div><p className="text-sm font-bold">Medical snapshot</p><p className="mt-0.5 text-xs text-slate-500">Personal health record</p></div></div><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700"><LockKeyhole size={12} /> Private</span>
            </div>
            <div className="grid grid-cols-2 gap-3 py-5">
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-medium text-slate-500">Blood group</p><p className="mt-2 text-2xl font-extrabold text-ink">O+</p><p className="mt-1 text-[11px] text-slate-400">Quick-reference vital</p></div>
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-medium text-slate-500">Record status</p><p className="mt-2 flex items-center gap-2 text-base font-bold"><span className="h-2 w-2 rounded-full bg-teal-500" /> Organized</p><p className="mt-1 text-[11px] text-slate-400">Details in one place</p></div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3.5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Stethoscope size={18} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Clinical conditions</p><p className="mt-0.5 text-xs text-slate-500">Diagnoses and current status</p></div><ArrowRight size={15} className="text-slate-400" /></div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3.5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><Fingerprint size={18} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">Allergies and reactions</p><p className="mt-0.5 text-xs text-slate-500">Severity at a glance</p></div><ArrowRight size={15} className="text-slate-400" /></div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-xs font-semibold text-white"><ShieldCheck size={15} className="text-teal-300" /> One secure place for the details that matter</div>
          </div>
        </div>
    </section>

      <section className="  py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8"><div className="mx-auto mb-10 max-w-2xl text-center"><h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Healthcare details, streamlined.</h2><p className="mt-4 leading-7 text-slate-600">Spend less time piecing together history and more time having informed conversations about care.</p></div>
          <div className="grid gap-4 md:grid-cols-3">{benefits.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><Icon size={20} /></span><h3 className="mt-5 text-lg font-bold text-ink">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></article>)}</div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20"><div className="flex flex-col justify-between rounded-[2rem] bg-ink p-7 text-white sm:flex-row sm:items-center sm:p-10"><div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">Start with what you know</p><h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">Your health history should be remembered.</h2><p className="mt-3 text-sm leading-6 text-slate-300">Create your account and add the details you want to keep close.</p></div>
      <Button size="lg" className="w-full bg-teal text-ink hover:bg-teal-00 sm:w-auto" onClick={() => navigate('/register')}>Create your vault <ArrowRight size={17} /></Button></div></section>
    </main>
    <footer className="border-t border-slate-100 py-6"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 text-xs text-slate-400 sm:flex-row sm:justify-between sm:px-8"><span>© {new Date().getFullYear()} MediVault</span><span>MediVault is not a replacement for professional medical advice or emergency care.</span></div></footer>
  </div>;
}

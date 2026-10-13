import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, ArrowUpRight, FileHeart, LayoutDashboard, LogOut, Settings, ShieldCheck, Stethoscope, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '../hooks/useSession';
import { Button } from './ui/Button';

const navItems = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/records/edit', label: 'Clinical record', icon: FileHeart },
  { to: '/settings', label: 'Settings', icon: Settings }
];

export function AppShell() {
  const { user, signOut } = useSession();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = React.useState(() => {
    try { return localStorage.getItem('medivault-theme') === 'dark'; } catch { return false; }
  });
  React.useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', darkMode);
    try { localStorage.setItem('medivault-theme', darkMode ? 'dark' : 'light'); } catch {}
  }, [darkMode]);
  const doSignOut = async () => {
    try {
      await signOut();
      toast.success('You have been signed out securely.');
      navigate('/', { replace: true });
    } catch {
      toast.error('Could not sign out. Please retry.');
    }
  };

  return <div className="min-h-screen bg-mist">
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <NavLink
          to="/dashboard"
          className="flex items-center gap-3"
          aria-label="MediVault home"
        >
          <span className="flex h-14 w-14 items-center justify-center">
            <img
              src="/MV_logo.svg"
              alt="MediVault logo"
              className="h-10 w-10 object-contain"
            />
          </span>

          <span>
            <span className="block text-base font-extrabold tracking-tight text-ink">
              MediVault
            </span>
            <span className="hidden text-[11px] font-medium tracking-wide text-slate-500 sm:block">
              YOUR PERSONAL HEALTH VAULT
            </span>
          </span>
        </NavLink>
        <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
          {navItems.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100 hover:text-ink'}`}><Icon size={16} />{label}</NavLink>)}
        </nav>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => setDarkMode(v => !v)} aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"} className="rounded-xl"><>{darkMode ? <Sun size={15} /> : <Moon size={15} />}<span className="hidden sm:inline">{darkMode ? "Light mode" : "Dark mode"}</span></></Button>
          <Button variant="secondary" size="sm" onClick={doSignOut} className="rounded-xl"><LogOut size={15} /><span className="hidden sm:inline">Sign out</span></Button>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 md:hidden" aria-label="Mobile navigation">
        {navItems.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `flex min-w-fit items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-600'}`}><Icon size={15} />{label}</NavLink>)}
      </nav>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8"><Outlet /></main>
    <footer className="mx-auto flex max-w-7xl flex-col gap-2 px-4 pb-8 text-xs text-slate-400 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
      <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> Your medical information stays attached to your private account.</span>
      <span className="inline-flex items-center gap-1.5"><Activity size={13} /> MediVault is not an emergency service.</span>
    </footer>
  </div>;
}

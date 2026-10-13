import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import { loginSchema, registerSchema } from '../schemas/auth';
import { authApi, ApiError } from '../api/client';
import { useSession } from '../hooks/useSession';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Field } from '../components/ui/Field';
import { Alert } from '../components/ui/Alert';
import { PageSkeleton } from '../components/ui/Skeleton';
import { ThemeToggle } from '../components/ThemeToggle';

function useCountdown() {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (remaining <= 0) return undefined;
    const timer = setTimeout(() => setRemaining((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);
  return [remaining, setRemaining];
}
const formatWait = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

function AuthForm({ mode, onComplete }) {
  const registering = mode === 'register';
  const [serverError, setServerError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [wait, setWait] = useCountdown();
  const schema = registering ? registerSchema : loginSchema;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema), mode: 'onBlur',
    defaultValues: { email: '', password: '', ...(registering ? { confirmPassword: '' } : {}) }
  });

  useEffect(() => {
    if (wait === 0) setServerError((current) => (current?.rateLimited ? null : current));
  }, [wait]);

  const paused = wait > 0;
  const submit = async (values) => {
    setServerError(null);
    try {
      const result = registering
        ? await authApi.register({ email: values.email, password: values.password, confirmPassword: values.confirmPassword })
        : await authApi.login({ email: values.email, password: values.password });
      onComplete(result);
    } catch (error) {
      const rateLimited = error instanceof ApiError && error.status === 429;
      const retryAfter = Number(error?.payload?.retryAfter);
      if (rateLimited && Number.isFinite(retryAfter) && retryAfter > 0) setWait(Math.ceil(retryAfter));
      setServerError({ message: error.message, rateLimited });
    }
  };

  return <form noValidate onSubmit={handleSubmit(submit)} className="space-y-4" aria-label={registering ? 'Create MediVault account' : 'Sign in to MediVault'}>
    {serverError && <Alert variant="error" title={serverError.rateLimited ? 'Too many attempts' : registering ? 'Could not create account' : 'Sign-in failed'}>{serverError.message}{serverError.rateLimited && !paused ? ' For your security, wait a few minutes before trying again.' : ''}</Alert>}
    <Field id={`${mode}-email`} label="Email address" error={errors.email?.message} required>
      <Input id={`${mode}-email`} type="email" autoComplete="email" placeholder="you@example.com" invalid={!!errors.email} {...register('email')} />
    </Field>
    <Field id={`${mode}-password`} label="Password" error={errors.password?.message} required description={registering ? 'At least 8 characters, including a letter and a number.' : undefined}>
      <div className="relative"><Input id={`${mode}-password`} type={showPassword ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} placeholder={registering ? 'Create a strong password' : 'Enter your password'} className="pr-12" invalid={!!errors.password} {...register('password')} /><button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-700" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
    </Field>
    {registering && <Field id="register-confirm" label="Confirm password" error={errors.confirmPassword?.message} required><Input id="register-confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Enter the password again" invalid={!!errors.confirmPassword} {...register('confirmPassword')} /></Field>}
    <Button type="submit" size="lg" loading={isSubmitting} disabled={paused} className="mt-2 w-full">{paused ? `Try again in ${formatWait(wait)}` : <>{registering ? 'Create secure account' : 'Sign in securely'} <ArrowRight size={17} /></>}</Button>
    <p className="flex items-start gap-2 pt-1 text-xs leading-5 text-slate-500"><LockKeyhole size={14} className="mt-0.5 shrink-0 text-teal-700" /> Your session uses an HTTP-only cookie. MediVault will never ask you to share your password by email.</p>
  </form>;
}

export default function AuthPage({ initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const { user, loading, signIn } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const onComplete = (session) => {
    signIn(session);
    const from = location.state?.from;
    const internal = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !/^\/(login|register)/.test(from);
    navigate(session.hasProfile ? (internal ? from : '/dashboard') : '/records/edit', { replace: true });
  };
  if (loading) return <main className="mx-auto max-w-5xl px-4 py-10"><PageSkeleton /></main>;
  if (user) return <Navigate to={user.hasProfile ? '/dashboard' : '/records/edit'} replace />;

  const switchTab = (value) => {
    setMode(value);
    navigate(value === 'register' ? '/register' : '/login', { replace: true, state: location.state });
  };

  return <main className="min-h-screen bg-mist px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto mb-7 flex max-w-6xl items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-ink">
          <ArrowLeft size={16} /> Back to home
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/MV_logo.svg" alt="MediVault Logo" className="h-9 w-9 rounded-xl object-contain" />
            <span className="font-extrabold tracking-tight text-ink">MediVault</span>
          </Link>
        </div>
      </div>
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-soft lg:grid-cols-[.9fr_1.1fr]">
    <aside className="relative hidden overflow-hidden bg-ink p-10 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-teal-500/20 blur-3xl" />
      
      <div className="relative ">
        <img src="/favicon.svg" alt="MediVault Logo" className="h-12 w-12 rounded-2xl object-contain" />
        
        <h1 className="mt-8 text-4xl font-extrabold leading-tight tracking-tight">A safe space for your medical concerns.</h1>
        <p className="mt-5 leading-7 text-slate-300">Bring your personal health details together in a private, organized place built around your care journey.</p>
      </div>
      
      <div className="relative mt-12 space-y-4">
        {['One organized clinical history', 'Control over your personal account', 'Easy-to-review health snapshot'].map((item) => (
          <div key={item} className="flex items-center gap-3 text-sm text-slate-200">
            <CheckCircle2 size={17} className="text-teal-300" />
            {item}
          </div>
        ))}
      </div>
      
      <p className="relative mt-12 text-xs text-slate-400">Designed for personal record keeping, not emergency care.</p>
    </aside>     
     <section className="p-5 sm:p-9 lg:p-10">
        <Tabs.Root value={mode} onValueChange={switchTab}>
          <div className="mb-7"><p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Welcome to MediVault</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{mode === 'register' ? 'Create your account' : 'Welcome back'}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{mode === 'register' ? 'Start with your account. You can add your clinical history next.' : 'Sign in to view and manage your medical history.'}</p></div>
          <Tabs.List className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1" aria-label="Account access">
            <Tabs.Trigger value="login" className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-500 transition data-[state=active]:bg-white data-[state=active]:text-ink data-[state=active]:shadow-sm">Sign in</Tabs.Trigger>
            <Tabs.Trigger value="register" className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-500 transition data-[state=active]:bg-white data-[state=active]:text-ink data-[state=active]:shadow-sm">Create account</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="login"><AuthForm key="login" mode="login" onComplete={onComplete} /></Tabs.Content>
          <Tabs.Content value="register"><AuthForm key="register" mode="register" onComplete={onComplete} /></Tabs.Content>
        </Tabs.Root>
        <p className="mt-7 border-t border-slate-100 pt-5 text-center text-xs leading-5 text-slate-400">By continuing, you agree to use MediVault responsibly and protect your sign-in credentials.</p>
      </section>
    </div>
  </main>;
}

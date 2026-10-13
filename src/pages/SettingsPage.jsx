import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { AlertTriangle, Check, LockKeyhole, Mail, Save, ShieldCheck, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { authApi, patientApi } from '../api/client';
import { useSession } from '../hooks/useSession';
import { accountSettingsSchema, deleteAccountSchema, personalSettingsSchema } from '../schemas/auth';
import { SectionHeading } from '../components/ui/SectionHeading';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Field } from '../components/ui/Field';
import { Alert } from '../components/ui/Alert';
import { PageSkeleton } from '../components/ui/Skeleton';
import { RELIGION_OPTIONS } from '../utils/religion-options';

const fieldId = (name) => name.replaceAll('.', '-');
function FormInput({ form, name, label, type = 'text', placeholder, required, maxLength, autoComplete, description, disabled = false }) {
  const error = name.split('.').reduce((node, key) => node?.[key], form.formState.errors)?.message;
  const id = fieldId(name);
  return <Field id={id} label={label} required={required} error={error} description={description}><Input id={id} type={type} placeholder={placeholder} maxLength={maxLength} autoComplete={autoComplete} disabled={disabled} invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} {...form.register(name)} /></Field>;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [profileExists, setProfileExists] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [personalSaved, setPersonalSaved] = useState(false);
  const [accountSaved, setAccountSaved] = useState(false);
  const { refresh, clearSession } = useSession();
  const navigate = useNavigate();

  const personal = useForm({ resolver: zodResolver(personalSettingsSchema), mode: 'onBlur', defaultValues: { patientName: '', patientBday: '', patientSex: 'M', patientRel: '', patientMarStat: 'single' } });
  const account = useForm({ resolver: zodResolver(accountSettingsSchema), mode: 'onBlur', defaultValues: { email: '', phone: '', currentPassword: '', newPassword: '' } });
  const deletion = useForm({ resolver: zodResolver(deleteAccountSchema), mode: 'onChange', defaultValues: { password: '', confirmation: '' } });

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([authApi.me({ signal: controller.signal }), patientApi.get({ signal: controller.signal })]).then(([me, result]) => {
      setProfileExists(!!result.profile);
      const p = result.profile?.patient;
      personal.reset({
        patientName: p?.patientName || '', patientBday: p?.patientBday ? String(p.patientBday).slice(0, 10) : '',
        patientSex: p?.patientSex || 'M', patientRel: p?.patientRel || '', patientMarStat: p?.patientMarStat || 'single'
      });
      account.reset({ email: me.email || '', phone: p?.patientPNum || '', currentPassword: '', newPassword: '' });
    }).catch((error) => {
      if (error.name !== 'AbortError') setLoadError(error.message || 'Could not load account settings.');
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [personal.reset, account.reset]);

  const savePersonal = async (values) => {
    setPersonalSaved(false);
    toast.loading('Saving personal details…', { id: 'personal-settings' });
    try {
      await patientApi.updatePersonal(values);
      toast.success('Personal details updated.', { id: 'personal-settings' });
      setPersonalSaved(true);
    } catch (error) {
      toast.error(error.message || 'Could not update personal details.', { id: 'personal-settings', duration: 7000 });
    }
  };

  const saveAccount = async (values) => {
    if (profileExists && !values.phone.trim()) {
      account.setError('phone', { type: 'manual', message: 'Phone number is required while a clinical record exists.' });
      return;
    }
    setAccountSaved(false);
    toast.loading('Updating account settings…', { id: 'account-settings' });
    try {
      const payload = { email: values.email, phone: values.phone, currentPassword: values.currentPassword };
      if (values.newPassword) payload.newPassword = values.newPassword;
      await patientApi.updateAccount(payload);
      toast.success('Account settings updated.', { id: 'account-settings' });
      account.reset({ email: values.email, phone: values.phone, currentPassword: '', newPassword: '' });
      await refresh();
      setAccountSaved(true);
    } catch (error) {
      toast.error(error.message || 'Could not update account settings.', { id: 'account-settings', duration: 7000 });
    }
  };

  const startDelete = () => {
    deletion.reset({ password: '', confirmation: '' });
    setDeleteOpen(true);
  };

  const deleteAccount = async (values) => {
    setDeleting(true);
    try {
      await patientApi.deleteAccount({ password: values.password });
      toast.success('Your account and associated record have been deleted.');
      setDeleteOpen(false);
      clearSession();
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(error.message || 'Could not delete account.', { duration: 7000 });
    } finally { setDeleting(false); }
  };

  if (loading) return <PageSkeleton />;
  if (loadError) return <div className="mx-auto max-w-2xl pt-8"><Alert title="Settings could not be loaded">{loadError}</Alert><div className="mt-4"><Button variant="secondary" onClick={() => window.location.reload()}>Try again</Button></div></div>;

  return <div>
    <SectionHeading eyebrow="Account preferences" title="Settings & security" description="Keep your profile accurate, manage account access, and control your MediVault account." />
    {!profileExists && <Alert variant="info" title="Medical history not created yet">Complete your clinical record first to edit patient demographics and phone number.</Alert>}

    <div className="mt-5 grid items-start gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <div className="space-y-5">
        <Card><CardHeader title="Personal information" description="Demographics attached to your clinical record" icon={UserRound} action={personalSaved && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><Check size={14} /> Saved</span>} /><CardBody>
          <form noValidate onSubmit={personal.handleSubmit(savePersonal)} className="space-y-4">
            <fieldset disabled={!profileExists || personal.formState.isSubmitting} className="grid gap-4 sm:grid-cols-2 disabled:opacity-60">
              <FormInput form={personal} name="patientName" label="Full name" required maxLength={60} autoComplete="name" />
              <FormInput form={personal} name="patientBday" label="Date of birth" type="date" required />
              <Field id="personal-sex" label="Sex" required error={personal.formState.errors.patientSex?.message}><Select id="personal-sex" invalid={!!personal.formState.errors.patientSex} {...personal.register('patientSex')}><option value="M">Male</option><option value="F">Female</option></Select></Field>
              <Field id="personal-religion" label="Religion / belief" required error={personal.formState.errors.patientRel?.message}><Select id="personal-religion" invalid={!!personal.formState.errors.patientRel} {...personal.register('patientRel')}><option value="">Choose an option</option>{RELIGION_OPTIONS.map(([value,label])=><option value={value} key={value}>{label}</option>)}</Select></Field>
              <Field id="personal-status" label="Marital status" required error={personal.formState.errors.patientMarStat?.message}><Select id="personal-status" invalid={!!personal.formState.errors.patientMarStat} {...personal.register('patientMarStat')}><option value="single">Single</option><option value="married">Married</option><option value="separated">Separated</option><option value="divorced">Divorced</option><option value="widowed">Widowed</option></Select></Field>
            </fieldset>
            <div className="flex justify-end border-t border-slate-100 pt-4"><Button type="submit" loading={personal.formState.isSubmitting} disabled={!profileExists}><Save size={15} /> Save personal details</Button></div>
          </form>
        </CardBody></Card>

        <Card><CardHeader title="Sign-in & contact" description="Email, phone, and optional password change" icon={Mail} action={accountSaved && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><Check size={14} /> Saved</span>} /><CardBody>
          <form noValidate onSubmit={account.handleSubmit(saveAccount)} className="space-y-4">
            <FormInput form={account} name="email" label="Account email" type="email" required maxLength={100} autoComplete="email" />
            <FormInput form={account} name="phone" label="Contact phone" maxLength={20} autoComplete="tel" disabled={!profileExists} description={profileExists ? 'Used as the phone number on your patient record.' : 'Create a clinical record before adding a phone number.'} />
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"><div className="mb-4 flex items-start gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-teal-700 shadow-sm"><LockKeyhole size={16} /></span><div><p className="text-sm font-semibold text-ink">Verify your identity</p><p className="mt-1 text-xs leading-5 text-slate-500">Your current password is required for every account change. Leave the new password blank to keep it unchanged.</p></div></div>
              <div className="grid gap-4 sm:grid-cols-2"><FormInput form={account} name="currentPassword" label="Current password" type="password" required autoComplete="current-password" /><FormInput form={account} name="newPassword" label="New password" type="password" autoComplete="new-password" description="Optional: 8+ characters, with a letter and a number." /></div>
            </div>
            <div className="flex justify-end border-t border-slate-100 pt-4"><Button type="submit" loading={account.formState.isSubmitting}><Save size={15} /> Save account settings</Button></div>
          </form>
        </CardBody></Card>
      </div>

      <div className="space-y-5">
        <Card><CardHeader title="Session & privacy" description="How this account stays protected" icon={ShieldCheck} /><CardBody className="space-y-4"><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><LockKeyhole size={17} /></span><div><p className="text-sm font-semibold text-ink">HTTP-only session cookie</p><p className="mt-1 text-xs leading-5 text-slate-500">Authentication stays in a server-managed cookie that frontend JavaScript cannot read.</p></div></div><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><ShieldCheck size={17} /></span><div><p className="text-sm font-semibold text-ink">Server-checked access</p><p className="mt-1 text-xs leading-5 text-slate-500">Private API calls require an active session before account or patient data is returned.</p></div></div><div className="rounded-xl border border-amber-100 bg-amber-50 p-3.5"><p className="text-xs font-semibold text-amber-900">Important for real clinical use</p><p className="mt-1 text-xs leading-5 text-amber-800">This application is a personal record-keeping tool. Before storing real patient data, add and verify encryption at rest, audit logging, backups, and appropriate clinical/privacy compliance controls.</p></div></CardBody></Card>

        <Card className="border-rose-200"><CardHeader title="Danger zone" description="Destructive actions that cannot be undone" icon={AlertTriangle} /><CardBody><p className="text-sm leading-6 text-slate-600">Deleting your account permanently removes the account and its associated patient record, including condition, allergy, and surgery entries.</p><Button variant="danger" onClick={startDelete} className="mt-4"><AlertTriangle size={16} /> Delete account</Button></CardBody></Card>
      </div>
    </div>

    <AlertDialog.Root open={deleteOpen} onOpenChange={(open) => { if (!deleting) setDeleteOpen(open); }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-rose-200 bg-white p-5 shadow-2xl outline-none sm:p-7">
          <div className="mb-5 flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><AlertTriangle size={21} /></span><div><AlertDialog.Title className="text-lg font-extrabold text-ink">Permanently delete account?</AlertDialog.Title><AlertDialog.Description className="mt-1 text-sm leading-6 text-slate-500">This action cannot be undone. Your login, patient record, and related clinical history will be removed.</AlertDialog.Description></div></div>
          <form noValidate onSubmit={deletion.handleSubmit(deleteAccount)} className="space-y-4">
            <FormInput form={deletion} name="password" label="Confirm with your current password" type="password" required autoComplete="current-password" />
            <FormInput form={deletion} name="confirmation" label="Type DELETE to confirm" placeholder="DELETE" required autoComplete="off" />
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><AlertDialog.Cancel asChild><Button variant="secondary" disabled={deleting}><X size={15} /> Cancel</Button></AlertDialog.Cancel><Button type="submit" variant="danger" loading={deleting}><AlertTriangle size={15} /> Permanently delete</Button></div>
          </form>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  </div>;
}

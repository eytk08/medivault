import { useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertCircle, ClipboardCheck, ClipboardPlus, FileHeart, HeartPulse, Plus, Save, ShieldCheck, Stethoscope, Syringe, Trash2, UserRound, X } from 'lucide-react';
import { toast } from 'sonner';
import { patientApi } from '../api/client';
import { useSession } from '../hooks/useSession';
import { emptyRecord, medicalRecordSchema, profileToForm, toApiPayload } from '../schemas/medicalRecord';
import { SectionHeading } from '../components/ui/SectionHeading';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { Field } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { PageSkeleton } from '../components/ui/Skeleton';

const PHILIPPINE_RELIGIONS = [
  'Roman Catholic',
  'Islam',
  'Iglesia ni Cristo',
  'Philippine Independent Church (Aglipayan)',
  'Seventh-day Adventist',
  'Bible Baptist Church',
  'United Church of Christ in the Philippines',
  'Jehovah\'s Witnesses',
  'Church of Christ',
  'Members Church of God International',
  'Pentecostal',
  'Evangelical Christian',
  'None / Agnostic',
  'Other'
];

const today = new Date().toISOString().slice(0, 10);
const ageFrom = (value) => {
  if (!value) return '—';
  const birth = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return '—';
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) years -= 1;
  return years >= 0 ? years : '—';
};
const bmiFrom = (height, weight) => {
  const h = Number(height) / 100; const w = Number(weight);
  return h >= 0.3 && h <= 2.72 && w >= 1 && w <= 500 ? (w / (h * h)).toFixed(1) : '—';
};
const fieldError = (errors, name) => name.split('.').reduce((node, key) => node?.[key], errors)?.message;
const fieldId = (name) => name.replaceAll('.', '-').replaceAll('[', '-').replaceAll(']', '');
const createEmptyRecord = () => ({
  ...emptyRecord,
  doctor: { ...emptyRecord.doctor },
  conditions: [],
  allergies: [],
  surgeries: [],
  hospitalizations: [],
  vaccinations: []
});

function TextField({ register, errors, name, label, type = 'text', placeholder, required, maxLength, min, max, step, autoComplete, description, className = '' }) {
  const id = fieldId(name); const error = fieldError(errors, name);
  const opts = type === 'number' ? { valueAsNumber: false } : undefined;
  return <Field id={id} label={label} required={required} error={error} description={description} className={className}>
    <Input id={id} type={type} placeholder={placeholder} maxLength={maxLength} min={min} max={max} step={step} autoComplete={autoComplete} invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} {...register(name, opts)} />
  </Field>;
}

function SelectField({ register, errors, name, label, options, required, className = '' }) {
  const id = fieldId(name); const error = fieldError(errors, name);
  return <Field id={id} label={label} required={required} error={error} className={className}>
    <Select id={id} invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} {...register(name)}>{options.map(([value, text]) => <option value={value} key={value}>{text}</option>)}</Select>
  </Field>;
}

function EntryHeader({ number, title, remove, canRemove = true }) {
  return <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600">{String(number).padStart(2, '0')}</span><h3 className="text-sm font-bold text-ink">{title}</h3></div><Button variant="ghost" size="sm" onClick={remove} disabled={!canRemove} aria-label={`Remove ${title.toLowerCase()}`} className="text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={15} /><span className="hidden sm:inline">Remove</span></Button></div>;
}

function PreviewGroup({ title, children, count }) {
  return <section className="border-b border-slate-100 py-4 last:border-b-0"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-ink">{title}</h3>{count !== undefined && <Badge tone="neutral">{count}</Badge>}</div>{children}</section>;
}
function PreviewLine({ label, value }) {
  return <div className="flex min-w-0 flex-col gap-1 py-1.5 sm:flex-row sm:gap-3"><dt className="w-36 shrink-0 text-xs font-medium text-slate-400">{label}</dt><dd className="min-w-0 break-words text-sm font-medium text-slate-700">{value || 'Not provided'}</dd></div>;
}
function PreviewList({ rows, type }) {
  if (!rows.length) return <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">No {type} documented.</p>;
  return <div className="space-y-2">{rows.map((row, i) => <div key={`${row.name || row.hospital}-${i}`} className="rounded-xl border border-slate-100 p-3"><p className="font-semibold text-ink">{row.name || row.hospital}</p>{type === 'conditions' && <p className="mt-1 text-xs text-slate-500">{row.date || 'Diagnosis date not provided'} · {row.status}{row.med ? ` · ${row.med}` : ''}</p>}{type === 'allergies' && <><div className="mt-2 flex flex-wrap items-center gap-2"><Badge tone={row.severity}>{row.severity} severity</Badge><span className="text-xs text-slate-500">{row.reaction || 'No reaction documented'}</span></div>{row.med && <p className="mt-1 text-xs text-slate-500">Medication: {row.med}</p>}</>}{type === 'surgeries' && <><p className="mt-1 text-xs text-slate-500">{row.date || 'Date not provided'}{row.loc ? ` · ${row.loc}` : ''}</p>{(row.hospital || row.surgeon) && <p className="mt-1 text-xs text-slate-500">{[row.hospital, row.surgeon].filter(Boolean).join(' · ')}</p>}{row.notes && <p className="mt-2 text-xs leading-5 text-slate-600">{row.notes}</p>}</>}</div>)}</div>;
}

export default function RecordEditorPage() {
  const [loading, setLoading] = useState(true);
  const [profileExists, setProfileExists] = useState(false);
  const [searchParams] = useSearchParams();
  const quickAddHandled = useRef(false);
  const [loadError, setLoadError] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [saving, setSaving] = useState(false);
  const { user } = useSession();
  const navigate = useNavigate();
  const { register, control, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(medicalRecordSchema), mode: 'onChange', reValidateMode: 'onChange', defaultValues: createEmptyRecord()
  });
  const conditionsArray = useFieldArray({ control, name: 'conditions' });
  const allergiesArray = useFieldArray({ control, name: 'allergies' });
  const surgeriesArray = useFieldArray({ control, name: 'surgeries' });
  const hospitalizationsArray = useFieldArray({ control, name: 'hospitalizations' });
  const vaccinationsArray = useFieldArray({ control, name: 'vaccinations' });
  
  const [height, weight, birthday, currentConditions] = useWatch({ control, name: ['patientHeight', 'patientWeight', 'patientBday', 'conditions'] });
  const bmi = useMemo(() => bmiFrom(height, weight), [height, weight]);
  const age = useMemo(() => ageFrom(birthday), [birthday]);

  useEffect(() => {
    const controller = new AbortController();
    patientApi.get({ signal: controller.signal }).then((result) => {
      const hasProfile = Boolean(result.profile?.patient);
      setProfileExists(hasProfile);
      const mapped = hasProfile ? profileToForm(result.profile) : createEmptyRecord();
      reset({
        ...mapped,
        conditions: hasProfile && result.profile?.conditions?.length ? mapped.conditions : [],
        allergies: hasProfile && result.profile?.allergies?.length ? mapped.allergies : [],
        surgeries: hasProfile && result.profile?.surgeries?.length ? mapped.surgeries : [],
        hospitalizations: hasProfile && result.profile?.hospitalizations?.length ? mapped.hospitalizations : [],
        vaccinations: hasProfile && result.profile?.vaccinations?.length ? mapped.vaccinations : []
      });
    }).catch((error) => {
      if (error.name !== 'AbortError') setLoadError(error.message || 'Could not load your existing record.');
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [reset]);

  useEffect(() => {
    if (loading || quickAddHandled.current) return;
    const add = searchParams.get('add');
    if (!add) return;

    if (add === 'condition') {
      conditionsArray.append({ name: '', date: '', med: '', status: 'active' });
    } else if (add === 'allergy') {
      allergiesArray.append({ name: '', severity: 'moderate', reaction: '', med: '' });
    } else if (add === 'surgery') {
      surgeriesArray.append({ name: '', date: '', loc: '', hospital: '', surgeon: '', notes: '' });
    } else if (add === 'hospitalization') {
      hospitalizationsArray.append({ hospital: '', admissionDate: '', dischargeDate: '', reason: '', diagnosis: '', treatment: '', relatedConditions: [] });
    } else if (add === 'vaccination') {
      vaccinationsArray.append({ name: '', dose: '', date: '', nextDate: '', facility: '', notes: '' });
    } else {
      return;
    }

    quickAddHandled.current = true;
    navigate('/records/edit', { replace: true });
  }, [loading, searchParams, conditionsArray, allergiesArray, surgeriesArray, hospitalizationsArray, vaccinationsArray, navigate]);

  const saveRecord = async () => {
    if (!previewData || saving) return;
    setSaving(true);
    toast.loading('Saving your clinical record securely…', { id: 'record-save' });
    try {
      await patientApi.save(toApiPayload(previewData));
      toast.success('Clinical record saved.', { id: 'record-save', description: 'Your latest record is ready to review.' });
      setPreviewOpen(false);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(error.message || 'Could not save your record.', { id: 'record-save', duration: 7000 });
    } finally { setSaving(false); }
  };

  if (loading) return <PageSkeleton />;
  if (loadError) return <div className="mx-auto max-w-2xl pt-8"><Alert title="The clinical record could not be opened">{loadError}</Alert><div className="mt-4 flex gap-2"><Button variant="secondary" onClick={() => window.location.reload()}>Try again</Button><Button variant="ghost" onClick={() => navigate('/dashboard')}>Back to dashboard</Button></div></div>;

  const renderRows = (array, type) => {
    const names = type === 'condition' ? ['conditions', 'condition'] : type === 'allergy' ? ['allergies', 'allergy'] : type === 'surgery' ? ['surgeries', 'surgery'] : type === 'vaccination' ? ['vaccinations', 'vaccination'] : ['hospitalizations', 'hospitalization'];
    const [path] = names;
    const fields = array.fields;
    const appendRow = type === 'condition' 
      ? { name: '', date: '', med: '', status: 'active' } 
      : type === 'allergy' 
      ? { name: '', severity: 'moderate', reaction: '', med: '' } 
      : type === 'surgery'
      ? { name: '', date: '', loc: '', hospital: '', surgeon: '', notes: '' }
      : type === 'vaccination'
      ? { name: '', dose: '', date: '', nextDate: '', facility: '', notes: '' }
      : { hospital: '', admissionDate: '', dischargeDate: '', reason: '', diagnosis: '', treatment: '', relatedConditions: [] };

    const emptyCopy = type === 'condition'
      ? { title: 'No conditions added', message: 'If you have none, you can leave this empty.', icon: HeartPulse }
      : type === 'allergy'
      ? { title: 'No allergies in record', message: 'If you have no known allergies, you can leave this empty.', icon: AlertCircle }
      : type === 'surgery'
      ? { title: 'No surgeries added', message: 'If you have never had surgery, you can leave this empty.', icon: FileHeart }
      : type === 'vaccination'
      ? { title: 'No vaccinations added', message: 'Add the vaccines you have received, including boosters.', icon: Syringe }
      : { title: 'No hospitalizations added', message: 'You can leave this section empty if it does not apply.', icon: ClipboardPlus };

    const EmptyIcon = emptyCopy.icon;
    
    return <div className="space-y-4">
      {fields.length === 0 ? <div role="status" className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center sm:py-9">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-900"><EmptyIcon size={20} aria-hidden="true" /></span>
        <p className="mt-3 text-sm font-semibold text-slate-900">{emptyCopy.title}</p>
        <p className="mt-2 text-sm leading-5 text-slate-500">{emptyCopy.message}</p>
      </div> : fields.map((item, index) => {
      const prefix = `${path}.${index}`;
      return <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <EntryHeader number={index + 1} title={type === 'condition' ? 'Condition' : type === 'allergy' ? 'Allergy' : type === 'surgery' ? 'Procedure' : type === 'vaccination' ? 'Vaccination' : 'Hospitalization'} remove={() => array.remove(index)} />
        {type === 'condition' && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TextField register={register} errors={errors} name={`${prefix}.name`} label="Condition name" placeholder="e.g. Asthma" maxLength={50} className="sm:col-span-2" />
          <TextField register={register} errors={errors} name={`${prefix}.date`} label="Date diagnosed" type="date" min="1900-01-01" max={today} />
          <SelectField register={register} errors={errors} name={`${prefix}.status`} label="Current status" options={ [['active','Active'],['managed','Managed'],['resolved','Resolved']] } />
          <TextField register={register} errors={errors} name={`${prefix}.med`} label="Medication / treatment" placeholder="Optional" maxLength={60} className="sm:col-span-2 xl:col-span-4" />
        </div>}
        {type === 'allergy' && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TextField register={register} errors={errors} name={`${prefix}.name`} label="Allergen" placeholder="e.g. Penicillin" maxLength={40} className="sm:col-span-2" />
          <div><SelectField register={register} errors={errors} name={`${prefix}.severity`} label="Severity" options={ [['mild','Mild'],['moderate','Moderate'],['severe','Severe']] } /><div className="mt-2"><Badge tone={watch(`${prefix}.severity`) || 'moderate'}>{watch(`${prefix}.severity`) || 'moderate'} severity</Badge></div></div>
          <TextField register={register} errors={errors} name={`${prefix}.reaction`} label="Reaction" placeholder="e.g. Hives, swelling" maxLength={120} />
          <TextField register={register} errors={errors} name={`${prefix}.med`} label="Medication / response" placeholder="Optional" maxLength={60} className="sm:col-span-2 xl:col-span-4" />
        </div>}
        {type === 'surgery' && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <TextField register={register} errors={errors} name={`${prefix}.name`} label="Procedure" placeholder="e.g. Appendectomy" maxLength={50} required />
          <TextField register={register} errors={errors} name={`${prefix}.date`} label="Date performed" type="date" min="1900-01-01" max={today} />
          <TextField register={register} errors={errors} name={`${prefix}.loc`} label="Body area" placeholder="e.g. Abdomen" maxLength={40} />
          <TextField register={register} errors={errors} name={`${prefix}.hospital`} label="Hospital / facility" placeholder="Facility name" maxLength={100} />
          <TextField register={register} errors={errors} name={`${prefix}.surgeon`} label="Surgeon" placeholder="Surgeon's name" maxLength={80} />
          <div className="sm:col-span-2 xl:col-span-3"><Field id={fieldId(`${prefix}.notes`)} label="Notes" error={fieldError(errors, `${prefix}.notes`)}><Textarea id={fieldId(`${prefix}.notes`)} maxLength={500} placeholder="Recovery notes or other useful details" invalid={!!fieldError(errors, `${prefix}.notes`)} aria-describedby={fieldError(errors, `${prefix}.notes`) ? `${fieldId(`${prefix}.notes`)}-error` : undefined} {...register(`${prefix}.notes`)} /></Field></div>
        </div>}
        {type === 'vaccination' && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <TextField register={register} errors={errors} name={`${prefix}.name`} label="Vaccine" placeholder="e.g. COVID-19, Hepatitis B, Tetanus" maxLength={80} required />
          <TextField register={register} errors={errors} name={`${prefix}.dose`} label="Dose" placeholder="e.g. Dose 1, Booster" maxLength={30} />
          <TextField register={register} errors={errors} name={`${prefix}.date`} label="Date received" type="date" min="1900-01-01" max={today} />
          <TextField register={register} errors={errors} name={`${prefix}.nextDate`} label="Next dose due (optional)" type="date" min="1900-01-01" />
          <TextField register={register} errors={errors} name={`${prefix}.facility`} label="Clinic / facility" placeholder="Optional" maxLength={100} className="sm:col-span-2" />
          <div className="sm:col-span-2 xl:col-span-3"><Field id={fieldId(`${prefix}.notes`)} label="Notes" error={fieldError(errors, `${prefix}.notes`)}><Textarea id={fieldId(`${prefix}.notes`)} maxLength={300} placeholder="Brand, lot number, or reactions (optional)" invalid={!!fieldError(errors, `${prefix}.notes`)} aria-describedby={fieldError(errors, `${prefix}.notes`) ? `${fieldId(`${prefix}.notes`)}-error` : undefined} {...register(`${prefix}.notes`)} /></Field></div>
        </div>}
        {type === 'hospitalization' && <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField register={register} errors={errors} name={`${prefix}.hospital`} label="Hospital" maxLength={120} required />
            <TextField register={register} errors={errors} name={`${prefix}.admissionDate`} label="Admission date" type="date" min="1900-01-01" max={today} />
            <TextField register={register} errors={errors} name={`${prefix}.dischargeDate`} label="Discharge date" type="date" min="1900-01-01" max={today} />
            <TextField register={register} errors={errors} name={`${prefix}.reason`} label="Reason for admission" maxLength={500} />
            <TextField register={register} errors={errors} name={`${prefix}.diagnosis`} label="Diagnosis during admission" maxLength={500} />
            <TextField register={register} errors={errors} name={`${prefix}.treatment`} label="Treatment / procedures" maxLength={2000} className="sm:col-span-2" />
          </div>
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">Related chronic conditions (optional)</p>
            <p className="mb-3 text-xs text-slate-500">Leave all unchecked for accidents, acute illnesses, or admissions unrelated to a chronic condition. The admission diagnosis does not automatically create a chronic condition.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(currentConditions || []).map((c, ci) => c?.name?.trim() ? <label key={`${c.name}-${ci}`} className="flex items-center gap-2 rounded-lg border border-slate-100 p-2 text-sm"><input type="checkbox" value={String(ci)} {...register(`${prefix}.relatedConditions`)} />{c.name}</label> : null)}
            </div>
            {!(currentConditions || []).some(c => c?.name?.trim()) && <p className="text-xs text-slate-500">Add a condition above to associate it with an admission.</p>}
          </div>
        </div>}
      </div>;
    })}
    <Button variant="secondary" onClick={() => array.append(appendRow)} disabled={fields.length >= 30} className="w-full border-dashed sm:w-auto"><Plus size={16} /> Add {type === 'condition' ? 'condition' : type === 'allergy' ? 'allergy' : type === 'surgery' ? 'procedure' : type === 'vaccination' ? 'vaccination' : 'hospitalization'}</Button>
    </div>;
  };

  return <div>
    <SectionHeading eyebrow="Clinical intake" title={profileExists ? 'Update your medical history' : 'Build your medical history'} description="Keep your personal details, biometrics, conditions, allergies, vaccinations, and procedures in one structured record." action={<div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500"><ShieldCheck size={15} className="text-teal-700" /> Private to your account</div>} />
    {profileExists && <Alert variant="info" title="You already have a record">Changes are saved as a full replacement of the current clinical history after you review the preview.</Alert>}
    <form className="mt-5 space-y-5" noValidate onSubmit={handleSubmit((values) => { setPreviewData(values); setPreviewOpen(true); })}>
      <Card><CardHeader title="Patient details" description="Your core demographic and contact information" icon={UserRound} /><CardBody className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <TextField register={register} errors={errors} name="patientName" label="Full name" placeholder="As shown on your records" maxLength={60} required autoComplete="name" />
        <TextField register={register} errors={errors} name="patientBday" label="Date of birth" type="date" min="1900-01-01" max={today} required />
        <div className="min-w-0 space-y-1.5"><p id="age-readonly-label" className="block text-sm font-semibold text-slate-700">Current age</p><div id="age-readonly" aria-labelledby="age-readonly-label" role="status" className="flex h-11 items-center rounded-xl border border-slate-100 bg-slate-50 px-3.5 text-sm font-semibold text-slate-600">{age === '—' ? 'Enter your birthday' : `${age} years old`}</div></div>
        <SelectField register={register} errors={errors} name="patientSex" label="Sex" required options={ [['M','Male'],['F','Female']] } />
        <SelectField register={register} errors={errors} name="patientRel" label="Religion / belief" required options={[['', 'Choose an option'], ...PHILIPPINE_RELIGIONS.map(r => [r, r])]} />
        <SelectField register={register} errors={errors} name="patientMarStat" label="Marital status" required options={ [['single','Single'],['married','Married'],['separated','Separated'],['divorced','Divorced'],['widowed','Widowed']] } />
        <TextField register={register} errors={errors} name="patientOccup" label="Occupation" placeholder="Your occupation" maxLength={40} required />
        <TextField register={register} errors={errors} name="patientPNum" label="Phone number" placeholder="e.g. +63 917 123 4567" maxLength={20} required autoComplete="tel" />
        <div className="min-w-0 space-y-1.5"><p id="account-email-label" className="block text-sm font-semibold text-slate-700">Account email</p><div id="account-email" aria-labelledby="account-email-label" className="flex h-11 min-w-0 items-center rounded-xl border border-slate-100 bg-slate-50 px-3.5 text-sm text-slate-500"><span className="truncate">{user?.email || 'Loading account email…'}</span></div><p className="text-xs leading-5 text-slate-500">Managed in Settings</p></div>
      </CardBody></Card>

      <Card><CardHeader title="Vitals & physician" description="Core biometrics and the clinician you usually see" icon={HeartPulse} /><CardBody className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SelectField register={register} errors={errors} name="patientBType" label="Blood type" required options={ [['Unknown','Not sure'],['A+','A positive'],['A-','A negative'],['B+','B positive'],['B-','B negative'],['AB+','AB positive'],['AB-','AB negative'],['O+','O positive'],['O-','O negative']] } />
          <TextField register={register} errors={errors} name="patientHeight" label="Height (cm)" type="number" min="30" max="272" step="0.1" placeholder="e.g. 168" required />
          <TextField register={register} errors={errors} name="patientWeight" label="Weight (kg)" type="number" min="1" max="500" step="0.1" placeholder="e.g. 62.5" required />
          <div className="min-w-0 space-y-1.5"><p id="bmi-live-label" className="block text-sm font-semibold text-slate-700">Calculated BMI</p><div id="bmi-live" aria-labelledby="bmi-live-label" role="status" aria-live="polite" className="flex h-11 items-center justify-between rounded-xl border border-teal-100 bg-teal-50 px-3.5"><span className="text-lg font-extrabold text-teal-800">{bmi}</span><Badge tone="teal">kg/m²</Badge></div><p className="text-xs leading-5 text-slate-500">Auto-calculated; not a diagnosis</p></div>
        </div>
        <div className="border-t border-slate-100 pt-5"><div className="mb-4 flex items-start gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><ClipboardPlus size={18} /></span><div><h3 className="text-sm font-bold text-ink">Assigned physician</h3><p className="mt-1 text-xs leading-5 text-slate-500">Optional contact details for your primary care physician. If you enter any field, physician name and a valid email are required.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-3"><TextField register={register} errors={errors} name="doctor.name" label="Physician name" placeholder="Dr. Maria Santos" maxLength={60} /><TextField register={register} errors={errors} name="doctor.email" label="Physician email" type="email" placeholder="doctor@clinic.com" maxLength={100} /><TextField register={register} errors={errors} name="doctor.phone" label="Physician phone" placeholder="Contact number" maxLength={20} /></div>
        </div>
      </CardBody></Card>

      <Card id="conditions-section"><CardHeader className="!border-b-0 !pb-0" title="Chronic conditions" description="Long term conditions you live with, and whether they are active, managed or resolved." icon={HeartPulse} action={<Badge tone="neutral" className="min-w-7 justify-center">{conditionsArray.fields.length}</Badge>} /><CardBody className="!pt-5">{renderRows(conditionsArray, 'condition')}</CardBody></Card>
      <Card id="allergies-section"><CardHeader className="!border-b-0 !pb-0" title="Known allergies" description="Anything that causes you a reaction, and how serious it is." icon={AlertCircle} action={<Badge tone="neutral" className="min-w-7 justify-center">{allergiesArray.fields.length}</Badge>} /><CardBody className="!pt-5">{renderRows(allergiesArray, 'allergy')}</CardBody></Card>
      <Card id="surgeries-section"><CardHeader className="!border-b-0 !pb-0" title="Surgical history" description="Operations and procedures you have had." icon={FileHeart} action={<Badge tone="neutral" className="min-w-7 justify-center">{surgeriesArray.fields.length}</Badge>} /><CardBody className="!pt-5">{renderRows(surgeriesArray, 'surgery')}</CardBody></Card>
      <Card id="vaccinations-section"><CardHeader className="!border-b-0 !pb-0" title="Vaccination records" description="Vaccines you have received, with dose and date." icon={Syringe} action={<Badge tone="neutral" className="min-w-7 justify-center">{vaccinationsArray.fields.length}</Badge>} /><CardBody className="!pt-5">{renderRows(vaccinationsArray, 'vaccination')}</CardBody></Card>
      <Card id="hospitalizations-section"><CardHeader className="!border-b-0 !pb-0" title="Hospitalization history" description="Previous hospital admissions, diagnoses, and treatments." icon={ClipboardPlus} action={<Badge tone="neutral" className="min-w-7 justify-center">{hospitalizationsArray.fields.length}</Badge>} /><CardBody className="!pt-5">{renderRows(hospitalizationsArray, 'hospitalization')}</CardBody></Card>

      {Object.keys(errors).length > 0 && <Alert title="Some details need attention">Review the highlighted fields. The preview opens after all required fields and validation rules pass.</Alert>}
      <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={16} className="text-teal-700" /><span>Review every detail before you save.</span>{isDirty && <Badge tone="amber">Unsaved edits</Badge>}</div><div className="flex gap-2"><Button variant="secondary" type="button" onClick={() => navigate('/dashboard')}>Cancel</Button><Button type="submit" loading={saving}><ClipboardCheck size={16} /> Review record</Button></div></div>
    </form>

    <DialogPrimitive.Root open={previewOpen} onOpenChange={(open) => { if (!saving) setPreviewOpen(open); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/45 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl outline-none sm:p-7" aria-describedby="record-preview-description">
          <div className="mb-5 flex items-start justify-between gap-3"><div><DialogPrimitive.Title className="text-xl font-extrabold tracking-tight text-ink">Review your clinical record</DialogPrimitive.Title><DialogPrimitive.Description id="record-preview-description" className="mt-1 text-sm leading-6 text-slate-500">Confirm these details before saving them to your MediVault record.</DialogPrimitive.Description></div><DialogPrimitive.Close aria-label="Close preview" disabled={saving} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X size={18} /></DialogPrimitive.Close></div>
          {previewData && <div className="max-h-[58vh] overflow-y-auto pr-1">
            <PreviewGroup title="Patient details"><dl className="grid gap-x-5 sm:grid-cols-2"><PreviewLine label="Full name" value={previewData.patientName} /><PreviewLine label="Date of birth" value={previewData.patientBday} /><PreviewLine label="Age" value={`${ageFrom(previewData.patientBday)} years`} /><PreviewLine label="Sex" value={previewData.patientSex === 'M' ? 'Male' : 'Female'} /><PreviewLine label="Religion" value={previewData.patientRel} /><PreviewLine label="Marital status" value={previewData.patientMarStat} /><PreviewLine label="Occupation" value={previewData.patientOccup} /><PreviewLine label="Phone" value={previewData.patientPNum} /><PreviewLine label="Account email" value={user?.email} /></dl></PreviewGroup>
            <PreviewGroup title="Vitals & physician"><dl className="grid gap-x-5 sm:grid-cols-2"><PreviewLine label="Blood type" value={previewData.patientBType === 'Unknown' ? 'Not sure' : previewData.patientBType} /><PreviewLine label="Height" value={`${previewData.patientHeight} cm`} /><PreviewLine label="Weight" value={`${previewData.patientWeight} kg`} /><PreviewLine label="BMI" value={`${bmiFrom(previewData.patientHeight, previewData.patientWeight)} kg/m²`} /><PreviewLine label="Physician" value={previewData.doctor.name} /><PreviewLine label="Physician email" value={previewData.doctor.email} /><PreviewLine label="Physician phone" value={previewData.doctor.phone} /></dl></PreviewGroup>
            <PreviewGroup title="Chronic conditions" count={previewData.conditions.filter((row) => row.name.trim()).length}><PreviewList rows={previewData.conditions.filter((row) => row.name.trim())} type="conditions" /></PreviewGroup>
            <PreviewGroup title="Known allergies" count={previewData.allergies.filter((row) => row.name.trim()).length}><PreviewList rows={previewData.allergies.filter((row) => row.name.trim())} type="allergies" /></PreviewGroup>
            <PreviewGroup title="Surgical history" count={previewData.surgeries.filter((row) => row.name.trim()).length}><PreviewList rows={previewData.surgeries.filter((row) => row.name.trim())} type="surgeries" /></PreviewGroup>
            <PreviewGroup title="Vaccination records" count={previewData.vaccinations.filter((row) => row.name.trim()).length}>{previewData.vaccinations.filter((row) => row.name.trim()).length ? <div className="space-y-2">{previewData.vaccinations.filter((row) => row.name.trim()).map((v, i) => <div key={i} className="rounded-xl border border-slate-100 p-3 text-sm"><strong>{v.name}{v.dose ? ` (${v.dose})` : ''}</strong><p className="mt-1 text-xs text-slate-500">{v.date || 'Date not provided'}{v.nextDate ? ` · Next dose ${v.nextDate}` : ''}{v.facility ? ` · ${v.facility}` : ''}</p>{v.notes && <p className="mt-1 text-xs text-slate-600">{v.notes}</p>}</div>)}</div> : <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">No vaccinations documented.</p>}</PreviewGroup>
            <PreviewGroup title="Hospitalization history" count={previewData.hospitalizations.filter((row) => row.hospital.trim()).length}><div className="space-y-2">{previewData.hospitalizations.filter(row => row.hospital.trim()).map((h,i) => <div key={i} className="rounded-xl border border-slate-100 p-3 text-sm"><strong>{h.hospital}</strong><p className="mt-1 text-slate-500">{h.admissionDate || 'Admission date not provided'} – {h.dischargeDate || 'No discharge date'}</p><p>Reason: {h.reason || 'Not documented'}</p><p>Diagnosis: {h.diagnosis || 'Not documented'}</p><p>Treatment: {h.treatment || 'Not documented'}</p><p>Related chronic conditions: {h.relatedConditions?.length ? h.relatedConditions.map(i => previewData.conditions[Number(i)]?.name).filter(Boolean).join(', ') : 'None selected'}</p></div>)}</div></PreviewGroup>
          </div>}
          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={() => setPreviewOpen(false)} disabled={saving}>Continue editing</Button><Button onClick={saveRecord} loading={saving}><Save size={16} /> Confirm and save</Button></div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  </div>;
}
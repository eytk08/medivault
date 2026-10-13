import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, ClipboardList, Droplets, FileHeart, HeartPulse, PencilLine, ShieldCheck, Stethoscope, QrCode, Download, Link2, X, RefreshCw, Syringe, Plus } from 'lucide-react';
import { patientApi, shareApi } from '../api/client';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { emergencyQrText } from '../utils/emergency-qr';
import { useSession } from '../hooks/useSession';
import { SectionHeading } from '../components/ui/SectionHeading';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { PageSkeleton } from '../components/ui/Skeleton';

const display = (value) => value === null || value === undefined || value === '' ? '—' : value;
const dateText = (value) => {
  if (!value) return 'Not documented';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};
const bmiOf = (height, weight) => {
  const h = Number(height) / 100; 
  const w = Number(weight);
  return h > 0 && w > 0 ? (w / (h * h)).toFixed(1) : '—';
};

function SnapshotStat({ icon: Icon, label, value, supporting, tone = 'teal' }) {
  const tones = { teal: 'bg-teal-50 text-teal-700', blue: 'bg-sky-50 text-sky-700', rose: 'bg-rose-50 text-rose-700', amber: 'bg-amber-50 text-amber-800' };
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-slate-500">{label}</span><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={18} /></span></div><p className="mt-4 truncate text-2xl font-extrabold tracking-tight text-ink">{value}</p>{supporting && <p className="mt-1 text-xs text-slate-500">{supporting}</p>}</div>;
}

function ConditionCard({ item }) {
  const status = item.conditionStatus || 'active';
  const tone = status === 'resolved' ? 'green' : status === 'managed' ? 'blue' : 'amber';
  return <div className="rounded-xl border border-slate-100 p-4 sm:flex sm:items-start sm:justify-between sm:gap-4"><div className="min-w-0"><p className="font-semibold text-ink">{item.conditionName}</p><p className="mt-1 text-sm text-slate-500">Diagnosed {dateText(item.conditionDiagnosis)}</p>{item.conditionMed && <p className="mt-2 text-xs text-slate-500">Medication: {item.conditionMed}</p>}</div><Badge tone={tone} className="mt-3 sm:mt-0">{status}</Badge></div>;
}

function AllergyCard({ item }) {
  const severity = item.allergenSeverity || 'moderate';
  return <div className="rounded-xl border border-slate-100 p-4 sm:flex sm:items-start sm:justify-between sm:gap-4"><div className="min-w-0"><p className="font-semibold text-ink">{item.allergenName}</p><p className="mt-1 text-sm text-slate-500">{item.allergenReaction || 'No reaction documented'}</p>{item.allergenMed && <p className="mt-2 text-xs text-slate-500">Medication: {item.allergenMed}</p>}</div><Badge tone={severity} className="mt-3 sm:mt-0">{severity} severity</Badge></div>;
}

function SurgeryCard({ item }) {
  return <div className="rounded-xl border border-slate-100 p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-semibold text-ink">{item.surgeryName}</p><p className="mt-1 text-sm text-slate-500">{dateText(item.surgeryDate)}{item.surgeryLoc ? ` · ${item.surgeryLoc}` : ''}</p></div><Badge tone="neutral">Procedure</Badge></div>{(item.surgeryHospital || item.surgerySurgeon) && <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 text-sm sm:grid-cols-2"><p><span className="text-slate-400">Hospital</span><span className="mt-0.5 block font-medium text-slate-700">{display(item.surgeryHospital)}</span></p><p><span className="text-slate-400">Surgeon</span><span className="mt-0.5 block font-medium text-slate-700">{display(item.surgerySurgeon)}</span></p></div>}{item.surgeryNotes && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">{item.surgeryNotes}</p>}</div>;
}

function EmptyState({ title, message, icon: Icon = ClipboardList }) {
  return <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm"><Icon size={20} /></span><p className="mt-3 text-sm font-semibold text-slate-700">{title}</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">{message}</p></div>;
}

export default function DashboardPage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [qrData, setQrData] = useState('');
  const [shareBusy, setShareBusy] = useState(false);
  const [shareHours, setShareHours] = useState('24');
  const [qrLarge, setQrLarge] = useState(false);
  const [qrTab, setQrTab] = useState('card');
  const [cardQr, setCardQr] = useState('');
  const [cardTruncated, setCardTruncated] = useState(false);
  const [cardText, setCardText] = useState('');
  const [shareError, setShareError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    patientApi.get({ signal: controller.signal }).then((data) => setProfile(data.profile)).catch((error) => {
      if (error.name !== 'AbortError') setLoadError(error.message || 'Could not load your medical record.');
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const patient = profile?.patient;
  const bmi = useMemo(() => patient ? bmiOf(patient.patientHeight, patient.patientWeight) : '—', [patient]);
  if (loading) return <PageSkeleton />;
  if (loadError) return <div className="mx-auto max-w-2xl pt-8"><Alert title="Your record could not be loaded">{loadError}</Alert><div className="mt-4"><Button variant="secondary" onClick={() => window.location.reload()}>Try again</Button></div></div>;

if (!profile) {
  return (
    <div className="mx-auto max-w-2xl pt-8">
      <Alert title="Medical record unavailable">
        Your dashboard could not find your medical profile.
        Please try again or open your clinical record.
      </Alert>
      <div className="mt-4 flex gap-3">
        <Button
          onClick={() => window.location.reload()}
          variant="secondary"
        >
          Try again
        </Button>
        <Button onClick={() => navigate('/records/edit')}>
          Open clinical record
        </Button>
      </div>
    </div>
  );
}

  const conditions = profile.conditions || [];
  const allergies = profile.allergies || [];
  const surgeries = profile.surgeries || [];
  const vaccinations = profile.vaccinations || [];
  const firstName = patient.patientName.trim().split(/\s+/)[0] || 'there';
  const patientId = `MV-${String(patient.patient_ID).padStart(6, '0')}`;
  
  // The emergency card QR is made locally from the record, so it needs no API call.
  const buildCardQr = async () => {
    const { text, truncated } = emergencyQrText(profile);
    setCardText(text); setCardTruncated(truncated);
    setCardQr(await QRCode.toDataURL(text, { width: 640, margin: 2, errorCorrectionLevel: 'M' }));
  };
  const openSharing = async () => {
    setShareOpen(true); setShareError('');
    if (cardQr) return;
    try { await buildCardQr(); } catch { setShareError('Could not create the emergency card QR.'); }
  };
  // The expiring link needs the server. A failure here only affects this tab.
  const createLink = async () => {
    setShareBusy(true); setShareError('');
    try {
      const result = await shareApi.create({ expiresInHours: Number(shareHours) });
      const token = result.token || result.share?.token;
      const url = result.url || (token ? `${window.location.origin}/shared/${token}` : '');
      if (!url) throw new Error('The server did not return a valid share link.');
      setShareUrl(url);
      setQrData(await QRCode.toDataURL(url, { width: 480, margin: 2, errorCorrectionLevel: 'M' }));
    } catch (e) {
      setShareError(e.message || 'Could not create a share link.');
    } finally {
      setShareBusy(false);
    }
  };
  const downloadCardQr = () => { if (!cardQr) return; const a = document.createElement('a'); a.href = cardQr; a.download = 'medivault-emergency-card-qr.png'; a.click(); };
  const copyCardText = async () => { try { await navigator.clipboard.writeText(cardText); toast.success('Card text copied.'); } catch { window.prompt('Copy this card text:', cardText); } };

  const downloadQr = () => { if (!qrData) return; const a = document.createElement('a'); a.href = qrData; a.download = 'medivault-share-qr.png'; a.click(); };
  const exportPdf = () => {
    const esc = (v) => String(v ?? 'Not documented').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const rows = (title, items, render) => `<h2>${title}</h2>${items.length ? items.map(render).join('') : '<p>None documented.</p>'}`;
    const html = `<!doctype html><html><head><title>MediVault Medical History</title><style>body{font:14px Arial,sans-serif;color:#172b3a;max-width:800px;margin:32px auto;line-height:1.5}h1{color:#0f766e}h2{border-bottom:1px solid #cbd5e1;padding-bottom:5px;margin-top:24px}article{padding:10px 0;border-bottom:1px solid #e2e8f0}.muted{color:#64748b}@media print{body{margin:0}}</style></head><body><h1>MediVault Medical History</h1><p class="muted">Patient record ID: ${esc(patientId)} · Exported ${esc(new Date().toLocaleDateString())}</p><h2>Patient details</h2><p><b>Name:</b> ${esc(patient.patientName)}<br><b>Date of birth:</b> ${esc(dateText(patient.patientBday))}<br><b>Sex:</b> ${esc(patient.patientSex)}<br><b>Religion:</b> ${esc(patient.patientRel)}<br><b>Blood type:</b> ${esc(patient.patientBType)}<br><b>Height / weight:</b> ${esc(patient.patientHeight)} cm / ${esc(patient.patientWeight)} kg</p>${rows('Chronic conditions',conditions,x=>`<article><b>${esc(x.conditionName)}</b><br>Status: ${esc(x.conditionStatus)} · Diagnosed: ${esc(dateText(x.conditionDiagnosis))}<br>${esc(x.conditionMed||'')}</article>`)}${rows('Allergies',allergies,x=>`<article><b>${esc(x.allergenName)}</b><br>Severity: ${esc(x.allergenSeverity)} · Reaction: ${esc(x.allergenReaction||'Not documented')}</article>`)}${rows('Vaccination records',vaccinations,x=>`<article><b>${esc(x.vaccineName)}${x.doseLabel?` (${esc(x.doseLabel)})`:''}</b><br>Date: ${esc(dateText(x.vaccinationDate))}${x.nextDoseDate?` · Next dose: ${esc(dateText(x.nextDoseDate))}`:''}<br>Facility: ${esc(x.facility||'Not documented')}${x.notes?`<br>${esc(x.notes)}`:''}</article>`)}${rows('Surgical history',surgeries,x=>`<article><b>${esc(x.surgeryName)}</b><br>Date: ${esc(dateText(x.surgeryDate))} · Hospital: ${esc(x.surgeryHospital||'Not documented')}<br>${esc(x.surgeryNotes||'')}</article>`)}${rows('Hospitalization history',profile.hospitalizations||[],x=>`<article><b>${esc(x.hospital)}</b><br>${esc(dateText(x.admissionDate))} – ${esc(dateText(x.dischargeDate))}<br>Reason: ${esc(x.reason||'Not documented')}<br>Diagnosis: ${esc(x.diagnosis||'Not documented')}<br>Treatment: ${esc(x.treatment||'Not documented')}<br>Related chronic conditions: ${esc(x.relatedConditions?.map(c=>c.conditionName).join(', ')||'None selected')}</article>`)}<p class="muted">This document contains sensitive personal health information. Share it only with intended recipients.</p><script>window.onload=()=>window.print()</script></body></html>`;
    const win = window.open('', '_blank');
    if (!win) { toast.error('Allow pop-ups to export your PDF.'); return; }
    win.document.write(html); win.document.close();
  };
  const copyShare = async () => { try { await navigator.clipboard.writeText(shareUrl); toast.success('Link copied to clipboard!'); } catch { window.prompt('Copy this temporary share link:', shareUrl); } };

  return <div>
    <SectionHeading eyebrow="Patient overview" title={`Good to see you, ${firstName}.`} description="Here is your personal medical snapshot and the clinical history you have documented." action={<Button onClick={() => navigate('/records/edit')}><PencilLine size={16} /> Edit record</Button>} />
    <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-ink px-5 py-5 text-white shadow-soft sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-teal-300"><ShieldCheck size={23} /></div><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">Your record ID</p><p className="mt-1 text-lg font-bold tracking-wide">{patientId}</p></div></div><div className="flex items-center gap-2 self-start rounded-full bg-emerald-400/15 px-3 py-2 text-xs font-semibold text-emerald-200 sm:self-auto"><CheckCircle2 size={14} /> Personal record active</div></div>

    <button onClick={openSharing} className="mb-5 flex w-full items-center gap-4 rounded-2xl border border-teal-100 bg-white p-4 text-left shadow-sm transition hover:border-teal-300 hover:shadow-md"><span className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><QrCode size={30}/></span><span className="min-w-0 flex-1"><strong className="block text-ink">Share medical history</strong><span className="mt-1 block text-sm text-slate-500">Open QR options, download your QR image, or export your medical history.</span></span><ArrowRight size={18}/></button>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SnapshotStat icon={Droplets} label="Blood group" value={patient.patientBType === 'Unknown' ? 'Not set' : patient.patientBType} supporting="Blood type" tone="rose" />
      <SnapshotStat icon={CalendarDays} label="Age" value={`${patient.patientAge} years`} supporting={`Born ${dateText(patient.patientBday)}`} tone="blue" />
      <SnapshotStat icon={Activity} label="Height & weight" value={`${patient.patientHeight} cm`} supporting={`${patient.patientWeight} kg body weight`} tone="teal" />
      <SnapshotStat icon={HeartPulse} label="Body mass index" value={bmi} supporting="Calculated from height and weight" tone="amber" />
    </div>

    <div className="mt-6 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <Card><CardHeader title="Clinical conditions" description="Documented diagnoses and their current status" icon={Stethoscope} action={<Badge tone="neutral">{conditions.length} {conditions.length === 1 ? 'entry' : 'entries'}</Badge>} /><CardBody className="space-y-3">{conditions.length ? conditions.map((item, i) => <ConditionCard item={item} key={`${item.conditionName}-${i}`} />) : <EmptyState title="No documented conditions" message="Conditions you add to your clinical record will appear here." />}</CardBody></Card>
      <Card><CardHeader title="Assigned physician" description="Your primary care contact" icon={Stethoscope} /><CardBody>{profile.doctor ? <><p className="text-lg font-bold text-ink">{profile.doctor.doctorPDoc}</p><div className="mt-4 space-y-3 text-sm"><p><span className="block text-xs font-medium text-slate-400">Email</span><a className="mt-1 inline-block break-all font-medium text-teal-700 hover:underline" href={`mailto:${profile.doctor.doctorPEmail}`}>{profile.doctor.doctorPEmail}</a></p>{profile.doctor.doctorPNum && <p><span className="block text-xs font-medium text-slate-400">Phone</span><a className="mt-1 inline-block font-medium text-slate-700 hover:underline" href={`tel:${profile.doctor.doctorPNum}`}>{profile.doctor.doctorPNum}</a></p>}</div></> : <EmptyState title="No physician added" message="Add a physician in your clinical record to keep contact details close." icon={Stethoscope} />}</CardBody></Card>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-2">
      <Card><CardHeader title="Known allergies" description="Allergens, reactions, and recorded severity" icon={AlertTriangle} action={<Badge tone="neutral">{allergies.length} {allergies.length === 1 ? 'entry' : 'entries'}</Badge>} /><CardBody className="space-y-3">{allergies.length ? allergies.map((item, i) => <AllergyCard item={item} key={`${item.allergenName}-${i}`} />) : <EmptyState title="No documented allergies" message="Known allergies and reactions will show here once you add them." icon={CheckCircle2} />}</CardBody></Card>
      <Card><CardHeader title="Surgical history" description="Procedures and supporting details" icon={FileHeart} action={<Badge tone="neutral">{surgeries.length} {surgeries.length === 1 ? 'entry' : 'entries'}</Badge>} /><CardBody className="space-y-3">{surgeries.length ? surgeries.map((item, i) => <SurgeryCard item={item} key={`${item.surgeryName}-${i}`} />) : <EmptyState title="No documented surgeries" message="Add past procedures to keep your surgical history with the rest of your record." icon={FileHeart} />}</CardBody></Card>
    </div>

    <div className="mt-5"><Card><CardHeader title="Vaccination records" description="Vaccines received, with dose and next due date" icon={Syringe} action={<Badge tone="neutral">{vaccinations.length} {vaccinations.length === 1 ? 'entry' : 'entries'}</Badge>} /><CardBody className="space-y-3">{vaccinations.length ? vaccinations.map((v, i) => <div key={`${v.vaccineName}-${i}`} className="rounded-xl border border-slate-100 p-4 sm:flex sm:items-start sm:justify-between sm:gap-4"><div className="min-w-0"><p className="font-semibold text-ink">{v.vaccineName}{v.doseLabel ? ` · ${v.doseLabel}` : ''}</p><p className="mt-1 text-sm text-slate-500">Received {dateText(v.vaccinationDate)}{v.facility ? ` · ${v.facility}` : ''}</p>{v.notes && <p className="mt-2 text-xs text-slate-500">{v.notes}</p>}</div>{v.nextDoseDate && <Badge tone="blue" className="mt-3 sm:mt-0">Next dose {dateText(v.nextDoseDate)}</Badge>}</div>) : <EmptyState title="No documented vaccinations" message="Add your vaccines and boosters to keep them with the rest of your record." icon={Syringe} />}<Button variant="secondary" size="sm" onClick={() => navigate('/records/edit?add=vaccination')}><Plus size={15} /> Add vaccination</Button></CardBody></Card></div>

    <div className="mt-5"><Card><CardHeader title="Hospitalization history" description="Admissions and diagnoses, separate from chronic conditions" icon={FileHeart} action={<Badge tone="neutral">{(profile.hospitalizations||[]).length} entries</Badge>}/><CardBody className="space-y-3">{profile.hospitalizations?.length ? profile.hospitalizations.map((h,i)=><div key={i} className="rounded-xl border border-slate-100 p-4"><p className="font-semibold text-ink">{h.hospital}</p><p className="mt-1 text-sm text-slate-500">{dateText(h.admissionDate)} – {dateText(h.dischargeDate)}</p><p className="mt-2 text-sm">Diagnosis: {h.diagnosis||'Not documented'}</p><p className="text-sm">Related chronic conditions: {h.relatedConditions?.length?h.relatedConditions.map(c=>c.conditionName).join(', '):'None selected'}</p></div>):<EmptyState title="No hospitalizations documented" message="Add hospital admissions in your medical record." icon={FileHeart}/>}</CardBody></Card></div>

    <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-teal-100 bg-teal-50/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-teal-700"><ShieldCheck size={17} /></span><div><p className="text-sm font-semibold text-teal-900">Keep your record current</p><p className="mt-1 text-xs leading-5 text-teal-800">Review details when your medications, allergies, or clinical history changes. Share information with care professionals as appropriate.</p></div></div><Button variant="secondary" onClick={() => navigate('/records/edit')} className="shrink-0">Review record <ArrowRight size={15} /></Button></div>
    
    {shareOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" role="dialog" aria-modal="true" aria-labelledby="share-title">
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
          <div className="flex items-start justify-between">
            <div>
              <h2 id="share-title" className="text-xl font-extrabold text-ink">Share medical history</h2>
              <p className="mt-1 text-sm text-slate-500">Choose an emergency card QR or an expiring link to your full record.</p>
            </div>
            <button onClick={() => setShareOpen(false)} aria-label="Close sharing panel" className="rounded-lg p-2 hover:bg-slate-100"><X size={18} /></button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Share options">
            <button role="tab" aria-selected={qrTab === 'card'} onClick={() => setQrTab('card')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${qrTab === 'card' ? 'bg-white text-ink shadow-sm' : 'text-slate-500'}`}>Emergency card</button>
            <button role="tab" aria-selected={qrTab === 'link'} onClick={() => setQrTab('link')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${qrTab === 'link' ? 'bg-white text-ink shadow-sm' : 'text-slate-500'}`}>Full record link</button>
          </div>
          {shareError && <div className="mt-4"><Alert variant="error" title="Something went wrong">{shareError}</Alert></div>}

          {qrTab === 'card' ? (
            <>
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">This QR holds your key details as plain text. Anyone who scans or photographs it can read them, and it cannot be revoked. It leaves out your birthday, phone number and hospital history.</div>
              <div className="my-4 flex justify-center rounded-xl bg-slate-50 p-4">
                {cardQr ? <button type="button" onClick={() => setQrLarge((v) => !v)} aria-label="Toggle larger QR code"><img src={cardQr} alt="QR code containing your emergency medical card as text" className={qrLarge ? 'h-80 w-80 max-w-full' : 'h-56 w-56 max-w-full'} /></button> : <p className="py-10 text-sm text-slate-500">Preparing QR…</p>}
              </div>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{cardText}</pre>
              {cardTruncated && <p className="mt-2 text-xs text-amber-800">The card was shortened to keep the QR scannable. The most important details come first.</p>}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button onClick={downloadCardQr} disabled={!cardQr}><Download size={15} /> Download QR PNG</Button>
                <Button variant="secondary" onClick={copyCardText} disabled={!cardText}><Link2 size={15} /> Copy card text</Button>
                <Button variant="secondary" onClick={exportPdf} className="col-span-2"><Download size={15} /> Export medical history PDF</Button>
              </div>
            </>
          ) : (
            <>
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Anyone with this link can view a snapshot of your full record until it expires. Share only with a trusted recipient.</div>
              {!shareUrl ? (
                <div className="mt-4 flex flex-col gap-3">
                  <label className="text-sm font-semibold text-slate-700" htmlFor="share-hours">Link stays valid for</label>
                  <select id="share-hours" value={shareHours} onChange={(e) => setShareHours(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm">
                    <option value="1">1 hour</option><option value="24">24 hours</option><option value="72">3 days</option><option value="168">7 days</option>
                  </select>
                  <Button onClick={createLink} loading={shareBusy}><Link2 size={15} /> Create expiring link and QR</Button>
                </div>
              ) : (
                <>
                  <div className="my-4 flex justify-center rounded-xl bg-slate-50 p-4"><img src={qrData} alt="QR code for temporary medical record share" className="h-56 w-56 max-w-full" /></div>
                  <p className="break-all rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{shareUrl}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button onClick={downloadQr}><Download size={15} /> Download QR PNG</Button>
                    <Button variant="secondary" onClick={copyShare}><Link2 size={15} /> Copy share link</Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    )}
  </div>;
}
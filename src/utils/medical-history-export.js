const clean = (v) => v == null || v === '' ? 'Not documented' : String(v);
const date = (v) => { if (!v) return 'Not documented'; const d = new Date(`${String(v).slice(0,10)}T00:00:00`); return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString(); };
export function medicalHistoryText(profile) {
  const p = profile?.patient || {};
  const lines = [`MEDIVAULT MEDICAL HISTORY`, `Generated: ${new Date().toLocaleString()}`, '', 'PERSONAL DETAILS', `Name: ${clean(p.patientName)}`, `Date of birth: ${date(p.patientBday)}`, `Age: ${clean(p.patientAge)}`, `Sex: ${p.patientSex === 'M' ? 'Male' : p.patientSex === 'F' ? 'Female' : 'Not documented'}`, `Religion: ${clean(p.patientRel)}`, `Marital status: ${clean(p.patientMarStat)}`, `Occupation: ${clean(p.patientOccup)}`, `Phone: ${clean(p.patientPNum)}`, `Email: ${clean(p.patientEmail)}`, `Blood type: ${clean(p.patientBType)}`, `Height: ${clean(p.patientHeight)} cm`, `Weight: ${clean(p.patientWeight)} kg`];
  const list = (title, rows, formatter) => { lines.push('', title); if (!rows?.length) lines.push('None documented'); else rows.forEach((r, i) => lines.push(`${i+1}. ${formatter(r)}`)); };
  list('CONDITIONS', profile?.conditions, r => `${clean(r.conditionName)} | diagnosed: ${date(r.conditionDiagnosis)} | status: ${clean(r.conditionStatus)} | treatment: ${clean(r.conditionMed)}`);
  list('ALLERGIES', profile?.allergies, r => `${clean(r.allergenName)} | severity: ${clean(r.allergenSeverity)} | reaction: ${clean(r.allergenReaction)} | medication: ${clean(r.allergenMed)}`);
  list('MEDICATIONS / TREATMENTS', [...(profile?.conditions || []).filter(x=>x.conditionMed).map(x=>({name:x.conditionMed,source:x.conditionName})), ...(profile?.allergies || []).filter(x=>x.allergenMed).map(x=>({name:x.allergenMed,source:x.allergenName}))], r => `${r.name} (recorded for ${r.source})`);
  list('VACCINATIONS', profile?.vaccinations, r => `${clean(r.vaccineName)} | dose: ${clean(r.doseLabel)} | date: ${date(r.vaccinationDate)} | next dose: ${r.nextDoseDate ? date(r.nextDoseDate) : 'Not scheduled'} | facility: ${clean(r.facility)} | notes: ${clean(r.notes)}`);
  list('SURGERIES', profile?.surgeries, r => `${clean(r.surgeryName)} | date: ${date(r.surgeryDate)} | hospital: ${clean(r.surgeryHospital)} | surgeon: ${clean(r.surgerySurgeon)} | notes: ${clean(r.surgeryNotes)}`);
  list('HOSPITALIZATION HISTORY', profile?.hospitalizations, r => `${clean(r.hospital)} | admission: ${date(r.admissionDate)} | discharge: ${date(r.dischargeDate)} | reason: ${clean(r.reason)} | diagnosis: ${clean(r.diagnosis)} | treatment: ${clean(r.treatment)} | related chronic conditions: ${r.relatedConditions?.length ? r.relatedConditions.join(', ') : 'None selected'}`);
  lines.push('', 'This document contains sensitive health information. Share only with trusted recipients.');
  return lines.join('\n');
}
export function downloadMedicalHistoryTxt(profile) {
  const blob = new Blob([medicalHistoryText(profile)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'medivault-medical-history.txt'; a.click(); URL.revokeObjectURL(url);
}
export function downloadMedicalHistoryPdf(profile) {
  const text = medicalHistoryText(profile);
  const win = window.open('', '_blank');
  if (!win) throw new Error('Please allow pop-ups to create the PDF.');
  const esc = text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  win.document.write(`<!doctype html><html><head><title>MediVault Medical History</title><style>body{font:12pt/1.5 Arial,sans-serif;color:#172033;margin:28mm 20mm;white-space:pre-wrap}h1{font-size:18pt}@media print{body{margin:15mm}}</style></head><body><h1>MediVault Medical History</h1><pre style="font:inherit;white-space:pre-wrap">${esc}</pre><script>window.onload=()=>window.print()<\/script></body></html>`); win.document.close();
}

// Builds the plain text stored inside the emergency card QR code. Everything is made in the
// browser from the record already on screen, so no API call or share link is needed.
// Kept to ASCII and a size cap so the code stays easy to scan.
export const QR_TEXT_LIMIT = 700;

const ascii = (v) => String(v ?? '').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
const shortDate = (v) => (v ? String(v).slice(0, 10) : '');

export function emergencyQrText(profile) {
  const p = profile?.patient || {};
  const sex = p.patientSex === 'M' ? 'Male' : p.patientSex === 'F' ? 'Female' : '';
  const blocks = [];
  const head = ['MEDIVAULT EMERGENCY CARD', `Name: ${ascii(p.patientName)}`];
  const basics = [p.patientAge != null ? `Age ${p.patientAge}` : '', sex, p.patientBType && p.patientBType !== 'Unknown' ? `Blood ${p.patientBType}` : ''].filter(Boolean).join(', ');
  if (basics) head.push(basics);
  blocks.push(head.join('\n'));

  const allergies = (profile?.allergies || []).map((a) => `${ascii(a.allergenName)} (${ascii(a.allergenSeverity)})`);
  blocks.push(`Allergies: ${allergies.length ? allergies.join(', ') : 'None recorded'}`);

  const conditions = (profile?.conditions || []).filter((c) => c.conditionStatus !== 'resolved').map((c) => ascii(c.conditionName));
  blocks.push(`Conditions: ${conditions.length ? conditions.join(', ') : 'None recorded'}`);

  const meds = [...new Set((profile?.conditions || []).map((c) => ascii(c.conditionMed)).filter(Boolean))];
  if (meds.length) blocks.push(`Medication: ${meds.join(', ')}`);

  const vaccines = (profile?.vaccinations || []).map((v) => [ascii(v.vaccineName), ascii(v.doseLabel), shortDate(v.vaccinationDate)].filter(Boolean).join(' '));
  if (vaccines.length) blocks.push(`Vaccines: ${vaccines.join('; ')}`);

  if (profile?.doctor?.doctorPDoc) blocks.push(`Doctor: ${ascii(profile.doctor.doctorPDoc)}${profile.doctor.doctorPNum ? ` ${ascii(profile.doctor.doctorPNum)}` : ''}`);

  // Add blocks in order of importance and stop before the size cap. Vaccines are shortened first.
  let out = '';
  let truncated = false;
  for (const block of blocks) {
    const next = out ? `${out}\n${block}` : block;
    if (next.length <= QR_TEXT_LIMIT) { out = next; continue; }
    truncated = true;
    const room = QR_TEXT_LIMIT - out.length - 5;
    if (room > 30) out = `${out}\n${block.slice(0, room)}...`;
    break;
  }
  return { text: out, truncated };
}

import { z } from 'zod';
import { isValidDate } from './auth';

const dateField = z.string().max(10).refine((value) => !value || isValidDate(value), 'Use a valid date between 1900 and today.');
const optionalText = (max, label) => z.string().trim().max(max, `${label} must be ${max} characters or fewer.`);

const condition = z.object({
  name: optionalText(50, 'Condition name'),
  date: dateField,
  med: optionalText(60, 'Medication'),
  status: z.enum(['active', 'managed', 'resolved'])
});
const allergy = z.object({
  name: optionalText(40, 'Allergen'),
  severity: z.enum(['mild', 'moderate', 'severe']),
  reaction: optionalText(120, 'Reaction'),
  med: optionalText(60, 'Medication')
});
const hospitalization = z.object({
  hospital: optionalText(120, 'Hospital'), admissionDate: dateField, dischargeDate: dateField,
  reason: optionalText(500, 'Reason'), diagnosis: optionalText(500, 'Diagnosis'), treatment: optionalText(2000, 'Treatment'),
  relatedConditions: z.array(z.string()).max(30)
});
const futureDateField = z.string().max(10).refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Use a valid date.');
const vaccination = z.object({
  name: optionalText(80, 'Vaccine name'),
  dose: optionalText(30, 'Dose'),
  date: dateField,
  nextDate: futureDateField,
  facility: optionalText(100, 'Facility'),
  notes: optionalText(300, 'Notes')
});
const surgery = z.object({
  name: optionalText(50, 'Procedure'),
  date: dateField,
  loc: optionalText(40, 'Body area'),
  hospital: optionalText(100, 'Hospital'),
  surgeon: optionalText(80, 'Surgeon'),
  notes: optionalText(500, 'Notes')
});

export const medicalRecordSchema = z.object({
  patientName: z.string().trim().min(1, 'Full name is required.').max(60, 'Full name must be 60 characters or fewer.'),
  patientBday: z.string().min(1, 'Birthday is required.').refine(isValidDate, 'Enter a valid date between 1900 and today.'),
  patientSex: z.enum(['M', 'F'], { required_error: 'Choose a sex.' }),
  patientRel: z.string().trim().min(1, 'Religion is required.').max(60, 'Religion must be 60 characters or fewer.'),
  patientMarStat: z.enum(['single', 'married', 'separated', 'divorced', 'widowed']),
  patientOccup: z.string().trim().min(1, 'Occupation is required.').max(40, 'Occupation must be 40 characters or fewer.'),
  patientPNum: z.string().trim().min(7, 'Phone number must contain at least 7 characters.').max(20, 'Phone number must be 20 characters or fewer.')
    .regex(/^[0-9+()\s-]{7,20}$/, 'Use digits, spaces, +, parentheses, or dashes.'),
  patientBType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']),
  patientHeight: z.coerce.number().finite('Height is required.').min(30, 'Height must be at least 30 cm.').max(272, 'Height cannot exceed 272 cm.'),
  patientWeight: z.coerce.number().finite('Weight is required.').min(1, 'Weight must be at least 1 kg.').max(500, 'Weight cannot exceed 500 kg.'),
  doctor: z.object({
    name: optionalText(60, "Doctor's name"),
    phone: optionalText(20, "Doctor's phone"),
    email: z.string().trim().max(100, 'Doctor email must be 100 characters or fewer.')
  }),
  conditions: z.array(condition).max(30, 'You can add at most 30 conditions.'),
  allergies: z.array(allergy).max(30, 'You can add at most 30 allergies.'),
  surgeries: z.array(surgery).max(30, 'You can add at most 30 surgeries.'),
  hospitalizations: z.array(hospitalization).max(30, 'You can add at most 30 hospitalizations.'),
  vaccinations: z.array(vaccination).max(30, 'You can add at most 30 vaccinations.')
}).superRefine((values, ctx) => {
  const phone = values.doctor.phone.trim();
  const name = values.doctor.name.trim();
  const email = values.doctor.email.trim();
  if (phone && !/^[0-9+()\s-]{7,20}$/.test(phone)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['doctor', 'phone'], message: 'Use digits, spaces, +, parentheses, or dashes.' });
  }
  if (name || phone || email) {
    if (!name) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['doctor', 'name'], message: "Enter your doctor's name." });
    if (!z.string().email().safeParse(email).success) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['doctor', 'email'], message: 'Enter a valid doctor email.' });
  }
  values.conditions.forEach((row, index) => {
    const hasDetails = !!(row.date || row.med.trim() || row.name.trim() || row.status !== 'active');
    if (hasDetails && !row.name.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['conditions', index, 'name'], message: 'Enter a condition name or clear this row.' });
    }
  });
  values.allergies.forEach((row, index) => {
    const hasDetails = !!(row.reaction.trim() || row.med.trim() || row.name.trim() || row.severity !== 'moderate');
    if (hasDetails && !row.name.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['allergies', index, 'name'], message: 'Enter an allergen or clear this row.' });
    }
  });
  values.hospitalizations.forEach((row, index) => {
    const hasDetails = !!(row.hospital.trim() || row.admissionDate || row.dischargeDate || row.reason.trim() || row.diagnosis.trim() || row.treatment.trim() || row.relatedConditions.length);
    if (hasDetails && !row.hospital.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['hospitalizations', index, 'hospital'], message: 'Enter the hospital or clear this row.' });
    if (row.hospital.trim() && !row.admissionDate) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['hospitalizations', index, 'admissionDate'], message: 'Admission date is required.' });
    if (row.dischargeDate && row.admissionDate && row.dischargeDate < row.admissionDate) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['hospitalizations', index, 'dischargeDate'], message: 'Discharge date cannot be before admission.' });
  });
  values.vaccinations.forEach((row, index) => {
    const hasDetails = !!(row.dose.trim() || row.date || row.nextDate || row.facility.trim() || row.notes.trim() || row.name.trim());
    if (hasDetails && !row.name.trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['vaccinations', index, 'name'], message: 'Enter a vaccine name or clear this row.' });
    if (row.date && row.nextDate && row.nextDate < row.date) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['vaccinations', index, 'nextDate'], message: 'Next dose cannot be before the vaccination date.' });
  });
  values.surgeries.forEach((row, index) => {
    const hasDetails = !!(row.date || row.loc.trim() || row.hospital.trim() || row.surgeon.trim() || row.notes.trim() || row.name.trim());
    if (hasDetails && !row.name.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['surgeries', index, 'name'], message: 'Enter a procedure or clear this row.' });
    }
  });
  [...values.conditions, ...values.allergies, ...values.surgeries].forEach((row, index) => {
    // Empty repeating rows are intentional and will be removed from the submitted payload.
    if (typeof row.name !== 'string') ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index], message: 'Invalid row.' });
  });
});

export const emptyRecord = {
  patientName: '', patientBday: '', patientSex: 'M', patientRel: '', patientMarStat: 'single',
  patientOccup: '', patientPNum: '', patientBType: 'Unknown', patientHeight: '', patientWeight: '',
  doctor: { name: '', phone: '', email: '' },
  conditions: [{ name: '', date: '', med: '', status: 'active' }],
  allergies: [{ name: '', severity: 'moderate', reaction: '', med: '' }],
  surgeries: [{ name: '', date: '', loc: '', hospital: '', surgeon: '', notes: '' }],
  hospitalizations: [{ hospital: '', admissionDate: '', dischargeDate: '', reason: '', diagnosis: '', treatment: '', relatedConditions: [] }],
  vaccinations: [{ name: '', dose: '', date: '', nextDate: '', facility: '', notes: '' }]
};

export function profileToForm(profile) {
  if (!profile) return emptyRecord;
  const p = profile.patient;
  return {
    patientName: p.patientName || '', patientBday: String(p.patientBday || '').slice(0, 10), patientSex: p.patientSex || 'M',
    patientRel: p.patientRel || '', patientMarStat: p.patientMarStat || 'single', patientOccup: p.patientOccup || '',
    patientPNum: p.patientPNum || '', patientBType: p.patientBType || 'Unknown', patientHeight: Number(p.patientHeight), patientWeight: Number(p.patientWeight),
    doctor: { name: profile.doctor?.doctorPDoc || '', phone: profile.doctor?.doctorPNum || '', email: profile.doctor?.doctorPEmail || '' },
    conditions: profile.conditions?.length ? profile.conditions.map((c) => ({ name: c.conditionName || '', date: c.conditionDiagnosis ? String(c.conditionDiagnosis).slice(0, 10) : '', med: c.conditionMed || '', status: c.conditionStatus || 'active' })) : emptyRecord.conditions,
    allergies: profile.allergies?.length ? profile.allergies.map((a) => ({ name: a.allergenName || '', severity: a.allergenSeverity || 'moderate', reaction: a.allergenReaction || '', med: a.allergenMed || '' })) : emptyRecord.allergies,
    surgeries: profile.surgeries?.length ? profile.surgeries.map((s) => ({ name: s.surgeryName || '', date: s.surgeryDate ? String(s.surgeryDate).slice(0, 10) : '', loc: s.surgeryLoc || '', hospital: s.surgeryHospital || '', surgeon: s.surgerySurgeon || '', notes: s.surgeryNotes || '' })) : emptyRecord.surgeries,
    hospitalizations: profile.hospitalizations?.length ? profile.hospitalizations.map(h => ({ hospital: h.hospital || '', admissionDate: h.admissionDate ? String(h.admissionDate).slice(0,10) : '', dischargeDate: h.dischargeDate ? String(h.dischargeDate).slice(0,10) : '', reason: h.reason || '', diagnosis: h.diagnosis || '', treatment: h.treatment || '', relatedConditions: (h.relatedConditions || []).map(c => (profile.conditions || []).findIndex(x => x.condition_ID === c.condition_ID)).filter(i => i >= 0).map(String) })) : emptyRecord.hospitalizations,
    vaccinations: profile.vaccinations?.length ? profile.vaccinations.map((v) => ({ name: v.vaccineName || '', dose: v.doseLabel || '', date: v.vaccinationDate ? String(v.vaccinationDate).slice(0, 10) : '', nextDate: v.nextDoseDate ? String(v.nextDoseDate).slice(0, 10) : '', facility: v.facility || '', notes: v.notes || '' })) : emptyRecord.vaccinations
  };
}

export function toApiPayload(values) {
  const keepNamed = (rows) => rows.filter((row) => row.name.trim());
  const namedConditions = values.conditions.map((row, sourceIndex) => ({ row, sourceIndex })).filter(({ row }) => row.name.trim());
  const conditionIndexMap = new Map(namedConditions.map(({ sourceIndex }, compactIndex) => [String(sourceIndex), String(compactIndex)]));
  return {
    ...values,
    patientHeight: String(values.patientHeight),
    patientWeight: String(values.patientWeight),
    doctor: values.doctor,
    conditions: namedConditions.map(({ row: { name, date, med, status } }) => ({ name, date, med, status })),
    allergies: keepNamed(values.allergies).map(({ name, severity, reaction, med }) => ({ name, severity, reaction, med })),
    surgeries: keepNamed(values.surgeries).map(({ name, date, loc, hospital, surgeon, notes }) => ({ name, date, loc, hospital, surgeon, notes })),
    vaccinations: (values.vaccinations || []).filter((row) => row.name.trim()).map(({ name, dose, date, nextDate, facility, notes }) => ({ name, dose, date, nextDate, facility, notes })),
    hospitalizations: values.hospitalizations.filter(h => h.hospital.trim()).map(h => ({ ...h, relatedConditions: (h.relatedConditions || []).map(i => conditionIndexMap.get(String(i))).filter(i => i !== undefined) }))
  };
}

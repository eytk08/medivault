const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { requireLogin } = require('../middleware/auth');
const { passwordProblem, EMAIL_RE, cleanEmail } = require('./auth');

const router = express.Router();
router.use(requireLogin);

const SEX = ['M', 'F'];
const MARITAL = ['single', 'married', 'separated', 'divorced', 'widowed'];
const STATUS = ['active', 'managed', 'resolved'];
const SEVERITY = ['mild', 'moderate', 'severe'];
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
const PHONE_RE = /^[0-9+()\s-]{7,20}$/;
const MAX_ROWS = 30;

class ValidationError extends Error {}

const text = (v) => String(v == null ? '' : v).trim();

function required(v, label, max) {
  const s = text(v);
  if (!s) throw new ValidationError(`${label} is required.`);
  if (s.length > max) throw new ValidationError(`${label} must be ${max} characters or fewer.`);
  return s;
}

function optional(v, label, max) {
  const s = text(v);
  if (s.length > max) throw new ValidationError(`${label} must be ${max} characters or fewer.`);
  return s || null;
}

// Accepts one of the allowed values. An empty value falls back to the default.
function choice(v, allowed, fallback, label) {
  const s = text(v) || fallback;
  if (!allowed.includes(s)) throw new ValidationError(`${label} must be one of: ${allowed.join(', ')}.`);
  return s;
}

function dateValue(v, label, isRequired, allowFuture = false) {
  const s = text(v);
  if (!s) {
    if (isRequired) throw new ValidationError(`${label} is required.`);
    return null;
  }
  const d = new Date(s + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) {
    throw new ValidationError(`${label} is not a valid date.`);
  }
  if (s < '1900-01-01') throw new ValidationError(`${label} must be on or after 1900.`);
  if (!allowFuture && d > new Date()) throw new ValidationError(`${label} must be between 1900 and today.`);
  if (allowFuture && s > '2100-12-31') throw new ValidationError(`${label} is too far in the future.`);
  return s;
}

function numberInRange(v, label, min, max) {
  const n = Number(v);
  if (v === '' || v == null || !Number.isFinite(n) || n < min || n > max) {
    throw new ValidationError(`${label} must be a number between ${min} and ${max}.`);
  }
  return n;
}

function list(v, label) {
  if (v == null) return [];
  if (!Array.isArray(v)) throw new ValidationError(`${label} must be a list.`);
  if (v.length > MAX_ROWS) throw new ValidationError(`${label} can have at most ${MAX_ROWS} entries.`);
  return v;
}

// Turns the form payload into clean values, or throws a ValidationError.
function parsePersonal(b) {
  const patientSex = text(b.patientSex);
  const patientMarStat = text(b.patientMarStat);
  if (!SEX.includes(patientSex)) throw new ValidationError('Please choose a sex.');
  if (!MARITAL.includes(patientMarStat)) throw new ValidationError('Please choose a marital status.');
  return {
    patientName: required(b.patientName, 'Full name', 60),
    patientBday: dateValue(b.patientBday, 'Birthday', true),
    patientSex,
    patientRel: required(b.patientRel, 'Religion', 60),
    patientMarStat
  };
}

function parseFullForm(b) {
  const personal = parsePersonal(b);
  const patientBType = text(b.patientBType) || 'Unknown';
  if (!BLOOD.includes(patientBType)) throw new ValidationError('Please choose a valid blood type.');
  const phone = required(b.patientPNum, 'Phone number', 20);
  if (!PHONE_RE.test(phone)) throw new ValidationError('Phone number can only use digits, spaces, +, (, ) and dashes.');

  const d = b.doctor || {};
  let doctor = null;
  if (text(d.name) || text(d.email) || text(d.phone)) {
    const email = cleanEmail(d.email);
    if (!EMAIL_RE.test(email) || email.length > 100) throw new ValidationError("Please enter a valid email for your doctor.");
    doctor = { name: required(d.name, "Doctor's name", 60), phone: optional(d.phone, "Doctor's phone", 20), email };
  }

  const conditions = list(b.conditions, 'Conditions')
    .map((c, sourceIndex) => ({ ...c, _sourceIndex: sourceIndex }))
    .filter((c) => text(c && c.name))
    .map((c) => ({
      _sourceIndex: c._sourceIndex, name: required(c.name, 'Condition name', 50),
      date: dateValue(c.date, 'Diagnosis date', false),
      med: optional(c.med, 'Condition medicine', 60),
      status: choice(c.status, STATUS, 'active', 'Condition status')
    }));
  const allergies = list(b.allergies, 'Allergies')
    .filter((a) => text(a && a.name))
    .map((a) => ({
      name: required(a.name, 'Allergy name', 40),
      med: optional(a.med, 'Allergy medicine', 60),
      severity: choice(a.severity, SEVERITY, 'mild', 'Allergy severity'),
      reaction: optional(a.reaction, 'Allergy reaction', 120)
    }));
  const hospitalizations = list(b.hospitalizations, 'Hospitalizations').filter(h => text(h && h.hospital)).map(h => {
    const admissionDate = dateValue(h.admissionDate, 'Admission date', true);
    const dischargeDate = dateValue(h.dischargeDate, 'Discharge date', false);
    if (dischargeDate && dischargeDate < admissionDate) throw new ValidationError('Discharge date cannot be before admission.');
    const relatedConditions = h.relatedConditions == null ? [] : h.relatedConditions;
    if (!Array.isArray(relatedConditions) || relatedConditions.length > MAX_ROWS) throw new ValidationError('Related conditions must be a list.');
    return { hospital: required(h.hospital, 'Hospital', 120), admissionDate, dischargeDate, reason: optional(h.reason, 'Admission reason', 500), diagnosis: optional(h.diagnosis, 'Admission diagnosis', 500), treatment: optional(h.treatment, 'Treatment', 2000), relatedConditions: relatedConditions.map(v => { const n = Number(v); if (!Number.isInteger(n) || n < 0 || n >= list(b.conditions, 'Conditions').length) throw new ValidationError('A selected related condition is invalid.'); return n; }) };
  });
  const vaccinations = list(b.vaccinations, 'Vaccinations')
    .filter((v) => text(v && v.name))
    .map((v) => {
      const date = dateValue(v.date, 'Vaccination date', false);
      const nextDate = dateValue(v.nextDate, 'Next dose date', false, true);
      if (date && nextDate && nextDate < date) throw new ValidationError('Next dose date cannot be before the vaccination date.');
      return {
        name: required(v.name, 'Vaccine name', 80),
        dose: optional(v.dose, 'Dose', 30),
        date, nextDate,
        facility: optional(v.facility, 'Vaccination facility', 100),
        notes: optional(v.notes, 'Vaccination notes', 300)
      };
    });
  const surgeries = list(b.surgeries, 'Surgeries')
    .filter((s) => text(s && s.name))
    .map((s) => ({
      name: required(s.name, 'Surgery type', 50),
      loc: optional(s.loc, 'Surgery location', 40),
      date: dateValue(s.date, 'Surgery date', false),
      hospital: optional(s.hospital, 'Hospital', 100),
      surgeon: optional(s.surgeon, 'Surgeon', 80),
      notes: optional(s.notes, 'Surgery notes', 500)
    }));

  return {
    ...personal,
    patientOccup: required(b.patientOccup, 'Occupation', 40),
    patientPNum: phone,
    patientBType,
    patientHeight: numberInRange(b.patientHeight, 'Height (cm)', 30, 272),
    patientWeight: numberInRange(b.patientWeight, 'Weight (kg)', 1, 500),
    doctor, conditions, allergies, surgeries, hospitalizations, vaccinations
  };
}

// ---------- GET the logged in user's full record ----------
router.get('/patient', async (req, res, next) => {
  try {
    const [rows] = await db.execute('SELECT * FROM v_patient WHERE fk_user_ID = ?', [req.session.userId]);
    if (rows.length === 0) return res.json({ profile: null });
    const patient = rows[0];

    const [[doctor], [conditions], [allergies], [surgeries], [hospitalizations], [vaccinations]] = await Promise.all([
      patient.fk_doctor_ID
        ? db.execute('SELECT doctorPDoc, doctorPNum, doctorPEmail FROM doctor WHERE doctor_ID = ?', [patient.fk_doctor_ID])
        : Promise.resolve([[]]),
      db.execute('SELECT condition_ID, conditionName, conditionDiagnosis, conditionMed, conditionStatus FROM medical_condition WHERE fk_patient_ID = ? ORDER BY conditionDiagnosis DESC', [patient.patient_ID]),
      db.execute('SELECT allergenName, allergenMed, allergenSeverity, allergenReaction FROM allergy WHERE fk_patient_ID = ? ORDER BY allergy_ID', [patient.patient_ID]),
      db.execute('SELECT surgeryLoc, surgeryName, surgeryDate, surgeryHospital, surgerySurgeon, surgeryNotes FROM surgery WHERE fk_patient_ID = ? ORDER BY surgeryDate DESC', [patient.patient_ID]),
      db.execute(`SELECT h.hospitalization_ID, h.hospital, h.admissionDate, h.dischargeDate, h.reason, h.diagnosis, h.treatment, hc.fk_condition_ID AS condition_ID, mc.conditionName FROM hospitalization h LEFT JOIN hospitalization_condition hc ON hc.fk_hospitalization_ID=h.hospitalization_ID LEFT JOIN medical_condition mc ON mc.condition_ID=hc.fk_condition_ID WHERE h.fk_patient_ID=? ORDER BY h.admissionDate DESC`, [patient.patient_ID]),
      db.execute('SELECT vaccination_ID, vaccineName, doseLabel, vaccinationDate, nextDoseDate, facility, notes FROM vaccination WHERE fk_patient_ID = ? ORDER BY vaccinationDate DESC, vaccination_ID', [patient.patient_ID])
    ]);

    const hospMap = new Map(); for (const h of hospitalizations) { if (!hospMap.has(h.hospitalization_ID)) hospMap.set(h.hospitalization_ID, { hospitalization_ID: h.hospitalization_ID, hospital: h.hospital, admissionDate: h.admissionDate, dischargeDate: h.dischargeDate, reason: h.reason, diagnosis: h.diagnosis, treatment: h.treatment, relatedConditions: [] }); if (h.condition_ID) hospMap.get(h.hospitalization_ID).relatedConditions.push({ condition_ID: h.condition_ID, conditionName: h.conditionName }); }
    res.json({ profile: { patient, doctor: doctor[0] || null, conditions, allergies, surgeries, hospitalizations: [...hospMap.values()], vaccinations } });
  } catch (err) {
    next(err);
  }
});

// ---------- Create or replace the full record (one transaction) ----------
router.post('/patient', async (req, res, next) => {
  let data;
  try {
    data = parseFullForm(req.body || {});
  } catch (err) {
    if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
    return next(err);
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Reuse the doctor if the email is already known, otherwise add a new doctor.
    let doctorId = null;
    if (data.doctor) {
      const [found] = await conn.execute('SELECT doctor_ID FROM doctor WHERE doctorPEmail = ?', [data.doctor.email]);
      if (found.length) {
        doctorId = found[0].doctor_ID;
      } else {
        const [ins] = await conn.execute('INSERT INTO doctor (doctorPDoc, doctorPNum, doctorPEmail) VALUES (?, ?, ?)', [data.doctor.name, data.doctor.phone, data.doctor.email]);
        doctorId = ins.insertId;
      }
    }

    const fields = [data.patientName, data.patientBday, data.patientSex, data.patientRel, data.patientMarStat, data.patientOccup, data.patientPNum, data.patientBType, data.patientHeight, data.patientWeight, doctorId];
    const [existing] = await conn.execute('SELECT patient_ID FROM patient WHERE fk_user_ID = ?', [req.session.userId]);
    let patientId;
    if (existing.length) {
      patientId = existing[0].patient_ID;
      await conn.execute(
        `UPDATE patient SET patientName=?, patientBday=?, patientSex=?, patientRel=?, patientMarStat=?, patientOccup=?,
                patientPNum=?, patientBType=?, patientHeight=?, patientWeight=?, fk_doctor_ID=? WHERE patient_ID=?`,
        [...fields, patientId]);
      // Replace the lists: simplest way to handle edits and deletions from the form.
      await conn.execute('DELETE FROM medical_condition WHERE fk_patient_ID = ?', [patientId]);
      await conn.execute('DELETE FROM allergy WHERE fk_patient_ID = ?', [patientId]);
      await conn.execute('DELETE FROM surgery WHERE fk_patient_ID = ?', [patientId]);
      await conn.execute('DELETE FROM hospitalization WHERE fk_patient_ID = ?', [patientId]);
      await conn.execute('DELETE FROM vaccination WHERE fk_patient_ID = ?', [patientId]);
    } else {
      const [ins] = await conn.execute(
        `INSERT INTO patient (patientName, patientBday, patientSex, patientRel, patientMarStat, patientOccup,
                patientPNum, patientBType, patientHeight, patientWeight, fk_doctor_ID, fk_user_ID)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [...fields, req.session.userId]);
      patientId = ins.insertId;
    }

    if (data.conditions.length) {
      await conn.query('INSERT INTO medical_condition (fk_patient_ID, conditionName, conditionDiagnosis, conditionMed, conditionStatus) VALUES ?',
        [data.conditions.map((c) => [patientId, c.name, c.date, c.med, c.status])]);
    }
    if (data.allergies.length) {
      await conn.query('INSERT INTO allergy (fk_patient_ID, allergenName, allergenMed, allergenSeverity, allergenReaction) VALUES ?',
        [data.allergies.map((a) => [patientId, a.name, a.med, a.severity, a.reaction])]);
    }
    if (data.surgeries.length) {
      await conn.query('INSERT INTO surgery (fk_patient_ID, surgeryLoc, surgeryName, surgeryDate, surgeryHospital, surgerySurgeon, surgeryNotes) VALUES ?',
        [data.surgeries.map((s) => [patientId, s.loc, s.name, s.date, s.hospital, s.surgeon, s.notes])]);
    }

    if (data.vaccinations.length) {
      await conn.query('INSERT INTO vaccination (fk_patient_ID, vaccineName, doseLabel, vaccinationDate, nextDoseDate, facility, notes) VALUES ?',
        [data.vaccinations.map((v) => [patientId, v.name, v.dose, v.date, v.nextDate, v.facility, v.notes])]);
    }

    if (data.hospitalizations.length) {
      for (const h of data.hospitalizations) {
        const [ins] = await conn.execute('INSERT INTO hospitalization (fk_patient_ID, hospital, admissionDate, dischargeDate, reason, diagnosis, treatment) VALUES (?, ?, ?, ?, ?, ?, ?)', [patientId, h.hospital, h.admissionDate, h.dischargeDate, h.reason, h.diagnosis, h.treatment]);
        for (const index of h.relatedConditions) {
          const condition = data.conditions.find(c => c._sourceIndex === index);
          if (!condition) continue;
          const [found] = await conn.execute('SELECT condition_ID FROM medical_condition WHERE fk_patient_ID=? AND conditionName=? ORDER BY condition_ID LIMIT 1', [patientId, condition.name]);
          if (found.length) await conn.execute('INSERT IGNORE INTO hospitalization_condition (fk_hospitalization_ID, fk_condition_ID) VALUES (?, ?)', [ins.insertId, found[0].condition_ID]);
        }
      }
    }
    await conn.commit();
    res.status(existing.length ? 200 : 201).json({ ok: true, patientId });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That phone number is already used by another account.' });
    next(err);
  } finally {
    conn.release();
  }
});

// ---------- Settings: personal information ----------
router.put('/patient/personal', async (req, res, next) => {
  try {
    const p = parsePersonal(req.body || {});
    const [result] = await db.execute(
      'UPDATE patient SET patientName=?, patientBday=?, patientSex=?, patientRel=?, patientMarStat=? WHERE fk_user_ID=?',
      [p.patientName, p.patientBday, p.patientSex, p.patientRel, p.patientMarStat, req.session.userId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Fill out the medical history form first.' });
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
    next(err);
  }
});

async function checkPassword(userId, password) {
  const [rows] = await db.execute('SELECT password_hash FROM users WHERE user_ID = ?', [userId]);
  return rows.length > 0 && bcrypt.compare(String(password || ''), rows[0].password_hash);
}

// ---------- Settings: account information ----------
router.put('/account', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const email = cleanEmail(req.body.email);
    const phone = text(req.body.phone);

    if (!(await checkPassword(req.session.userId, currentPassword))) return res.status(403).json({ error: 'Current password is incorrect.' });
    if (!EMAIL_RE.test(email) || email.length > 100) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (phone && !PHONE_RE.test(phone)) return res.status(400).json({ error: 'Phone number can only use digits, spaces, +, (, ) and dashes.' });
    if (newPassword) {
      const problem = passwordProblem(newPassword);
      if (problem) return res.status(400).json({ error: problem });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      if (newPassword) {
        await conn.execute('UPDATE users SET email = ?, password_hash = ? WHERE user_ID = ?', [email, await bcrypt.hash(newPassword, 10), req.session.userId]);
      } else {
        await conn.execute('UPDATE users SET email = ? WHERE user_ID = ?', [email, req.session.userId]);
      }
      if (phone) await conn.execute('UPDATE patient SET patientPNum = ? WHERE fk_user_ID = ?', [phone, req.session.userId]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    req.session.email = email;
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That email or phone number is already used by another account.' });
    next(err);
  }
});

// ---------- Settings: delete account (child tables are removed by ON DELETE CASCADE) ----------
router.delete('/account', async (req, res, next) => {
  try {
    if (!(await checkPassword(req.session.userId, (req.body || {}).password))) return res.status(403).json({ error: 'Password is incorrect.' });
    await db.execute('DELETE FROM users WHERE user_ID = ?', [req.session.userId]);
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ ok: true });
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

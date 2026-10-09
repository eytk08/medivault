const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { requireLogin } = require('../middleware/auth');
const { passwordProblem, EMAIL_RE, cleanEmail } = require('./auth');

const router = express.Router();
router.use(requireLogin);

const SEX = ['M', 'F'];
const MARITAL = ['single', 'married', 'separated', 'divorced', 'widowed'];
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

function dateValue(v, label, isRequired) {
  const s = text(v);
  if (!s) {
    if (isRequired) throw new ValidationError(`${label} is required.`);
    return null;
  }
  const d = new Date(s + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) {
    throw new ValidationError(`${label} is not a valid date.`);
  }
  if (s < '1900-01-01' || d > new Date()) throw new ValidationError(`${label} must be between 1900 and today.`);
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
    patientRel: required(b.patientRel, 'Religion', 30),
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
    .filter((c) => text(c && c.name))
    .map((c) => ({ name: required(c.name, 'Condition name', 50), date: dateValue(c.date, 'Diagnosis date', false), med: optional(c.med, 'Condition medicine', 60) }));
  const allergies = list(b.allergies, 'Allergies')
    .filter((a) => text(a && a.name))
    .map((a) => ({ name: required(a.name, 'Allergy name', 40), med: optional(a.med, 'Allergy medicine', 60) }));
  const surgeries = list(b.surgeries, 'Surgeries')
    .filter((s) => text(s && s.name))
    .map((s) => ({ name: required(s.name, 'Surgery type', 50), loc: optional(s.loc, 'Surgery location', 40), date: dateValue(s.date, 'Surgery date', false) }));

  return {
    ...personal,
    patientOccup: required(b.patientOccup, 'Occupation', 40),
    patientPNum: phone,
    patientBType,
    patientHeight: numberInRange(b.patientHeight, 'Height (cm)', 30, 272),
    patientWeight: numberInRange(b.patientWeight, 'Weight (kg)', 1, 500),
    doctor, conditions, allergies, surgeries
  };
}

// ---------- GET the logged in user's full record ----------
router.get('/patient', async (req, res, next) => {
  try {
    const [rows] = await db.execute('SELECT * FROM v_patient WHERE fk_user_ID = ?', [req.session.userId]);
    if (rows.length === 0) return res.json({ profile: null });
    const patient = rows[0];

    const [[doctor], [conditions], [allergies], [surgeries]] = await Promise.all([
      patient.fk_doctor_ID
        ? db.execute('SELECT doctorPDoc, doctorPNum, doctorPEmail FROM doctor WHERE doctor_ID = ?', [patient.fk_doctor_ID])
        : Promise.resolve([[]]),
      db.execute('SELECT conditionName, conditionDiagnosis, conditionMed FROM medical_condition WHERE fk_patient_ID = ? ORDER BY conditionDiagnosis DESC', [patient.patient_ID]),
      db.execute('SELECT allergenName, allergenMed FROM allergy WHERE fk_patient_ID = ? ORDER BY allergy_ID', [patient.patient_ID]),
      db.execute('SELECT surgeryLoc, surgeryName, surgeryDate FROM surgery WHERE fk_patient_ID = ? ORDER BY surgeryDate DESC', [patient.patient_ID])
    ]);

    res.json({ profile: { patient, doctor: doctor[0] || null, conditions, allergies, surgeries } });
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
    } else {
      const [ins] = await conn.execute(
        `INSERT INTO patient (patientName, patientBday, patientSex, patientRel, patientMarStat, patientOccup,
                patientPNum, patientBType, patientHeight, patientWeight, fk_doctor_ID, fk_user_ID)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [...fields, req.session.userId]);
      patientId = ins.insertId;
    }

    if (data.conditions.length) {
      await conn.query('INSERT INTO medical_condition (fk_patient_ID, conditionName, conditionDiagnosis, conditionMed) VALUES ?',
        [data.conditions.map((c) => [patientId, c.name, c.date, c.med])]);
    }
    if (data.allergies.length) {
      await conn.query('INSERT INTO allergy (fk_patient_ID, allergenName, allergenMed) VALUES ?',
        [data.allergies.map((a) => [patientId, a.name, a.med])]);
    }
    if (data.surgeries.length) {
      await conn.query('INSERT INTO surgery (fk_patient_ID, surgeryLoc, surgeryName, surgeryDate) VALUES ?',
        [data.surgeries.map((s) => [patientId, s.loc, s.name, s.date])]);
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

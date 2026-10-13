const express = require('express');
const crypto = require('crypto');
const db = require('../config/db');
const { requireLogin } = require('../middleware/auth');
const router = express.Router();
const hash = token => crypto.createHash('sha256').update(token).digest('hex');

async function getProfile(userId) {
  const [rows] = await db.execute('SELECT * FROM v_patient WHERE fk_user_ID=?', [userId]);
  if (!rows.length) return null;
  const patient = rows[0];
  const [[doctor], [conditions], [allergies], [surgeries], [hospRows], [vaccinations]] = await Promise.all([
    patient.fk_doctor_ID ? db.execute('SELECT doctorPDoc,doctorPNum,doctorPEmail FROM doctor WHERE doctor_ID=?',[patient.fk_doctor_ID]) : Promise.resolve([[]]),
    db.execute('SELECT condition_ID,conditionName,conditionDiagnosis,conditionMed,conditionStatus FROM medical_condition WHERE fk_patient_ID=?',[patient.patient_ID]),
    db.execute('SELECT allergenName,allergenMed,allergenSeverity,allergenReaction FROM allergy WHERE fk_patient_ID=?',[patient.patient_ID]),
    db.execute('SELECT surgeryName,surgeryLoc,surgeryDate,surgeryHospital,surgerySurgeon,surgeryNotes FROM surgery WHERE fk_patient_ID=?',[patient.patient_ID]),
    db.execute('SELECT h.*, c.condition_ID AS relatedConditionId,c.conditionName AS relatedConditionName FROM hospitalization h LEFT JOIN hospitalization_condition hc ON hc.fk_hospitalization_ID=h.hospitalization_ID LEFT JOIN medical_condition c ON c.condition_ID=hc.fk_condition_ID WHERE h.fk_patient_ID=?',[patient.patient_ID]),
    db.execute('SELECT vaccineName,doseLabel,vaccinationDate,nextDoseDate,facility,notes FROM vaccination WHERE fk_patient_ID=? ORDER BY vaccinationDate DESC',[patient.patient_ID])
  ]);
  const hm = new Map(); for (const h of hospRows) { if (!hm.has(h.hospitalization_ID)) hm.set(h.hospitalization_ID,{hospital:h.hospital,admissionDate:h.admissionDate,dischargeDate:h.dischargeDate,reason:h.reason,diagnosis:h.diagnosis,treatment:h.treatment,relatedConditions:[]}); if(h.relatedConditionId) hm.get(h.hospitalization_ID).relatedConditions.push(h.relatedConditionName); }
  return { patient, doctor:doctor[0]||null, conditions, allergies, surgeries, hospitalizations:[...hm.values()], vaccinations };
}
// Public read-only endpoint: token is random, hashed at rest, expiring, and revocable.
router.get('/public/:token', async (req,res,next)=>{
  try {
    const token=String(req.params.token||''); if(!/^[a-f0-9]{64}$/.test(token)) return res.status(404).json({error:'This share link is invalid, expired, or revoked.'});
    const [rows]=await db.execute('SELECT record_snapshot FROM medical_record_share WHERE token_hash=? AND revoked_at IS NULL AND expires_at>UTC_TIMESTAMP() LIMIT 1',[hash(token)]);
    if(!rows.length) return res.status(404).json({error:'This share link is invalid, expired, or revoked.'});
    const snapshot=typeof rows[0].record_snapshot==='string'?JSON.parse(rows[0].record_snapshot):rows[0].record_snapshot;
    res.set('Cache-Control','no-store'); res.json({profile:snapshot});
  } catch(err){next(err);}
});
router.post('/', requireLogin, async (req,res,next)=>{
  try {
    const hours=Number(req.body?.expiresInHours||24); if(!Number.isInteger(hours)||hours<1||hours>168) return res.status(400).json({error:'Share duration must be from 1 to 168 hours.'});
    const profile=await getProfile(req.session.userId); if(!profile) return res.status(404).json({error:'Create your medical record before sharing it.'});
    const token=crypto.randomBytes(32).toString('hex');
    const [inserted]=await db.execute('INSERT INTO medical_record_share (fk_patient_ID,token_hash,record_snapshot,expires_at) VALUES (?,?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? HOUR))',[profile.patient.patient_ID,hash(token),JSON.stringify(profile),hours]);
    res.status(201).json({shareId:inserted.insertId,url:`${req.protocol}://${req.get('host')}/shared/${token}`,expiresInHours:hours});
  }catch(err){next(err);}
});
router.get('/', requireLogin, async (req,res,next)=>{
  try { const [rows]=await db.execute('SELECT s.share_ID,s.created_at,s.expires_at,s.revoked_at FROM medical_record_share s JOIN patient p ON p.patient_ID=s.fk_patient_ID WHERE p.fk_user_ID=? ORDER BY s.created_at DESC',[req.session.userId]); res.json({shares:rows}); } catch(err){next(err);}
});
router.delete('/:id', requireLogin, async (req,res,next)=>{
  try { const [r]=await db.execute('UPDATE medical_record_share s JOIN patient p ON p.patient_ID=s.fk_patient_ID SET s.revoked_at=UTC_TIMESTAMP() WHERE s.share_ID=? AND p.fk_user_ID=? AND s.revoked_at IS NULL',[req.params.id,req.session.userId]); if(!r.affectedRows) return res.status(404).json({error:'Share link not found or already revoked.'}); res.json({ok:true}); } catch(err){next(err);}
});
module.exports=router;

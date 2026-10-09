-- MEDIVAULT practice queries (cleaned up from SqlFinal.sql)
-- Run after loading sample data:  mysql -u root -p medivault < db/queries.sql
-- Changes from the original: comma joins became JOIN ... ON, age comes from the
-- v_patient view, and queries 8 to 10 no longer double count rows.

-- ===== SIMPLE =====

-- 1. Female patients with an unknown blood type
SELECT patientName, patientBType
FROM v_patient
WHERE patientSex = 'F' AND patientBType = 'Unknown';

-- 2. Married Christian patients
SELECT patientName, patientMarStat, patientRel
FROM v_patient
WHERE patientMarStat = 'married' AND patientRel = 'Christian';

-- 3. Male patients born between 1990 and 2013
SELECT patientName, patientBday
FROM v_patient
WHERE patientSex = 'M' AND patientBday BETWEEN '1990-01-01' AND '2013-12-31';

-- ===== MODERATE =====

-- 4. Married patients who are at least 150 cm tall or 80 kg, counted by sex
SELECT patientSex, COUNT(*) AS patientCNT
FROM v_patient
WHERE patientMarStat = 'married' AND (patientHeight >= 150 OR patientWeight >= 80)
GROUP BY patientSex;

-- 5. Patients with a Yahoo email, counted by sex
SELECT patientSex, COUNT(*) AS emailCNT
FROM v_patient
WHERE patientEmail LIKE '%@yahoo.com'
GROUP BY patientSex;

-- 6. Average weight of adults per religion, only groups above 70 kg
SELECT patientRel, ROUND(AVG(patientWeight), 1) AS weightAVG
FROM v_patient
WHERE patientAge > 18
GROUP BY patientRel
HAVING weightAVG > 70
ORDER BY weightAVG DESC;

-- ===== DIFFICULT =====

-- 7. Number of patients over 30 for each doctor
SELECT d.doctorPDoc, COUNT(*) AS patientCNT
FROM v_patient AS p
JOIN doctor    AS d ON d.doctor_ID = p.fk_doctor_ID
WHERE p.patientAge > 30
GROUP BY d.doctorPDoc;

-- 8. Patients on insulin or antibiotics who also had one of three surgeries
SELECT DISTINCT p.patientName, p.patientSex, p.patientAge, d.doctorPDoc,
       s.surgeryLoc, s.surgeryName, c.conditionMed
FROM v_patient         AS p
JOIN doctor            AS d ON d.doctor_ID    = p.fk_doctor_ID
JOIN medical_condition AS c ON c.fk_patient_ID = p.patient_ID
JOIN surgery           AS s ON s.fk_patient_ID = p.patient_ID
WHERE c.conditionMed IN ('Insulin', 'Antibiotics')
  AND s.surgeryName  IN ('Lobectomy', 'Open Heart Surgery', 'Appendectomy');

-- 9. Average weight per doctor, only patients with at least one condition.
--    EXISTS counts each patient once, even with many conditions.
SELECT d.doctorPDoc, ROUND(AVG(p.patientWeight), 1) AS weightAVG
FROM patient AS p
JOIN doctor  AS d ON d.doctor_ID = p.fk_doctor_ID
WHERE EXISTS (SELECT 1 FROM medical_condition AS c WHERE c.fk_patient_ID = p.patient_ID)
GROUP BY d.doctorPDoc
HAVING weightAVG > 65;

-- 10. Average age per doctor for patients who have diabetes OR a peanut or mollusk allergy
SELECT d.doctorPDoc, ROUND(AVG(p.patientAge), 1) AS ageAVG
FROM v_patient AS p
JOIN doctor    AS d ON d.doctor_ID = p.fk_doctor_ID
WHERE EXISTS (SELECT 1 FROM medical_condition AS c
              WHERE c.fk_patient_ID = p.patient_ID AND c.conditionName LIKE '%Diabetes%')
   OR EXISTS (SELECT 1 FROM allergy AS a
              WHERE a.fk_patient_ID = p.patient_ID AND a.allergenName IN ('Peanuts', 'Mollusks'))
GROUP BY d.doctorPDoc
HAVING ageAVG > 20;

-- ===== EXTRA =====

-- 11. Patients with no recorded conditions (LEFT JOIN ... IS NULL)
SELECT p.patientName
FROM patient AS p
LEFT JOIN medical_condition AS c ON c.fk_patient_ID = p.patient_ID
WHERE c.condition_ID IS NULL;

-- 12. Full history of one patient (change the id)
SELECT p.patientName, 'condition' AS type, c.conditionName AS detail, c.conditionDiagnosis AS date_on
FROM patient AS p JOIN medical_condition AS c ON c.fk_patient_ID = p.patient_ID WHERE p.patient_ID = 1
UNION ALL
SELECT p.patientName, 'allergy', a.allergenName, NULL
FROM patient AS p JOIN allergy AS a ON a.fk_patient_ID = p.patient_ID WHERE p.patient_ID = 1
UNION ALL
SELECT p.patientName, 'surgery', s.surgeryName, s.surgeryDate
FROM patient AS p JOIN surgery AS s ON s.fk_patient_ID = p.patient_ID WHERE p.patient_ID = 1;

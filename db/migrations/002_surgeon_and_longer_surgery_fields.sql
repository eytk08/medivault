-- Migration 002: adds the surgeon field and lengthens hospital and notes.
-- Run this ONCE on a database created before this change (after 001, if that was needed too):
--   mysql -u root -p medivault < db/migrations/002_surgeon_and_longer_surgery_fields.sql
-- New databases get these columns from schema.sql and do not need this file.

ALTER TABLE surgery
  MODIFY COLUMN surgeryHospital VARCHAR(100) DEFAULT NULL,
  ADD COLUMN surgerySurgeon VARCHAR(80) DEFAULT NULL AFTER surgeryHospital,
  MODIFY COLUMN surgeryNotes VARCHAR(500) DEFAULT NULL;

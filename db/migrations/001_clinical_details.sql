-- Migration 001: clinical details used by the React interface.
-- Run this ONCE on a database that was created before this change:
--   mysql -u root -p medivault < db/migrations/001_clinical_details.sql
-- New databases get these columns from schema.sql and do not need this file.

ALTER TABLE medical_condition
  ADD COLUMN conditionStatus ENUM('active','managed','resolved') NOT NULL DEFAULT 'active' AFTER conditionMed;

ALTER TABLE allergy
  ADD COLUMN allergenSeverity ENUM('mild','moderate','severe') NOT NULL DEFAULT 'mild' AFTER allergenMed,
  ADD COLUMN allergenReaction VARCHAR(120) DEFAULT NULL AFTER allergenSeverity;

ALTER TABLE surgery
  ADD COLUMN surgeryHospital VARCHAR(80)  DEFAULT NULL COMMENT 'hospital or surgeon' AFTER surgeryDate,
  ADD COLUMN surgeryNotes    VARCHAR(255) DEFAULT NULL AFTER surgeryHospital;

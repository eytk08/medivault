CREATE TABLE IF NOT EXISTS vaccination (
  vaccination_ID INT NOT NULL AUTO_INCREMENT,
  fk_patient_ID INT NOT NULL,
  vaccineName VARCHAR(80) NOT NULL,
  doseLabel VARCHAR(30) DEFAULT NULL,
  vaccinationDate DATE DEFAULT NULL,
  nextDoseDate DATE DEFAULT NULL,
  facility VARCHAR(100) DEFAULT NULL,
  notes VARCHAR(300) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (vaccination_ID), KEY idx_vaccination_patient (fk_patient_ID),
  CONSTRAINT fk_vaccination_patient FOREIGN KEY (fk_patient_ID) REFERENCES patient(patient_ID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

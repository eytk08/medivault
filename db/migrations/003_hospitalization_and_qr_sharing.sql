ALTER TABLE patient MODIFY patientRel VARCHAR(60) NOT NULL;
CREATE TABLE IF NOT EXISTS hospitalization (
  hospitalization_ID INT NOT NULL AUTO_INCREMENT,
  fk_patient_ID INT NOT NULL,
  hospital VARCHAR(120) NOT NULL,
  admissionDate DATE NOT NULL,
  dischargeDate DATE DEFAULT NULL,
  reason VARCHAR(500) DEFAULT NULL,
  diagnosis VARCHAR(500) DEFAULT NULL,
  treatment TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (hospitalization_ID), KEY idx_hospitalization_patient (fk_patient_ID),
  CONSTRAINT fk_hospitalization_patient FOREIGN KEY (fk_patient_ID) REFERENCES patient(patient_ID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS hospitalization_condition (
  fk_hospitalization_ID INT NOT NULL,
  fk_condition_ID INT NOT NULL,
  PRIMARY KEY (fk_hospitalization_ID, fk_condition_ID),
  CONSTRAINT fk_hosp_condition_hospitalization FOREIGN KEY (fk_hospitalization_ID) REFERENCES hospitalization(hospitalization_ID) ON DELETE CASCADE,
  CONSTRAINT fk_hosp_condition_condition FOREIGN KEY (fk_condition_ID) REFERENCES medical_condition(condition_ID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS medical_record_share (
  share_ID BIGINT NOT NULL AUTO_INCREMENT,
  fk_patient_ID INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  record_snapshot JSON NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (share_ID), UNIQUE KEY uq_share_token_hash(token_hash), KEY idx_share_patient(fk_patient_ID), KEY idx_share_expiry(expires_at),
  CONSTRAINT fk_share_patient FOREIGN KEY (fk_patient_ID) REFERENCES patient(patient_ID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

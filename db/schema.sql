-- MEDIVAULT schema (MySQL 8 or MariaDB 10.5+)
-- Running this file resets the tables. Use scripts/init-db.js (npm run db:init) to run it.

DROP VIEW  IF EXISTS v_patient;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS surgery;
DROP TABLE IF EXISTS allergy;
DROP TABLE IF EXISTS medical_condition;
DROP TABLE IF EXISTS patient;
DROP TABLE IF EXISTS doctor;
DROP TABLE IF EXISTS users;

-- Login accounts. Passwords are stored as bcrypt hashes, never as plain text.
CREATE TABLE users (
  user_ID       INT          NOT NULL AUTO_INCREMENT,
  email         VARCHAR(100) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_ID),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Primary care physician. One doctor can have many patients.
CREATE TABLE doctor (
  doctor_ID    INT          NOT NULL AUTO_INCREMENT,
  doctorPDoc   VARCHAR(60)  NOT NULL,
  doctorPNum   VARCHAR(20)  DEFAULT NULL,
  doctorPEmail VARCHAR(100) NOT NULL,
  PRIMARY KEY (doctor_ID),
  UNIQUE KEY uq_doctor_email (doctorPEmail)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One patient record per user account.
-- Age is not stored. It is calculated in the v_patient view so it never goes stale.
CREATE TABLE patient (
  patient_ID     INT           NOT NULL AUTO_INCREMENT,
  fk_user_ID     INT           NOT NULL,
  fk_doctor_ID   INT           DEFAULT NULL,
  patientName    VARCHAR(60)   NOT NULL,
  patientBday    DATE          NOT NULL,
  patientSex     ENUM('M','F') NOT NULL,
  patientRel     VARCHAR(30)   NOT NULL,
  patientMarStat ENUM('single','married','separated','divorced','widowed') NOT NULL,
  patientOccup   VARCHAR(40)   NOT NULL,
  patientPNum    VARCHAR(20)   NOT NULL,
  patientBType   ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown') NOT NULL DEFAULT 'Unknown',
  patientHeight  DECIMAL(5,2)  NOT NULL COMMENT 'centimeters',
  patientWeight  DECIMAL(5,2)  NOT NULL COMMENT 'kilograms',
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (patient_ID),
  UNIQUE KEY uq_patient_user (fk_user_ID),
  UNIQUE KEY uq_patient_phone (patientPNum),
  KEY idx_patient_doctor (fk_doctor_ID),
  KEY idx_patient_bday (patientBday),
  CONSTRAINT fk_patient_user   FOREIGN KEY (fk_user_ID)   REFERENCES users (user_ID)   ON DELETE CASCADE,
  CONSTRAINT fk_patient_doctor FOREIGN KEY (fk_doctor_ID) REFERENCES doctor (doctor_ID) ON DELETE SET NULL,
  CONSTRAINT chk_patient_height CHECK (patientHeight BETWEEN 30 AND 272),
  CONSTRAINT chk_patient_weight CHECK (patientWeight BETWEEN 1 AND 500)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- "condition" is a reserved word in MySQL, so the table is named medical_condition.
CREATE TABLE medical_condition (
  condition_ID        INT          NOT NULL AUTO_INCREMENT,
  fk_patient_ID       INT          NOT NULL,
  conditionName       VARCHAR(50)  NOT NULL,
  conditionDiagnosis  DATE         DEFAULT NULL,
  conditionMed        VARCHAR(60)  DEFAULT NULL,
  PRIMARY KEY (condition_ID),
  KEY idx_condition_patient (fk_patient_ID),
  KEY idx_condition_name (conditionName),
  CONSTRAINT fk_condition_patient FOREIGN KEY (fk_patient_ID) REFERENCES patient (patient_ID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE allergy (
  allergy_ID    INT         NOT NULL AUTO_INCREMENT,
  fk_patient_ID INT         NOT NULL,
  allergenName  VARCHAR(40) NOT NULL,
  allergenMed   VARCHAR(60) DEFAULT NULL,
  PRIMARY KEY (allergy_ID),
  KEY idx_allergy_patient (fk_patient_ID),
  KEY idx_allergy_name (allergenName),
  CONSTRAINT fk_allergy_patient FOREIGN KEY (fk_patient_ID) REFERENCES patient (patient_ID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE surgery (
  surgery_ID    INT         NOT NULL AUTO_INCREMENT,
  fk_patient_ID INT         NOT NULL,
  surgeryLoc    VARCHAR(40) DEFAULT NULL COMMENT 'body area',
  surgeryName   VARCHAR(50) NOT NULL     COMMENT 'procedure name',
  surgeryDate   DATE        DEFAULT NULL,
  PRIMARY KEY (surgery_ID),
  KEY idx_surgery_patient (fk_patient_ID),
  CONSTRAINT fk_surgery_patient FOREIGN KEY (fk_patient_ID) REFERENCES patient (patient_ID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Patient with calculated age and the login email.
CREATE VIEW v_patient AS
SELECT p.*,
       TIMESTAMPDIFF(YEAR, p.patientBday, CURDATE()) AS patientAge,
       u.email AS patientEmail
FROM patient AS p
JOIN users   AS u ON u.user_ID = p.fk_user_ID;

-- Login sessions (used by config/sessionStore.js). Expiry is in milliseconds since 1970.
CREATE TABLE sessions (
  sid     VARCHAR(128) NOT NULL,
  data    TEXT         NOT NULL,
  expires BIGINT       NOT NULL,
  PRIMARY KEY (sid),
  KEY idx_sessions_expires (expires)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

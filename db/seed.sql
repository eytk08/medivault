-- Sample data. Every name, email, and phone number below is fake.
-- All sample accounts share the password  Demo@1234  (stored as a bcrypt hash).

INSERT INTO users (user_ID, email, password_hash) VALUES
(1,  'demo@medivault.test',  '$2b$10$YCJtC0XDidYaY09G7Bg96.5yIDdG91K2NQze6fcfX627QKHTHoLtW'),
(2,  'pt02@example.com',     '$2b$10$YCJtC0XDidYaY09G7Bg96.5yIDdG91K2NQze6fcfX627QKHTHoLtW'),
(3,  'pt03@example.com',     '$2b$10$YCJtC0XDidYaY09G7Bg96.5yIDdG91K2NQze6fcfX627QKHTHoLtW'),
(4,  'sample.pt04@yahoo.com','$2b$10$YCJtC0XDidYaY09G7Bg96.5yIDdG91K2NQze6fcfX627QKHTHoLtW'),
(5,  'pt05@example.com',     '$2b$10$YCJtC0XDidYaY09G7Bg96.5yIDdG91K2NQze6fcfX627QKHTHoLtW'),
(6,  'pt06@example.com',     '$2b$10$YCJtC0XDidYaY09G7Bg96.5yIDdG91K2NQze6fcfX627QKHTHoLtW'),
(7,  'sample.pt07@yahoo.com','$2b$10$YCJtC0XDidYaY09G7Bg96.5yIDdG91K2NQze6fcfX627QKHTHoLtW'),
(8,  'pt08@example.com',     '$2b$10$YCJtC0XDidYaY09G7Bg96.5yIDdG91K2NQze6fcfX627QKHTHoLtW'),
(9,  'sample.pt09@yahoo.com','$2b$10$YCJtC0XDidYaY09G7Bg96.5yIDdG91K2NQze6fcfX627QKHTHoLtW'),
(10, 'pt10@example.com',     '$2b$10$YCJtC0XDidYaY09G7Bg96.5yIDdG91K2NQze6fcfX627QKHTHoLtW');

INSERT INTO doctor (doctor_ID, doctorPDoc, doctorPNum, doctorPEmail) VALUES
(1, 'Dr. Maria Santos', '09180000001', 'dr.santos@example.com'),
(2, 'Dr. Jose Reyes',   '09180000002', 'dr.reyes@example.com'),
(3, 'Dr. Ana Cruz',     '09180000003', 'dr.cruz@example.com');

INSERT INTO patient
(patient_ID, fk_user_ID, fk_doctor_ID, patientName, patientBday, patientSex, patientRel, patientMarStat, patientOccup, patientPNum, patientBType, patientHeight, patientWeight) VALUES
(1,  1,  1,    'Demo Patient',     '1995-04-12', 'F', 'Christian', 'single',  'Student',   '09170000001', 'O+',      160, 52.5),
(2,  2,  1,    'Juan Dela Cruz',   '1980-09-03', 'M', 'Christian', 'married', 'Teacher',   '09170000002', 'A+',      172, 82),
(3,  3,  2,    'Maria Lopez',      '1975-01-21', 'F', 'Christian', 'married', 'Nurse',     '09170000003', 'B+',      158, 68),
(4,  4,  2,    'Pedro Ramos',      '1992-06-30', 'M', 'Muslim',    'married', 'Driver',    '09170000004', 'O-',      168, 90),
(5,  5,  3,    'Ana Villanueva',   '2001-11-15', 'F', 'Buddhist',  'single',  'Designer',  '09170000005', 'Unknown', 162, 49),
(6,  6,  3,    'Luis Garcia',      '1968-03-09', 'M', 'Christian', 'married', 'Engineer',  '09170000006', 'AB+',     175, 85),
(7,  7,  1,    'Carla Mendoza',    '1999-12-02', 'F', 'Christian', 'single',  'Cashier',   '09170000007', 'Unknown', 155, 54),
(8,  8,  2,    'Rico Aquino',      '1988-08-18', 'M', 'Christian', 'married', 'Chef',      '09170000008', 'B-',      170, 78),
(9,  9,  3,    'Liza Bautista',    '1958-05-25', 'F', 'Christian', 'widowed', 'Retired',   '09170000009', 'O+',      150, 72),
(10, 10, NULL, 'Noel Torres',      '2005-02-14', 'M', 'Muslim',    'single',  'Student',   '09170000010', 'A+',      168, 60);

INSERT INTO medical_condition (fk_patient_ID, conditionName, conditionDiagnosis, conditionMed) VALUES
(1, 'Asthma',              '2022-01-23', 'Albuterol'),
(2, 'Type 2 Diabetes',     '2018-05-10', 'Metformin'),
(2, 'Hypertension',        '2020-02-02', 'Amlodipine'),
(3, 'Type 1 Diabetes',     '2005-07-19', 'Insulin'),
(4, 'Bacterial Infection', '2024-03-01', 'Antibiotics'),
(6, 'Bacterial Infection', '2024-01-15', 'Antibiotics'),
(8, 'Type 1 Diabetes',     '2010-10-05', 'Insulin'),
(9, 'Hypertension',        '2012-06-18', 'Amlodipine');

INSERT INTO allergy (fk_patient_ID, allergenName, allergenMed) VALUES
(1, 'Gluten',     'Antihistamine'),
(1, 'Pollen',     'Nasal Spray'),
(5, 'Peanuts',    'Epinephrine'),
(7, 'Mollusks',   'Antihistamine'),
(8, 'Peanuts',    'Epinephrine'),
(9, 'Penicillin', NULL);

INSERT INTO surgery (fk_patient_ID, surgeryLoc, surgeryName, surgeryDate) VALUES
(1, 'Abdomen', 'Appendectomy',       '2019-05-14'),
(1, 'Knee',    'Arthroscopy',        '2023-05-15'),
(3, 'Abdomen', 'Appendectomy',       '2012-03-04'),
(4, 'Abdomen', 'Appendectomy',       '2020-07-07'),
(6, 'Heart',   'Open Heart Surgery', '2023-12-20'),
(9, 'Lung',    'Lobectomy',          '2021-11-10');

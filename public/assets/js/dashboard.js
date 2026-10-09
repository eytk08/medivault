// Dashboard: loads the logged in patient's record and fills the page.
document.addEventListener('DOMContentLoaded', async () => {
  const $ = (id) => document.getElementById(id);
  const alertBox = $('dashAlert');

  $('editBtn').addEventListener('click', () => { window.location.href = 'form.html'; });

  const { ok, status, data } = await api('/api/patient');
  $('loading').classList.add('d-none');

  if (status === 401) { window.location.href = 'home.html#Login'; return; }
  if (!ok) { showAlert(alertBox, data.error || 'Could not load your record.'); return; }
  if (!data.profile) { window.location.href = 'form.html'; return; } // no record yet

  const { patient, doctor, conditions, allergies, surgeries } = data.profile;

  $('greetName').textContent = patient.patientName.split(' ')[0].toUpperCase();
  $('patientId').textContent = String(patient.patient_ID).padStart(6, '0');
  $('bloodType').textContent = patient.patientBType === 'Unknown' ? 'N/A' : patient.patientBType;
  $('height').textContent = `${patient.patientHeight} cm`;
  $('weight').textContent = `${patient.patientWeight} kg`;
  $('doctorName').textContent = doctor ? doctor.doctorPDoc : 'Not added';
  $('doctorPhone').textContent = doctor && doctor.doctorPNum ? doctor.doctorPNum : '';
  $('doctorEmail').textContent = doctor ? doctor.doctorPEmail : '';

  // textContent is used everywhere, so stored text can never run as HTML.
  function fillTable(body, rows, columns) {
    body.replaceChildren();
    if (!rows.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = columns.length;
      td.textContent = 'No records yet';
      tr.append(td);
      body.append(tr);
      return;
    }
    rows.forEach((row) => {
      const tr = document.createElement('tr');
      columns.forEach((key) => {
        const td = document.createElement('td');
        td.textContent = row[key] || '-';
        tr.append(td);
      });
      body.append(tr);
    });
  }

  fillTable($('conditionsBody'), conditions, ['conditionName', 'conditionDiagnosis', 'conditionMed']);
  fillTable($('allergiesBody'), allergies, ['allergenName', 'allergenMed']);
  fillTable($('surgeriesBody'), surgeries, ['surgeryName', 'surgeryLoc', 'surgeryDate']);

  $('dashContent').classList.remove('d-none');
});

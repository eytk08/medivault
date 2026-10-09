// Settings: edit personal info, edit account info, delete account.
document.addEventListener('DOMContentLoaded', async () => {
  const $ = (id) => document.getElementById(id);
  const alertBox = $('settingsAlert');
  const deleteModal = new bootstrap.Modal($('deleteModal'));

  const personalIds = ['nameInput', 'birthdayInput', 'sexInput', 'religionInput', 'maritalStatusInput'];
  const accountIds = ['emailInput', 'phoneInput'];
  let saved = {}; // last values from the server, used by Cancel

  const setDisabled = (ids, disabled) => ids.forEach((id) => { $(id).disabled = disabled; });

  // ---------- Load current values ----------
  async function load() {
    const [me, rec] = await Promise.all([api('/api/auth/me'), api('/api/patient')]);
    if (me.status === 401) { window.location.href = 'home.html#Login'; return; }
    const profile = rec.ok ? rec.data.profile : null;
    saved = {
      emailInput: me.data.email,
      phoneInput: profile ? profile.patient.patientPNum : '',
      nameInput: profile ? profile.patient.patientName : '',
      birthdayInput: profile ? profile.patient.patientBday : '',
      sexInput: profile ? profile.patient.patientSex : 'M',
      religionInput: profile ? profile.patient.patientRel : '',
      maritalStatusInput: profile ? profile.patient.patientMarStat : 'single'
    };
    Object.entries(saved).forEach(([id, value]) => { $(id).value = value; });
    if (!profile) {
      showAlert(alertBox, 'Fill out the medical history form first to edit your personal information.', 'info');
      $('personalEdit').disabled = true;
      $('phoneInput').placeholder = 'Add after your first form';
    }
  }

  // ---------- Personal information ----------
  function endPersonalEdit() {
    setDisabled(personalIds, true);
    $('personalEdit').textContent = 'Edit';
    $('personalCancel').classList.add('d-none');
  }

  $('personalEdit').addEventListener('click', async () => {
    const editing = $('personalEdit').textContent === 'Save';
    if (!editing) {
      hideAlert(alertBox);
      setDisabled(personalIds, false);
      $('personalEdit').textContent = 'Save';
      $('personalCancel').classList.remove('d-none');
      return;
    }
    const { ok, data } = await api('/api/patient/personal', 'PUT', {
      patientName: $('nameInput').value,
      patientBday: $('birthdayInput').value,
      patientSex: $('sexInput').value,
      patientRel: $('religionInput').value,
      patientMarStat: $('maritalStatusInput').value
    });
    if (ok) {
      personalIds.forEach((id) => { saved[id] = $(id).value; });
      endPersonalEdit();
      showAlert(alertBox, 'Personal information saved.', 'success');
    } else {
      showAlert(alertBox, data.error || 'Could not save.');
    }
  });

  $('personalCancel').addEventListener('click', () => {
    personalIds.forEach((id) => { $(id).value = saved[id]; });
    endPersonalEdit();
    hideAlert(alertBox);
  });

  // ---------- Account information ----------
  function endAccountEdit() {
    setDisabled(accountIds, true);
    $('passwordFields').classList.add('d-none');
    $('newPasswordFields').classList.add('d-none');
    $('passwordInput').value = '';
    $('newPasswordInput').value = '';
    $('accountEdit').textContent = 'Edit';
    $('accountCancel').classList.add('d-none');
  }

  $('accountEdit').addEventListener('click', async () => {
    const editing = $('accountEdit').textContent === 'Save';
    if (!editing) {
      hideAlert(alertBox);
      setDisabled(accountIds, false);
      $('passwordFields').classList.remove('d-none');
      $('newPasswordFields').classList.remove('d-none');
      $('accountEdit').textContent = 'Save';
      $('accountCancel').classList.remove('d-none');
      return;
    }
    const { ok, data } = await api('/api/account', 'PUT', {
      email: $('emailInput').value,
      phone: $('phoneInput').value,
      currentPassword: $('passwordInput').value,
      newPassword: $('newPasswordInput').value
    });
    if (ok) {
      accountIds.forEach((id) => { saved[id] = $(id).value; });
      endAccountEdit();
      showAlert(alertBox, 'Account information saved.', 'success');
    } else {
      showAlert(alertBox, data.error || 'Could not save.');
    }
  });

  $('accountCancel').addEventListener('click', () => {
    accountIds.forEach((id) => { $(id).value = saved[id]; });
    endAccountEdit();
    hideAlert(alertBox);
  });

  // ---------- Delete account ----------
  const deleteAlert = $('deleteAlert');
  $('deleteOpen').addEventListener('click', () => {
    hideAlert(deleteAlert);
    $('deletePassword').value = '';
    deleteModal.show();
  });

  $('deleteConfirm').addEventListener('click', async () => {
    const { ok, data } = await api('/api/account', 'DELETE', { password: $('deletePassword').value });
    if (ok) {
      window.location.href = 'home.html';
    } else {
      showAlert(deleteAlert, data.error || 'Could not delete the account.');
    }
  });

  load();
});

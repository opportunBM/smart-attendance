// Affichage du profil professeur dans la sidebar et les paramètres
function initializeProfessorProfile() {
    const fullName = `${currentUser.prenom || ''} ${currentUser.postnom || ''} ${currentUser.nom || ''}`.trim().toUpperCase();
    const matricule = currentUser.matricule || '---';
    const faculte = currentUser.faculte || 'Non spécifié';

    const profNameEl = document.getElementById('prof-name');
    const profMatriculeEl = document.getElementById('prof-matricule');
    const profMatriculeInput = document.getElementById('prof-matricule-input');
    if (profNameEl) profNameEl.innerText = fullName;
    if (profMatriculeEl) profMatriculeEl.innerText = `Matricule : ${matricule}`;
    if (profMatriculeInput) profMatriculeInput.value = matricule;

    const profileFullnameEl = document.getElementById('profile-fullname');
    const profileEmailEl = document.getElementById('profile-email');
    const profileMatriculeEtud = document.getElementById('prof-matricule-input');
    const profileFacultyEl = document.getElementById('profile-faculty');
    if (profileFullnameEl) profileFullnameEl.value = fullName;
    if (profileEmailEl) profileEmailEl.value = currentUser.email || '';
    if (profileMatriculeEtud) profileMatriculeEtud.value = matricule;
    if (profileFacultyEl) profileFacultyEl.value = faculte;

    const avatarHtml = buildAvatarHtml(currentUser);
    const profilePicContainer = document.getElementById('profile-pic-container');
    const settingsPicContainer = document.getElementById('settings-pic-container');
    if (profilePicContainer) profilePicContainer.innerHTML = avatarHtml;
    if (settingsPicContainer) settingsPicContainer.innerHTML = avatarHtml;
}

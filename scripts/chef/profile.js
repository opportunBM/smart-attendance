// Affichage du profil du chef de département dans la sidebar et les paramètres
function initializeChefProfile() {
    const fullNameChef = `${currentUser.prenom || ''} ${currentUser.postnom || ''} ${currentUser.nom || ''}`.trim().toUpperCase();

    document.getElementById('chef-name').innerText = fullNameChef;
    document.getElementById('chef-faculte').innerText = `Département : ${currentUser.faculte || 'Non spécifié'}`;
    document.getElementById('chef-matricule').innerText = `Matricule : ${currentUser.matricule || '---'}`;

    document.getElementById('profile-fullname').value = fullNameChef;
    document.getElementById('chef-matricule-input').value = currentUser.matricule || '---';
    document.getElementById('chef-faculty-input').value = currentUser.faculte || '---';
    document.getElementById('profile-email').value = currentUser.email || '';

    const avatarHtml = buildAvatarHtml(currentUser);
    const profilePicContainer = document.getElementById('profile-pic-container');
    const settingsPicContainer = document.getElementById('settings-pic-container');
    if (profilePicContainer) profilePicContainer.innerHTML = avatarHtml;
    if (settingsPicContainer) settingsPicContainer.innerHTML = avatarHtml;
}

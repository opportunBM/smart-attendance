// Affichage du profil étudiant dans l'en-tête et les paramètres
async function initializeStudentProfile() {
    const fullNameStudent = `${currentUser.prenom || ''} ${currentUser.postnom || ''} ${currentUser.nom || ''}`.trim().toUpperCase();
    document.getElementById('student-name').innerText = fullNameStudent;
    document.getElementById('student-faculte').innerText = `Département : ${currentUser.faculte || 'Non spécifié'}`;
    document.getElementById('student-matricule').innerText = `Matricule : ${currentUser.matricule || '---'}`;

    document.getElementById('profile-fullname').value = fullNameStudent;
    document.getElementById('student-matricule-input').value = currentUser.matricule || '---';
    document.getElementById('student-faculty-input').value = currentUser.faculte || '---';
    document.getElementById('profile-email').value = currentUser.email || '';

    let className = currentUser.annee_etude || currentUser.classe || '';
    let cardCode = currentUser.card_code || '';
    let classId = currentUser.classe_id;
    try {
        if (currentUser.id) {
            const { data: student, error: studentError } = await _supabase
                .from('utilisateurs')
                .select('card_code, classe_id, annee_etude')
                .eq('id', currentUser.id)
                .maybeSingle();
            if (studentError) throw studentError;

            if (student) {
                cardCode = student.card_code || cardCode;
                classId = student.classe_id || classId;
                className = student.annee_etude || className;
            }
        }

        if (classId) {
            const { data: studentClass, error: classError } = await _supabase
                .from('classes')
                .select('nom')
                .eq('id', classId)
                .maybeSingle();
            if (classError) throw classError;
            className = studentClass?.nom || className;
        }
    } catch (error) {
        console.error('Erreur de chargement des informations fixes du profil étudiant :', error);
        showNotification('Impossible de charger la classe ou le code de carte.', 'error');
    }

    currentUser.classe = className;
    currentUser.card_code = cardCode;
    const displayedClass = className || 'Non renseignée';
    const displayedCardCode = cardCode || 'Non renseigné';
    document.getElementById('student-class-input').value = displayedClass;
    document.getElementById('student-card-code-input').value = displayedCardCode;
    const summaryClass = document.getElementById('profile-summary-class');
    if (summaryClass) summaryClass.textContent = displayedClass;
    const summaryCardCode = document.getElementById('profile-summary-card-code');
    if (summaryCardCode) summaryCardCode.textContent = displayedCardCode;

    const avatarUrl = currentUser.avatar_url || currentUser.photo_profil;
    const initials = `${currentUser.prenom?.[0] || ''}${currentUser.nom?.[0] || ''}`.toUpperCase();
    const avatarHtml = avatarUrl
        ? `<img src="${avatarUrl}" alt="Avatar" class="w-full h-full object-cover">`
        : `<span class="text-brand font-bold text-lg">${initials}</span>`;

    const profilePicContainer = document.getElementById('profile-pic-container');
    const settingsPicContainer = document.getElementById('settings-pic-container');
    if (profilePicContainer) profilePicContainer.innerHTML = avatarHtml;
    if (settingsPicContainer) settingsPicContainer.innerHTML = avatarHtml;
}
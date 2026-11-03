// Modale pour modifier ou supprimer un cours existant
async function openManageCourseModal(courseId) {
    const modal = document.getElementById('manage-course-modal');
    if (!modal) return;

    const course = allCourses.find(c => c.id == courseId || c.id === courseId);
    if (!course) return;

    document.getElementById('manage-course-name-title').innerText = course.nom_cours;
    document.getElementById('manage-course-code').innerText = course.code_cours || '---';
    document.getElementById('manage-course-faculty').innerText = course.faculte || '---';
    document.getElementById('manage-course-class').innerText = course.classe || '---';
    document.getElementById('manage-course-prof').innerText = course.professeur?.toUpperCase() || course.professeur_email?.toUpperCase() || '---';
    document.getElementById('manage-course-start').innerText = course.date_debut || '---';
    document.getElementById('manage-course-end').innerText = course.date_fin || '---';
    document.getElementById('manage-course-enroll-code').innerText = course.code_enregistrement || '---';

    const nameInput = document.getElementById('manage-course-name-input');
    const saveChangesBtn = document.getElementById('save-course-changes-btn');
    nameInput.value = course.nom_cours || '';
    document.getElementById('manage-course-students-count').innerHTML = loadingMarkup("Vérification...");

    const { data: enrollments, error: enrollmentsError } = await _supabase
        .from('inscriptions')
        .select('etudiant_id')
        .eq('code_cours', course.code_cours);
    if (enrollmentsError) {
        console.error("Erreur chargement inscriptions du cours :", enrollmentsError);
        document.getElementById('manage-course-students-count').innerText = "Indisponible";
        showNotification("Impossible de charger les inscriptions de ce cours.", "error");
    } else {
        document.getElementById('manage-course-students-count').innerText = (enrollments?.length || 0) + " élève(s)";
    }

    const endDateInput = document.getElementById('manage-end-date');
    endDateInput.value = course.date_fin || '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = course.date_debut ? new Date(course.date_debut) : null;
    const endDate = course.date_fin ? new Date(course.date_fin) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(0, 0, 0, 0);

    const courseIsFinished = endDate && endDate < today;
    const manageNotice = document.getElementById('manage-course-notice');

    if (courseIsFinished) {
        nameInput.disabled = true;
        endDateInput.disabled = true;
        nameInput.classList.add('opacity-50', 'cursor-not-allowed');
        endDateInput.classList.add('opacity-50', 'cursor-not-allowed');
        saveChangesBtn.disabled = true;
        saveChangesBtn.classList.add('opacity-50', 'cursor-not-allowed');
        if (manageNotice) manageNotice.innerText = "Ce cours est terminé : son nom et sa date de fin ne peuvent plus être modifiés.";
    } else {
        nameInput.disabled = false;
        endDateInput.disabled = false;
        nameInput.classList.remove('opacity-50', 'cursor-not-allowed');
        endDateInput.classList.remove('opacity-50', 'cursor-not-allowed');
        saveChangesBtn.disabled = true;
        saveChangesBtn.classList.add('opacity-50', 'cursor-not-allowed');
        if (manageNotice) manageNotice.innerText = "Vous pouvez modifier le nom ou la date de fin tant que le cours est actif.";
    }

    const updateSaveButtonState = () => {
        const hasChanges = nameInput.value.trim() !== (course.nom_cours || '').trim() ||
            endDateInput.value !== (course.date_fin || '');
        saveChangesBtn.disabled = courseIsFinished || !hasChanges;
        saveChangesBtn.classList.toggle('opacity-50', saveChangesBtn.disabled);
        saveChangesBtn.classList.toggle('cursor-not-allowed', saveChangesBtn.disabled);
        saveChangesBtn.classList.toggle('cursor-pointer', !saveChangesBtn.disabled);
    };
    nameInput.oninput = updateSaveButtonState;
    endDateInput.oninput = updateSaveButtonState;
    saveChangesBtn.onclick = () => updateCourseChanges(course.id, course.nom_cours || '', course.date_fin || '', nameInput.value, endDateInput.value);

    const deleteContainer = document.getElementById('delete-course-container');
    if (startDate && startDate > today) {
        deleteContainer.innerHTML = `
            <div class="flex items-center justify-between bg-red-500/10 border border-red-500/20 p-3.5 rounded-xl">
                <div>
                    <p class="text-xs font-bold text-red-400">Zone de danger</p>
                    <p class="text-[11px] text-zinc-400">Ce cours n'a pas encore commencé. Vous pouvez l'effacer.</p>
                </div>
                <button type="button" onclick="deleteCourse('${course.id}', '${course.date_debut}')" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer">
                    <i class="fa-solid fa-trash mr-1.5"></i> Effacer le cours
                </button>
            </div>`;
    } else {
        deleteContainer.innerHTML = `<p class="text-xs text-zinc-500 italic">Ce cours a déjà commencé ou est terminé : la suppression n'est plus autorisée.</p>`;
    }

    modal.classList.remove('hidden');
}

async function updateCourseChanges(courseId, originalName, originalEndDate, newName, newEndDate) {
    if (isCourseFinished(courseId)) {
        showNotification("Impossible de modifier un cours qui est déjà terminé.", "error");
        return;
    }

    const trimmedName = newName.trim();
    if (!trimmedName) {
        showNotification("Le nom du cours ne peut pas être vide.", "error");
        return;
    }
    if (!newEndDate) {
        showNotification("Veuillez sélectionner une date de fin valide.", "error");
        return;
    }

    const course = allCourses.find(c => c.id == courseId || c.id === courseId);
    if (course?.date_debut && newEndDate < course.date_debut) {
        showNotification("La date de fin ne peut pas être antérieure à la date de début.", "error");
        return;
    }

    const updateData = {};
    if (trimmedName !== originalName.trim()) updateData.nom_cours = trimmedName;
    if (newEndDate !== originalEndDate) updateData.date_fin = newEndDate;
    if (Object.keys(updateData).length === 0) return;

    try {
        const { error } = await _supabase.from('cours').update(updateData).eq('id', courseId);
        if (error) throw error;
        showNotification("Modifications enregistrées avec succès !");
        loadDepartmentCourses();
        toggleManageCourseModal(false);
    } catch (err) {
        console.error("Erreur mise à jour du cours:", err);
        showNotification("Erreur lors de l'enregistrement des modifications.", "error");
    }
}

function isCourseFinished(courseId) {
    const course = allCourses.find(c => c.id == courseId || c.id === courseId);
    if (!course || !course.date_fin) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(course.date_fin);
    endDate.setHours(0, 0, 0, 0);
    return endDate < today;
}

async function deleteCourse(courseId, startDateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);

    if (startDate <= today) {
        showNotification("Impossible d'effacer un cours qui a déjà commencé.", "error");
        return;
    }
    if (!(await showConfirmDialog("Voulez-vous vraiment effacer ce cours ? Cette action est irréversible.", { title: 'Supprimer le cours' }))) return;

    try {
        const { error } = await _supabase.from('cours').delete().eq('id', courseId);
        if (error) throw error;
        showNotification("Cours effacé avec succès.");
        toggleManageCourseModal(false);
        loadDepartmentCourses();
    } catch (err) {
        console.error("Erreur suppression cours:", err);
        showNotification("Erreur lors de la suppression du cours.", "error");
    }
}

function toggleManageCourseModal(show) {
    const modal = document.getElementById('manage-course-modal');
    if (modal) modal.classList.toggle('hidden', !show);
}

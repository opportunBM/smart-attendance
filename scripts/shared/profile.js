function sanitizeStoredUser(user) {
    if (!user || typeof user !== 'object') return null;

    const validRoles = ['administrateur', 'professeur', 'chef_departement', 'etudiant'];
    if (typeof user.role !== 'string' || !validRoles.includes(user.role)) return null;

    const email = typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';
    if (!email) return null;

    return {
        id: user.id ?? user.user_id ?? null,
        email,
        role: user.role,
        nom: user.nom ?? '',
        prenom: user.prenom ?? '',
        postnom: user.postnom ?? '',
        matricule: user.matricule ?? user.numero_etudiant ?? '',
        numero_etudiant: user.numero_etudiant ?? user.matricule ?? '',
        faculte: user.faculte ?? '',
        departement_id: user.departement_id ?? null,
        classe_id: user.classe_id ?? null,
        annee_etude: user.annee_etude ?? '',
        classe: user.classe ?? '',
        card_code: user.card_code ?? '',
        code_departement: user.code_departement ?? '',
        photo_profil: user.photo_profil ?? user.avatar_url ?? '',
    };
}

// Active le bouton "Enregistrer" seulement quand quelque chose a changé
function initializeProfileSaveControls() {
    const saveButton = document.getElementById('save-profile-btn');
    const emailInput = document.getElementById('profile-email');
    const passwordInput = document.getElementById('new-password');
    const confirmInput = document.getElementById('confirm-password');
    const photoInput = document.getElementById('update-photo-file');

    const updateSaveState = () => {
        const changed = emailInput.value.trim() !== (currentUser.email || '') ||
            passwordInput.value.length > 0 ||
            confirmInput.value.length > 0 ||
            Boolean(photoInput?.files.length);

        saveButton.disabled = !changed;
        saveButton.classList.toggle('opacity-50', !changed);
        saveButton.classList.toggle('cursor-not-allowed', !changed);
        saveButton.classList.toggle('cursor-pointer', changed);
        saveButton.classList.toggle('hover:bg-brand-hover', changed);
    };

    [emailInput, passwordInput, confirmInput, photoInput].forEach(input =>
        input?.addEventListener('input', updateSaveState)
    );
}

// Remplace le formulaire visible par un bouton et un modal d'édition.
function initializeProfileEditModal() {
    const form = document.getElementById('update-profile-form');
    if (!form || document.getElementById('profile-edit-modal')) return;

    const summary = document.createElement('div');
    summary.className = 'mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3';
    summary.innerHTML = `
        <div class="sm:col-span-2 flex items-center gap-4 rounded-2xl border border-zinc-800 bg-[#191919] p-4">
            <div id="profile-summary-avatar" class="w-16 h-16 rounded-full overflow-hidden border border-zinc-700 bg-[#202020] flex items-center justify-center"></div>
            <div>
                <p class="text-xs uppercase tracking-wider text-zinc-500">Profil actuel</p>
                <p id="profile-summary-name" class="text-base font-bold text-gray-100 mt-1"></p>
            </div>
        </div>
        <div class="rounded-xl border border-zinc-800 bg-[#191919] p-3"><p class="text-xs text-zinc-500">Rôle</p><p id="profile-summary-role" class="text-sm text-zinc-200 mt-1"></p></div>
        <div class="rounded-xl border border-zinc-800 bg-[#191919] p-3"><p class="text-xs text-zinc-500">Matricule</p><p id="profile-summary-matricule" class="text-sm text-zinc-200 mt-1"></p></div>
        <div class="rounded-xl border border-zinc-800 bg-[#191919] p-3"><p class="text-xs text-zinc-500">Département</p><p id="profile-summary-faculty" class="text-sm text-zinc-200 mt-1"></p></div>
        ${currentUser.role === 'etudiant' ? `
        <div class="rounded-xl border border-zinc-800 bg-[#191919] p-3"><p class="text-xs text-zinc-500">Classe</p><p id="profile-summary-class" class="text-sm text-zinc-200 mt-1"></p></div>
        <div class="rounded-xl border border-zinc-800 bg-[#191919] p-3"><p class="text-xs text-zinc-500">Code de carte</p><p id="profile-summary-card-code" class="text-sm text-zinc-200 mt-1"></p></div>
        ` : ''}
        <div class="rounded-xl border border-zinc-800 bg-[#191919] p-3"><p class="text-xs text-zinc-500">Adresse e-mail</p><p id="profile-summary-email" class="text-sm text-zinc-200 mt-1 break-all"></p></div>
    `;
    form.parentElement.insertBefore(summary, form);

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'w-full md:w-auto px-6 py-3 bg-brand hover:bg-brand-hover text-white rounded-xl font-bold text-sm transition-all shadow-lg';
    trigger.innerHTML = '<i class="fa-solid fa-pen-to-square mr-2"></i>Modifier le profil';
    form.parentElement.insertBefore(trigger, form);

    const modal = document.createElement('div');
    modal.id = 'profile-edit-modal';
    modal.className = 'hidden fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto';
    modal.innerHTML = `
        <div class="min-h-full flex items-center justify-center">
            <div class="w-full max-w-2xl bg-[#202020] border border-zinc-700 rounded-2xl p-5 md:p-8 shadow-2xl">
                <div class="flex items-center justify-between gap-4 border-b border-zinc-800 pb-4 mb-6">
                    <div>
                        <h2 class="text-lg font-bold text-gray-100">Modifier le profil</h2>
                        <p class="text-xs text-zinc-500 mt-1">Modifiez vos informations de connexion.</p>
                    </div>
                    <button type="button" onclick="cancelProfileEdit()" class="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div id="profile-form-slot"></div>
            </div>
        </div>`;
    document.body.appendChild(modal);
    document.getElementById('profile-form-slot').appendChild(form);
    form.classList.remove('hidden');

    const roleInput = form.querySelector('input[value="Professeur"], input[value="Chef de Département"], input[value="Étudiant"]');
    document.getElementById('profile-summary-avatar').innerHTML = document.getElementById('settings-pic-container')?.innerHTML || buildAvatarHtml(currentUser, 'text-lg');
    document.getElementById('profile-summary-name').textContent = document.getElementById('profile-fullname')?.value || buildProfileName(currentUser);
    document.getElementById('profile-summary-role').textContent = roleInput?.value || currentUser.role || 'Non renseigné';
    document.getElementById('profile-summary-matricule').textContent = document.getElementById('prof-matricule-input')?.value || document.getElementById('chef-matricule-input')?.value || document.getElementById('student-matricule-input')?.value || 'Non renseigné';
    document.getElementById('profile-summary-faculty').textContent = document.getElementById('profile-faculty')?.value || document.getElementById('chef-faculty-input')?.value || document.getElementById('student-faculty-input')?.value || 'Non renseignée';
    const summaryClass = document.getElementById('profile-summary-class');
    if (summaryClass) summaryClass.textContent = currentUser.classe || currentUser.annee_etude || 'Non renseignée';
    const summaryCardCode = document.getElementById('profile-summary-card-code');
    if (summaryCardCode) summaryCardCode.textContent = currentUser.card_code || 'Non renseigné';
    document.getElementById('profile-summary-email').textContent = currentUser.email || 'Non renseignée';

    const saveButton = document.getElementById('save-profile-btn');
    if (saveButton) {
        saveButton.disabled = false;
        saveButton.innerHTML = '<i class="fa-solid fa-check mr-2"></i>Appliquer';
        saveButton.className = 'px-6 py-3 bg-brand hover:bg-brand-hover text-white rounded-xl font-bold text-sm transition-all shadow-lg cursor-pointer';

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-bold text-sm transition-all';
        cancelButton.innerHTML = '<i class="fa-solid fa-xmark mr-2"></i>Annuler';
        cancelButton.addEventListener('click', cancelProfileEdit);
        saveButton.parentElement.insertBefore(cancelButton, saveButton);
        addPasswordToggle('new-password');
        addPasswordToggle('confirm-password');
    }

    trigger.addEventListener('click', () => {
        modal.classList.remove('hidden');
        document.getElementById('profile-email').value = currentUser.email || '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
        document.getElementById('profile-email').focus();
    });
}

function buildProfileName(user) {
    return `${user.prenom || ''} ${user.postnom || ''} ${user.nom || ''}`.trim().toUpperCase();
}

function addPasswordToggle(inputId) {
    const input = document.getElementById(inputId);
    if (!input || input.parentElement.querySelector(`[data-password-toggle="${inputId}"]`)) return;
    const wrapper = input.parentElement;
    wrapper.classList.add('relative');
    input.classList.add('pr-10');
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.passwordToggle = inputId;
    button.className = 'absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200';
    button.setAttribute('aria-label', 'Afficher ou masquer le mot de passe');
    button.innerHTML = '<i class="fa-regular fa-eye"></i>';
    button.addEventListener('click', () => {
        const visible = input.type === 'text';
        input.type = visible ? 'password' : 'text';
        button.innerHTML = `<i class="fa-regular ${visible ? 'fa-eye' : 'fa-eye-slash'}"></i>`;
    });
    wrapper.appendChild(button);
}

function cancelProfileEdit() {
    const modal = document.getElementById('profile-edit-modal');
    const form = document.getElementById('update-profile-form');
    if (form) {
        document.getElementById('profile-email').value = currentUser.email || '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
        const photoInput = document.getElementById('update-photo-file');
        if (photoInput) photoInput.value = '';
    }
    if (modal) modal.classList.add('hidden');
}

// Met à jour email, mot de passe et photo de profil dans Supabase
async function handleProfileUpdate(e) {
    e.preventDefault();

    const newEmail = document.getElementById('profile-email').value.trim().toLowerCase();
    const newPassword = document.getElementById('new-password')?.value || '';
    const confirmPassword = document.getElementById('confirm-password')?.value || '';
    const photoInput = document.getElementById('update-photo-file');

    const currentPassword = await requestCurrentPassword();
    if (!currentPassword) {
        return;
    }

    if (newPassword && newPassword !== confirmPassword) {
        showNotification("Les mots de passe ne correspondent pas !", "error");
        return;
    }

    try {
        const { data: verifiedUser, error: verificationError } = await _supabase
            .from('utilisateurs')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle();
        if (verificationError) throw verificationError;
        if (!verifiedUser || typeof verifiedUser.mot_de_passe !== 'string' || verifiedUser.mot_de_passe !== currentPassword) {
            showNotification("Mot de passe actuel incorrect.", "error");
            return;
        }

        const updateData = { email: newEmail };
        if (newPassword) updateData.mot_de_passe = newPassword;

        // Upload de la photo si l'utilisateur en a choisi une
        if (photoInput?.files.length) {
            const photoFile = photoInput.files[0];
            const fileName = `${Date.now()}_${photoFile.name}`;
            const { error: uploadError } = await _supabase.storage.from('avatars').upload(fileName, photoFile);
            if (uploadError) throw uploadError;
            const { data: publicUrlData } = _supabase.storage.from('avatars').getPublicUrl(fileName);
            updateData.photo_profil = publicUrlData.publicUrl;
        }

        const { error } = await _supabase
            .from('utilisateurs')
            .update(updateData)
            .eq('id', currentUser.id);

        if (error) throw error;

        const updatedUser = sanitizeStoredUser({ ...currentUser, email: newEmail, ...(updateData.photo_profil ? { photo_profil: updateData.photo_profil } : {}) });
        if (!updatedUser) {
            showNotification("La session utilisateur est devenue invalide. Veuillez vous reconnecter.", "error");
            localStorage.removeItem('currentUser');
            return;
        }

        currentUser = updatedUser;
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        const summaryEmail = document.getElementById('profile-summary-email');
        if (summaryEmail) summaryEmail.textContent = newEmail;

        showNotification("Informations mises à jour avec succès !");

        if (newPassword) {
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
        }
        if (photoInput) photoInput.value = '';
        cancelProfileEdit();

        const saveButton = document.getElementById('save-profile-btn');
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.classList.add('opacity-50', 'cursor-not-allowed');
            saveButton.classList.remove('cursor-pointer', 'hover:bg-brand-hover');
        }
    } catch (err) {
        console.error("Erreur mise à jour profil:", err);
        showNotification("Erreur lors de la mise à jour des informations.", "error");
    }
}

function requestCurrentPassword() {
    return new Promise(resolve => {
        const dialog = document.createElement('div');
        dialog.className = 'fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4';
        dialog.innerHTML = `<div class="w-full max-w-sm rounded-2xl border border-zinc-700 bg-[#202020] p-6 shadow-2xl"><h3 class="text-lg font-bold text-gray-100">Confirmer la modification</h3><p class="mt-2 text-xs text-zinc-400">Entrez votre mot de passe actuel pour appliquer ces changements.</p><div class="relative mt-5"><input id="profile-confirm-input" type="password" class="w-full rounded-xl border border-zinc-700 bg-[#191919] px-4 py-3 pr-10 text-sm text-gray-200 outline-none focus:border-brand" placeholder="Mot de passe actuel"><button type="button" id="profile-confirm-toggle" class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"><i class="fa-regular fa-eye"></i></button></div><div class="mt-5 flex justify-end gap-2"><button type="button" id="profile-confirm-cancel" class="rounded-xl bg-zinc-800 px-4 py-2.5 text-xs font-bold text-zinc-200 hover:bg-zinc-700">Annuler</button><button type="button" id="profile-confirm-ok" class="rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-hover">Confirmer</button></div></div>`;
        document.body.appendChild(dialog);
        const input = dialog.querySelector('#profile-confirm-input');
        dialog.querySelector('#profile-confirm-toggle').onclick = () => {
            input.type = input.type === 'password' ? 'text' : 'password';
        };
        const close = value => { dialog.remove(); resolve(value); };
        dialog.querySelector('#profile-confirm-cancel').onclick = () => close('');
        dialog.querySelector('#profile-confirm-ok').onclick = () => close(input.value.trim());
        input.focus();
    });
}

// Génère le HTML de l'avatar (photo ou initiales)
function buildAvatarHtml(user, textSizeClass = 'text-lg') {
    const initials = `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase();
    const avatarUrl = user.avatar_url || user.photo_profil;
    return avatarUrl
        ? `<img src="${avatarUrl}" alt="Avatar" class="w-full h-full object-cover">`
        : `<span class="text-brand font-bold ${textSizeClass}">${initials}</span>`;
}

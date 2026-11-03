// État actuel du rôle ('student', 'dept' ou 'prof')
let currentRole = "student";
let registrationDepartments = [];

async function loadRegistrationDepartments() {
  const select = document.getElementById("faculte");
  if (!select) return;
  const loadingIndicator = document.getElementById("registration-departments-loading");
  loadingIndicator?.classList.remove("hidden");
  const { data, error } = await _supabase.from("departements").select("id, nom, code_departement").order("nom");
  loadingIndicator?.classList.add("hidden");
  if (error) {
    console.error("Erreur chargement départements :", error);
    select.innerHTML = '<option value="" disabled selected>Impossible de charger les départements</option>';
    return;
  }
  registrationDepartments = data || [];
  select.innerHTML = '<option value="" disabled selected>Choisissez un département</option>' +
    registrationDepartments.map((d) => `<option value="${d.id}" data-name="${d.nom.replace(/"/g, "&quot;")}" data-code="${d.code_departement || ""}">${d.nom}</option>`).join("");
}

async function loadClassesForDepartment() {
  const departmentId = document.getElementById("faculte")?.value;
  const classSelect = document.getElementById("classe");
  if (!classSelect) return;
  const loadingIndicator = document.getElementById("registration-classes-loading");
  loadingIndicator?.classList.toggle("hidden", !departmentId);
  classSelect.disabled = true;
  classSelect.innerHTML = '<option value="" disabled selected>Chargement des classes...</option>';
  if (!departmentId) {
    loadingIndicator?.classList.add("hidden");
    classSelect.innerHTML = '<option value="" disabled selected>Choisissez d’abord un département</option>';
    return;
  }
  let result;
  try {
    result = await _supabase
      .from("classes")
      .select("id, nom")
      .eq("departement_id", departmentId)
      .order("nom");
  } catch (error) {
    console.error("Erreur chargement classes :", error);
    loadingIndicator?.classList.add("hidden");
    classSelect.innerHTML =
      '<option value="" disabled selected>Impossible de charger les classes</option>';
    return;
  }
  loadingIndicator?.classList.add("hidden");
  const { data, error } = result;
  if (error) {
    console.error("Erreur chargement classes :", error);
    classSelect.innerHTML = '<option value="" disabled selected>Impossible de charger les classes</option>';
    return;
  }
  classSelect.innerHTML = '<option value="" disabled selected>Choisissez une classe</option>' +
    (data || []).map((c) => `<option value="${c.id}">${c.nom}</option>`).join("");
  classSelect.disabled = !(data || []).length;
  checkStep1();
}

function selectedDepartmentName() {
  return document.getElementById("faculte")?.selectedOptions[0]?.textContent.trim() || "";
}

function showNotification(message, type = "success") {
  setSubmitLoading(false);
  let container = document.getElementById("toast-notification-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-notification-container";
    container.className =
      "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none w-[min(92vw,28rem)]";
    document.body.appendChild(container);
  }
  const notification = document.createElement("div");
  notification.className = `pointer-events-auto relative overflow-hidden px-4 py-3 pb-4 rounded-xl border text-xs font-bold shadow-lg ${type === "success" ? "bg-[#1a2e22] border-emerald-500/40 text-emerald-400" : "bg-[#2e1a1a] border-red-500/40 text-red-400"}`;
  notification.innerHTML = `<i class="fa-solid ${type === "success" ? "fa-circle-check" : "fa-circle-exclamation"} mr-2"></i><span>${message}</span><button type="button" class="notification-close ml-auto text-current/70 hover:text-current text-base leading-none" aria-label="Fermer">&times;</button><span class="notification-progress absolute bottom-0 left-0 h-1 ${type === "success" ? "bg-emerald-400" : "bg-red-400"}"></span>`;
  container.appendChild(notification);
  notification
    .querySelector(".notification-close")
    ?.addEventListener("click", () => notification.remove());
  notification
    .querySelector(".notification-progress")
    ?.animate([{ width: "100%" }, { width: "0%" }], {
      duration: 2000,
      easing: "linear",
    });
  setTimeout(() => notification.remove(), 2000);
}

function setSubmitLoading(isLoading) {
  const button = document.getElementById("btn-submit");
  if (!button) return;

  button.disabled = isLoading;
  button.innerHTML = isLoading
    ? '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Création en cours...'
    : '<i class="fa-solid fa-user-plus mr-2"></i>Créer mon compte';
}

function setSubmitProgress(message) {
  const button = document.getElementById("btn-submit");
  if (button && button.disabled) {
    button.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i>${message}`;
  }
}

function previewProfilePhoto(input) {
  const previewContainer = document.getElementById("photo-preview-container");
  const preview = document.getElementById("photo-preview");
  const previewName = document.getElementById("photo-preview-name");
  const file = input.files && input.files[0];

  if (!file || !file.type.startsWith("image/")) {
    previewContainer.classList.add("hidden");
    preview.removeAttribute("src");
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  preview.onload = () => URL.revokeObjectURL(objectUrl);
  preview.src = objectUrl;
  previewName.textContent = `${file.name} (${Math.round(file.size / 1024)} Ko)`;
  previewContainer.classList.remove("hidden");
  checkStep2();
}

// --- Gestion du choix du profil (Étudiant / Chef de département / Professeur) ---
function setRole(role) {
  currentRole = role;
  const btnStudent = document.getElementById("tab-student");
  const btnDept = document.getElementById("tab-dept");
  const btnProf = document.getElementById("tab-prof");
  const studentFields1 = document.getElementById("student-fields-1");
  const cardFieldContainer = document.getElementById("card-field-container");
  const profFields2 = document.getElementById("prof-fields-2");
  const photoLabel = document.getElementById("photo-label");
  const photoHint = document.getElementById("photo-hint");
  const classFieldContainer = document.getElementById("class-field-container");
  const departmentCodeField = document.getElementById("department-code-field");

  // Réinitialisation des styles des onglets
  btnStudent.className =
    "py-2 text-[11px] md:text-xs font-semibold rounded-lg transition-all text-zinc-400 hover:text-gray-200";
  if (btnDept)
    btnDept.className =
      "py-2 text-[11px] md:text-xs font-semibold rounded-lg transition-all text-zinc-400 hover:text-gray-200";
  btnProf.className =
    "py-2 text-[11px] md:text-xs font-semibold rounded-lg transition-all text-zinc-400 hover:text-gray-200";

  if (role === "student") {
    btnStudent.className =
      "py-2 text-[11px] md:text-xs font-semibold rounded-lg transition-all bg-brand text-white shadow-sm";
    studentFields1.classList.remove("hidden");
    if (cardFieldContainer) cardFieldContainer.classList.remove("hidden");
    if (classFieldContainer) classFieldContainer.classList.remove("hidden");
    if (departmentCodeField) departmentCodeField.classList.add("hidden");
    profFields2.classList.add("hidden");
    photoLabel.innerHTML =
      'Photo de profil <span id="photo-req" class="text-brand">*</span>';
    photoHint.textContent =
      "Votre photo de profil est obligatoire, elle ne doit contenir que votre visage, elle doit être naturelle, claire et visible";
  } else if (role === "dept") {
    if (btnDept)
      btnDept.className =
        "py-2 text-[11px] md:text-xs font-semibold rounded-lg transition-all bg-brand text-white shadow-sm";
    studentFields1.classList.remove("hidden");
    // Le chef de département a besoin du département, mais pas de l'année d'étude ni du numéro de carte
    if (cardFieldContainer) cardFieldContainer.classList.add("hidden");
    if (classFieldContainer) classFieldContainer.classList.add("hidden");
    if (departmentCodeField) departmentCodeField.classList.remove("hidden");
    profFields2.classList.remove("hidden"); // Demande le code administratif comme le prof
    photoLabel.innerHTML = "Photo de profil";
    photoHint.textContent =
      "Votre photo de profil est optionnelle, elle ne doit contenir que votre visage, elle doit être naturelle, claire et visible";
  } else {
    // prof
    btnProf.className =
      "py-2 text-[11px] md:text-xs font-semibold rounded-lg transition-all bg-brand text-white shadow-sm";
    studentFields1.classList.add("hidden");
    if (classFieldContainer) classFieldContainer.classList.add("hidden");
    if (departmentCodeField) departmentCodeField.classList.add("hidden");
    profFields2.classList.remove("hidden");
    photoLabel.innerHTML = "Photo de profil";
    photoHint.textContent =
      "Votre photo de profil est optionnelle, elle ne doit contenir que votre visage, elle doit être naturelle, claire et visible";
  }
  checkStep1();
  checkStep2();
}

// --- Navigation entre les étapes ---
function goToStep2() {
  document.getElementById("step-1").classList.add("hidden");
  document.getElementById("step-2").classList.remove("hidden");
  document.getElementById("step-indicator").textContent =
    "Étape 2 sur 2 : Sécurité & Connexion";
  document.getElementById("step-badge").textContent = "Step 2";
}

function goToStep1() {
  document.getElementById("step-2").classList.add("hidden");
  document.getElementById("step-1").classList.remove("hidden");
  document.getElementById("step-indicator").textContent =
    "Étape 1 sur 2 : Informations personnelles";
  document.getElementById("step-badge").textContent = "Step 1";
}

// --- Validation Étape 1 ---
function checkStep1() {
  const nom = document.getElementById("nom").value.trim();
  const postnom = document.getElementById("postnom").value.trim();
  const prenom = document.getElementById("prenom").value.trim();
  const matricule = document.getElementById("matricule").value.trim();
  const btnNext = document.getElementById("btn-next");

  let isValid = nom && postnom && prenom && matricule;

  if (currentRole === "student") {
    const faculte = document.getElementById("faculte").value;
    const classe = document.getElementById("classe").value;
    if (!faculte || !classe) isValid = false;
  } else if (currentRole === "dept") {
    const faculte = document.getElementById("faculte").value;
    const departmentCode = document.getElementById("department-code").value.trim();
    if (!faculte || !departmentCode) isValid = false;
  }

  if (isValid) {
    btnNext.disabled = false;
    btnNext.className =
      "w-full bg-brand hover:bg-brand-hover text-white py-3 rounded-xl font-medium text-sm shadow-lg transition-all mt-2 cursor-pointer";
  } else {
    btnNext.disabled = true;
    btnNext.className =
      "w-full bg-brand/50 cursor-not-allowed text-white py-3 rounded-xl font-medium text-sm shadow-lg transition-all mt-2";
  }
}

// --- Validation Étape 2 ---
function checkStep2() {
  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;
  const photoInput = document.getElementById("photo-profil").files.length;
  const btnSubmit = document.getElementById("btn-submit");

  let isValid =
    email && password && confirmPassword && password === confirmPassword;

  if (currentRole === "student" && photoInput === 0) {
    isValid = false;
  }

  if (currentRole === "prof" || currentRole === "dept") {
    const adminCode = document.getElementById("admin-code").value.trim();
    if (!adminCode) isValid = false;
  }

  if (isValid) {
    btnSubmit.disabled = false;
    btnSubmit.className =
      "w-2/3 bg-brand hover:bg-brand-hover text-white py-3 rounded-xl font-medium text-sm shadow-lg transition-all cursor-pointer";
  } else {
    btnSubmit.disabled = true;
    btnSubmit.className =
      "w-2/3 bg-brand/50 cursor-not-allowed text-white py-3 rounded-xl font-medium text-sm shadow-lg transition-all";
  }
}

// --- Afficher / Cacher le mot de passe ---
function togglePassword(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (input.type === "password") {
    input.type = "text";
    icon.innerHTML = '<i class="fa-regular fa-eye-slash" id="eye-closed"></i>';
  } else {
    input.type = "password";
    icon.innerHTML = '<i class="fa-regular fa-eye" id="eye-open"></i>';
  }
}

// ================= ENREGISTREMENT DANS SUPABASE =================
document
  .getElementById("reg-form")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    setSubmitLoading(true);

    const nom = document.getElementById("nom").value.trim();
    const postnom = document.getElementById("postnom").value.trim();
    const prenom = document.getElementById("prenom").value.trim();
    const matricule = document.getElementById("matricule").value.trim();
    const email = document.getElementById("email").value.trim();
    const mot_de_passe = document.getElementById("password").value;

    const departmentId =
      currentRole === "student" || currentRole === "dept"
        ? document.getElementById("faculte").value
        : null;
    const faculte =
      currentRole === "student" || currentRole === "dept"
        ? selectedDepartmentName() || null
        : null;
    const departmentCode = currentRole === "dept"
      ? document.getElementById("department-code").value.trim().toUpperCase()
      : null;
    const classeId = currentRole === "student" ? document.getElementById("classe").value : null;
    const annee_etude = currentRole === "student"
      ? document.getElementById("classe").selectedOptions[0]?.textContent.trim()
      : null;
    const cardCode =
      currentRole === "student"
        ? document.getElementById("card-code").value.trim()
        : null;
    const code_administratif =
      currentRole === "prof" || currentRole === "dept"
        ? document
            .getElementById("admin-code")
            .value.replace(/\s+/g, "")
            .toUpperCase()
        : null;

    // --- Vérifier le code sans le consommer avant l'enregistrement ---
    if (currentRole === "prof" || currentRole === "dept") {
      const codeTable =
        currentRole === "prof" ? "codes_admin" : "codes_admin_pro";
      const { data: codeData, error: codeError } = await _supabase
        .from(codeTable)
        .select("code")
        .eq("code", code_administratif)
        .maybeSingle();

      if (codeError || !codeData) {
        console.error("Erreur validation code administratif", {
          table: codeTable,
          error: codeError,
        });

       showNotification(
         codeError
           ? "Impossible de vérifier le code administratif. Réessayez."
           : "Aucun code administratif correspondant.",
         "error",
       );
        return;
      }

      if (currentRole === "dept") {
        const selectedDepartment = registrationDepartments.find((item) => item.id === departmentId);
        if (!selectedDepartment || selectedDepartment.code_departement?.toUpperCase() !== departmentCode) {
          showNotification("Le code du département est incorrect.", "error");
          return;
        }
      }
    }

    let photoUrl = null;
    const photoFile = document.getElementById("photo-profil").files[0];

    // Upload de la photo de profil si elle existe
    if (photoFile) {
      setSubmitProgress("Envoi de la photo...");
      const safeFileName = photoFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileName = `${Date.now()}_${safeFileName}`;
      const { data: uploadData, error: uploadError } = await _supabase.storage
        .from("avatars")
        .upload(fileName, photoFile);

      if (uploadError) {
        console.error("Erreur upload photo :", uploadError.message);
        if (currentRole === "student") {
          showNotification(
            "La photo est obligatoire : " + uploadError.message,
            "error",
          );
          return;
        }
      } else {
        const { data: publicUrlData } = _supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        photoUrl = publicUrlData.publicUrl;
      }
    }

    // Détermination de la valeur du rôle pour la base de données
    let dbRole = "etudiant";
    if (currentRole === "dept") dbRole = "chef_departement";
    if (currentRole === "prof") dbRole = "professeur";

    const identityData = {
      role: dbRole,
      nom: nom,
      postnom: postnom,
      prenom: prenom,
      matricule: matricule,
      email: email,
      mot_de_passe: mot_de_passe,
      photo_profil: photoUrl,
    };

    let destinationTable = "utilisateurs";
    if (currentRole === "prof") destinationTable = "prof_attente";
    if (currentRole === "dept") destinationTable = "chef_attente";

    const userData =
      currentRole === "student"
        ? {
            ...identityData,
            faculte,
            departement_id: departmentId,
            classe_id: classeId,
            annee_etude,
            card_code: cardCode,
          }
        : currentRole === "dept"
          ? {
              ...identityData,
              faculte,
              departement_id: departmentId,
              code_departement: departmentCode,
              code_administratif: code_administratif,
            }
          : {
              ...identityData,
              code_administratif: code_administratif,
            };

    setSubmitProgress("Enregistrement du compte...");
    const { data, error } = await _supabase
      .from(destinationTable)
      .insert([userData])
      .select("id")
      .single();

    if (error) {
      showNotification(
        "Inscription impossible. Vérifiez les informations saisies.",
        "error",
      );
    } else {
      if (currentRole === "prof" || currentRole === "dept") {
        const codeTable =
          currentRole === "prof" ? "codes_admin" : "codes_admin_pro";
        const historyRole =
          currentRole === "prof" ? "professeur" : "chef_departement";
        const { error: historyError } = await _supabase
          .from("codes_admin_historique")
          .insert([
            {
              code: code_administratif,
              role: historyRole,
              status: "pending",
              registration_id: data.id,
              email,
              nom_complet: `${prenom} ${postnom} ${nom}`.trim(),
              faculte,
            },
          ]);
        if (historyError) {
          console.warn(
            "Code validé, mais historique non enregistré :",
            historyError.message,
          );
        }
        const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let nouveauCode = "";
        for (let i = 0; i < 6; i++) {
          nouveauCode += caracteres.charAt(
            Math.floor(Math.random() * caracteres.length),
          );
        }

        const { error: rotateError } = await _supabase
          .from(codeTable)
          .delete()
          .eq("code", code_administratif);

        if (!rotateError) {
          const { error: nextCodeError } = await _supabase
            .from(codeTable)
            .insert([{ code: nouveauCode }]);
          if (nextCodeError) {
            console.error(
              "Erreur création nouveau code :",
              nextCodeError.message,
            );
          }
        } else {
          console.error(
            "Erreur rotation code administratif :",
            rotateError.message,
          );
        }
      }

      if (
        typeof notifyUsersByRole === "function" &&
        currentRole !== "student"
      ) {
        await notifyUsersByRole({
          role: "administrateur",
          type: "registration_pending",
          title: "Nouvelle inscription en attente",
          message: `${prenom} ${nom} a demandé un compte ${dbRole}.`,
        });

     }
      if (destinationTable === "utilisateurs") {
        const { error: themeError } = await _supabase
          .from("user_themes")
          .upsert(
            { user_id: data.id, theme: "dark" },
            { onConflict: "user_id", ignoreDuplicates: true },
          );

        if (themeError) {
          console.warn(
            "Compte créé, thème par défaut non enregistré :",
            themeError.message,
          );
        }

        if (typeof sendNotificationEmail === "function") {
          try {
            await sendNotificationEmail({
              toEmail: email,
              toName: `${prenom} ${nom}`.trim(),
              subject: "Bienvenue sur Smart Attendance",
              message:
                "Votre compte étudiant a été créé avec succès. Bienvenue sur Smart Attendance !",
              actionUrl: new URL("login.html", document.baseURI).href,
            });

         } catch (emailError) {
            console.warn(
              "Compte créé, mais e-mail de bienvenue non envoyé :",
              emailError,
            );
          }
        }
      }

      const confirmationMessage =
        currentRole === "student"
          ? "Inscription réussie. Bienvenue sur Smart Attendance."
          : "Inscription envoyée. Elle sera validée par l'administration.";
      showNotification(confirmationMessage);
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1200);
    }
  });

document.addEventListener("DOMContentLoaded", () => {
  loadRegistrationDepartments().catch((error) => {
    console.error("Erreur initialisation des départements :", error);
    document
      .getElementById("registration-departments-loading")
      ?.classList.add("hidden");
    const select = document.getElementById("faculte");
    if (select) {
      select.innerHTML =
        '<option value="" disabled selected>Impossible de charger les départements</option>';
    }
  });
});

// Récupération sécurisée de l'utilisateur connecté depuis le localStorage
function safeGetCurrentUser() {
  try {
    const rawUser = localStorage.getItem("currentUser");
    if (!rawUser) return null;

    const parsedUser = JSON.parse(rawUser);
    if (!parsedUser || typeof parsedUser !== "object") {
      localStorage.removeItem("currentUser");
      return null;
    }

    if (!parsedUser.role || parsedUser.role !== "etudiant") {
      localStorage.removeItem("currentUser");
      return null;
    }

    return parsedUser;
  } catch (error) {
    console.warn("Session étudiant invalide.", error);
    localStorage.removeItem("currentUser");
    return null;
  }
}

let currentUser = safeGetCurrentUser();

document.addEventListener("DOMContentLoaded", () => {
  // Vérification de sécurité : Rediriger vers la connexion si non connecté ou mauvais rôle
  if (localStorage.getItem("smart-attendance-session-expired")) return;

  if (!currentUser || currentUser.role !== "etudiant") {
    showNotification(
      "Accès refusé : cette page est réservée aux étudiants.",
      "error",
    );
    setTimeout(() => {
      window.location.href = "../login.html";
    }, 1200);
    return;
  }

  initializeStudentSidebar();

  // Initialisation du tableau de bord étudiant
  initializeStudentProfile();
  loadStudentCourses();

  // Écouteur d'événement pour la barre de recherche des cours
  const searchCoursInput = document.getElementById("search-cours");
  if (searchCoursInput) {
    searchCoursInput.addEventListener("input", (e) =>
      filterCourses(e.target.value),
    );
    searchCoursInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") searchStudentCourses();
    });
  }
  document
    .getElementById("student-course-search-button")
    ?.addEventListener("click", searchStudentCourses);
  const pageSizeInput = document.getElementById("student-page-size");
  if (pageSizeInput)
    pageSizeInput.addEventListener("change", () =>
      applyStudentCourseControls(true),
    );

  // Gestion de la soumission du formulaire de mise à jour du profil
  const updateProfileForm = document.getElementById("update-profile-form");
  if (updateProfileForm) {
    updateProfileForm.addEventListener("submit", handleProfileUpdate);
    initializeProfileSaveControls();
    initializeProfileEditModal();
  }
});

function initializeStudentSidebar() {
  const sidebar = document.getElementById("student-sidebar");
  const toggle = document.getElementById("student-sidebar-toggle");
  const shell = document.querySelector(".student-shell");
  if (!sidebar || !toggle || !shell) return;

  const mobileViewport = window.matchMedia("(max-width: 767px)");
  const setOpen = (isOpen) => {
    sidebar.classList.toggle("is-open", mobileViewport.matches && isOpen);
    sidebar.inert = mobileViewport.matches && !isOpen;
    shell.classList.toggle("sidebar-collapsed", !mobileViewport.matches && !isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute(
      "aria-label",
      isOpen ? "Fermer le menu étudiant" : "Ouvrir le menu étudiant",
    );
    toggle.querySelector("i")?.classList.add("fa-bars");
    toggle.querySelector("i")?.classList.remove("fa-xmark");
  };

  setOpen(!mobileViewport.matches);
  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });
  document.addEventListener("pointerdown", (event) => {
    if (
      mobileViewport.matches &&
      toggle.getAttribute("aria-expanded") === "true" &&
      event.target instanceof Node &&
      !sidebar.contains(event.target) &&
      !toggle.contains(event.target)
    ) {
      setOpen(false);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      toggle.focus();
    }
  });
  mobileViewport.addEventListener("change", () => setOpen(!mobileViewport.matches));

  const themeSwitcher = document.getElementById("theme-switcher");
  const logoutButton = document.querySelector("#student-top-actions .logout-button");
  if (themeSwitcher && logoutButton) logoutButton.before(themeSwitcher);
}

function closeStudentSidebar() {
  const sidebar = document.getElementById("student-sidebar");
  const toggle = document.getElementById("student-sidebar-toggle");
  if (!sidebar || !toggle) return;
  if (!window.matchMedia("(max-width: 767px)").matches) return;

  sidebar.classList.remove("is-open");
  sidebar.inert = true;
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Ouvrir le menu étudiant");
  toggle.querySelector("i")?.classList.add("fa-bars");
  toggle.querySelector("i")?.classList.remove("fa-xmark");
  toggle.focus();
}

function toggleStudentDashboardMenu() {
  const dashboardButton = document.getElementById("btn-cours");
  const submenu = document.getElementById("student-dashboard-submenu");
  const chevron = document.getElementById("student-dashboard-chevron");
  if (!dashboardButton || !submenu) return;

  if (dashboardButton.getAttribute("aria-current") !== "page") {
    switchTab("cours");
    submenu.hidden = false;
    dashboardButton.setAttribute("aria-expanded", "true");
    chevron?.classList.remove("rotate-180");
    return;
  }

  const isExpanded = dashboardButton.getAttribute("aria-expanded") === "true";
  dashboardButton.setAttribute("aria-expanded", String(!isExpanded));
  submenu.hidden = isExpanded;
  chevron?.classList.toggle("rotate-180", !isExpanded);
}

function openJoinCourseFromMenu() {
  toggleJoinCourseModal(true);
}

// ================= SYSTÈME DE NOTIFICATIONS TOAST =================
function showNotification(message, type = "success") {
  let notifContainer = document.getElementById("toast-notification-container");
  if (!notifContainer) {
    notifContainer = document.createElement("div");
    notifContainer.id = "toast-notification-container";
    notifContainer.className =
      "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none w-[min(92vw,28rem)]";
    document.body.appendChild(notifContainer);
  }

  const notif = document.createElement("div");
  notif.className = `pointer-events-auto relative overflow-hidden px-4 py-3 pb-4 rounded-xl border text-xs font-bold shadow-lg transition-all transform translate-y-2 opacity-0 flex items-center gap-2.5 ${
    type === "success"
      ? "bg-[#1a2e22] border-emerald-500/40 text-emerald-400"
      : "bg-[#2e1a1a] border-red-500/40 text-red-400"
  }`;

  notif.innerHTML = `
        <i class="fa-solid ${type === "success" ? "fa-circle-check text-emerald-400" : "fa-circle-exclamation text-red-400"} text-sm"></i>
        <span>${message}</span>
        <button type="button" class="notification-close ml-auto text-current/70 hover:text-current text-base leading-none" aria-label="Fermer">&times;</button>
        <span class="notification-progress absolute bottom-0 left-0 h-1 ${type === "success" ? "bg-emerald-400" : "bg-red-400"}"></span>
    `;

  notifContainer.appendChild(notif);
  notif
    .querySelector(".notification-close")
    ?.addEventListener("click", () => notif.remove());

  notif
    .querySelector(".notification-progress")
    ?.animate([{ width: "100%" }, { width: "0%" }], {
      duration: 2000,
      easing: "linear",
    });

  setTimeout(() => {
    notif.classList.remove("translate-y-2", "opacity-0");
  }, 10);

  setTimeout(() => {
    notif.classList.add("translate-y-2", "opacity-0");
    setTimeout(() => notif.remove(), 300);
  }, 2000);
}

// ================= GESTION DE LA MODALE : REJOINDRE UN COURS =================
function toggleJoinCourseModal(show) {
  const modal = document.getElementById("join-course-modal");
  if (!modal) return;
  if (show) {
    modal.classList.remove("hidden");
    loadAvailableCoursesForJoin();
  } else {
    modal.classList.add("hidden");
  }
}

async function loadAvailableCoursesForJoin() {
  const container = document.getElementById("available-courses-container");
  if (!container) return;

  container.innerHTML = `<p class="text-zinc-500 text-xs text-center py-6">${loadingMarkup("Chargement des cours disponibles...")}</p>`;

  try {
    // 1. Récupérer les codes des cours déjà rejoints par l'étudiant
    let enrollments = [];
    const { data: dataById, error: idLookupError } = await _supabase
      .from("inscriptions")
      .select("code_cours")
      .eq("etudiant_id", currentUser.id);
    if (idLookupError) throw idLookupError;
    if (dataById) enrollments = enrollments.concat(dataById);

    if (currentUser.email) {
      const { data: dataByEmail, error: emailLookupError } = await _supabase
        .from("inscriptions")
        .select("code_cours")
        .eq("etudiant_email", currentUser.email);
      if (emailLookupError) throw emailLookupError;
      if (dataByEmail) {
        const existingCodes = new Set(enrollments.map((e) => e.code_cours));
        dataByEmail.forEach((e) => {
          if (!existingCodes.has(e.code_cours)) {
            enrollments.push(e);
            existingCodes.add(e.code_cours);
          }
        });
      }
    }
    const enrolledCodes = new Set(enrollments.map((e) => e.code_cours));

    // 2. Charger les cours du département et de la classe de l'étudiant
    let query = _supabase.from("cours").select("*");
    if (currentUser.departement_id) {
      query = query.eq("departement_id", currentUser.departement_id);
    } else if (currentUser.faculte) {
      query = query.eq("faculte", currentUser.faculte);
    }
    if (currentUser.classe_id) {
      query = query.eq("classe_id", currentUser.classe_id);
    } else if (currentUser.classe) {
      query = query.eq("classe", currentUser.classe);
    }

    const { data: coursesData, error } = await query;
    if (error) throw error;

    // Filtrer pour exclure les cours déjà rejoints
    const availableCourses = (coursesData || []).filter(
      (c) => !enrolledCodes.has(c.code_cours),
    );

    if (availableCourses.length === 0) {
      const academicYears = [
        ...new Set(
          (coursesData || [])
            .map((course) => course.annee_academique)
            .filter(Boolean),
        ),
      ].sort();
      const yearLabel =
        academicYears.length > 0
          ? academicYears.join(", ")
          : "aucune année académique renseignée";
      const classLabel = currentUser.annee_etude || "classe non renseignée";
      const facultyLabel = currentUser.faculte || "département non renseigné";
      container.innerHTML = `<p class="text-zinc-500 text-xs text-center py-6">Aucun nouveau cours disponible pour le moment dans la classe  ${classLabel}  de votre département  ${facultyLabel} , pour l'année académique ${yearLabel}.</p>`;
      return;
    }

    container.innerHTML = availableCourses
      .map(
        (course) => `
            <div class="bg-[#191919] border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3" id="join-card-${course.id}">
                <div class="flex justify-between items-start">
                    <div>
                        <div class="flex items-center gap-2 flex-wrap mb-1">
                            <span class="text-xs font-mono bg-brand/10 text-brand px-2 py-0.5 rounded-full border border-brand/25">${course.code_cours || "CODE"}</span>
                            <span class="text-xs text-zinc-400">Classe : ${course.classe || "Non renseignée"}</span>
                        </div>
                        <h4 class="text-base font-bold text-gray-100">${course.nom_cours}</h4>
                        <p class="text-xs text-zinc-400">Professeur : <span class="text-brand font-medium">${course.professeur?.toUpperCase() || "Professeur indisponible"}</span></p>
                        <p class="text-xs text-zinc-500">${course.professeur_email || "Professeur indisponible"}</p>
                    </div>
                    <span class="text-[11px] text-zinc-500">Année académique : ${course.annee_academique || "Non renseignée"}<br>Du ${course.date_debut || "---"} au ${course.date_fin || "---"}</span>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-zinc-800/80 gap-3 flex-wrap" id="action-area-${course.id}">
                    <span class="text-xs text-zinc-400">Département : ${course.faculte || "Non renseigné"}</span>
                    <button onclick="prepareJoinCourse('${course.id}', '${course.code_cours}')" id="join-btn-${course.id}" class="px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5">
                        <i class="fa-solid fa-right-to-bracket"></i> Rejoindre
                    </button>
                </div>
            </div>
        `,
      )
      .join("");
  } catch (err) {
    console.error("Erreur chargement cours disponibles:", err);
    container.innerHTML = `<p class="text-red-400 text-xs text-center py-6">Erreur lors du chargement des cours disponibles.</p>`;
  }
}

function prepareJoinCourse(courseId, codeCours) {
  const actionArea = document.getElementById(`action-area-${courseId}`);
  const joinBtn = document.getElementById(`join-btn-${courseId}`);
  if (!actionArea || !joinBtn) return;

  if (!document.getElementById(`input-code-${courseId}`)) {
    // Le bouton reste là mais change de couleur (devient ambre/doré)
    joinBtn.className =
      "px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5";
    joinBtn.innerHTML = `<i class="fa-solid fa-check"></i> Valider`;
    joinBtn.setAttribute(
      "onclick",
      `submitCourseEnrollment('${courseId}', '${codeCours}')`,
    );

    const inputWrapper = document.createElement("div");
    inputWrapper.className = "flex flex-col flex-1 max-w-xs";
    inputWrapper.innerHTML = `
            <input type="text" id="input-code-${courseId}" placeholder="Code d'enregistrement..." class="w-full px-3 py-2 bg-[#121212] border border-zinc-700 rounded-xl text-xs text-gray-200 outline-none focus:border-amber-500 font-mono">
            <div id="error-msg-${courseId}"></div>
        `;

    actionArea.insertBefore(inputWrapper, joinBtn);

    const inputEl = document.getElementById(`input-code-${courseId}`);
    if (inputEl) {
      inputEl.focus();
      inputEl.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          submitCourseEnrollment(courseId, codeCours);
        }
      });
    }
  } else {
    submitCourseEnrollment(courseId, codeCours);
  }
}

async function submitCourseEnrollment(courseId, codeCours) {
  if (!currentUser || currentUser.role !== "etudiant") {
    showCardError(courseId, "Seuls les étudiants peuvent rejoindre un cours.");
    return;
  }

  const inputEl = document.getElementById(`input-code-${courseId}`);
  if (!inputEl) return;

  const enteredCode = inputEl.value.trim();
  if (!enteredCode) {
    showCardError(courseId, "Veuillez entrer le code.");
    return;
  }

  try {
    const { data: courseData, error: courseError } = await _supabase
      .from("cours")
      .select("*")
      .eq("code_cours", codeCours)
      .single();

    if (courseError) throw courseError;
    if (!courseData) {
      showCardError(courseId, "Cours introuvable.");
      return;
    }

    const normalizedEnteredCode = enteredCode.toLowerCase();
    const normalizedEnrollmentCode = String(
      courseData.code_enregistrement ?? "",
    )
      .trim()
      .toLowerCase();

    if (normalizedEnteredCode === normalizedEnrollmentCode) {
      const { data: enrollmentById, error: enrollmentByIdError } =
        await _supabase
          .from("inscriptions")
          .select("code_cours")
          .eq("code_cours", courseData.code_cours)
          .eq("etudiant_id", currentUser.id)
          .limit(1);
      if (enrollmentByIdError) throw enrollmentByIdError;

      const { data: enrollmentByEmail, error: enrollmentByEmailError } =
        currentUser.email
          ? await _supabase
              .from("inscriptions")
              .select("code_cours")
              .eq("code_cours", courseData.code_cours)
              .eq("etudiant_email", currentUser.email)
              .limit(1)
          : { data: [], error: null };
      if (enrollmentByEmailError) throw enrollmentByEmailError;

      if ((enrollmentById || []).length || (enrollmentByEmail || []).length) {
        showCardError(courseId, "Vous êtes déjà inscrit à ce cours.");
        return;
      }

      // Enregistrement réussi dans la base de données
      const inscriptionData = {
        code_cours: courseData.code_cours,
        etudiant_id: currentUser.id,
        etudiant_email: currentUser.email,
      };

      const { error: insertError } = await _supabase
        .from("inscriptions")
        .insert([inscriptionData]);

      if (insertError) throw insertError;

      if (typeof sendNotificationEmail === "function") {
        try {
          await sendNotificationEmail({
            toEmail: currentUser.email,
            toName:
              `${currentUser.prenom || ""} ${currentUser.nom || ""}`.trim(),
            subject: `Bienvenue dans le cours ${courseData.nom_cours}`,
            message: `Votre inscription au cours est confirmée. Cours : ${courseData.nom_cours}. Code : ${courseData.code_cours}. Classe : ${courseData.classe || "Non renseignée"}. Département : ${courseData.faculte || "Non renseigné"}. Période : du ${courseData.date_debut || "---"} au ${courseData.date_fin || "---"}.`,
            actionUrl: new URL(
              "../student/studentDashboard.html",
              document.baseURI,
            ).href,
          });
        } catch (emailError) {
          console.warn(
            "Inscription réussie, mais e-mail de bienvenue au cours non envoyé :",
            emailError,
          );
        }
      }

      showNotification("Cours rejoint avec succès !");
      toggleJoinCourseModal(false);
      loadStudentCourses();
    } else {
      // Code incorrect : petit message rouge qui disparaît après 2 secondes et vide le champ
      showCardError(courseId, "Code incorrect !");
    }
  } catch (err) {
    console.error("Erreur lors de l'inscription :", err);
    showCardError(
      courseId,
      "Inscription refusée. Vérifiez le code et réessayez.",
    );
  }
}

function showCardError(courseId, message) {
  const inputEl = document.getElementById(`input-code-${courseId}`);
  const errorContainer = document.getElementById(`error-msg-${courseId}`);
  if (!inputEl || !errorContainer) return;

  errorContainer.innerHTML = `<span class="text-[11px] text-red-400 font-bold mt-1 block">${message}</span>`;
  inputEl.value = "";
  inputEl.focus();

  setTimeout(() => {
    errorContainer.innerHTML = "";
  }, 2000);
}

// ================= CHARGEMENT DES COURS DE L'ÉTUDIANT & STATS =================
let allStudentCourses = [];
let studentStatusFilter = "all";

async function loadStudentCourses() {
  const container = document.getElementById("modules-container");
  if (!container) return;
  container.innerHTML = `<p class="text-zinc-500 text-center py-8 text-xs">${loadingMarkup("Chargement de vos cours...")}</p>`;
  ["stat-total-cours", "stat-cours-actifs", "stat-cours-acheves"].forEach(
    (id) => {
      const stat = document.getElementById(id);
      if (stat) stat.innerHTML = loadingMarkup("", "sa-loading--compact");
    },
  );

  try {
    let enrollments = [];
    const { data: dataById, error: idLookupError } = await _supabase
      .from("inscriptions")
      .select("code_cours")
      .eq("etudiant_id", currentUser.id);
    if (idLookupError) throw idLookupError;

    if (dataById) enrollments = enrollments.concat(dataById);

    if (currentUser.email) {
      const { data: dataByEmail, error: emailLookupError } = await _supabase
        .from("inscriptions")
        .select("code_cours")
        .eq("etudiant_email", currentUser.email);
      if (emailLookupError) throw emailLookupError;
      if (dataByEmail) {
        const existingCodes = new Set(enrollments.map((e) => e.code_cours));
        dataByEmail.forEach((e) => {
          if (!existingCodes.has(e.code_cours)) {
            enrollments.push(e);
            existingCodes.add(e.code_cours);
          }
        });
      }
    }

    if (!enrollments || enrollments.length === 0) {
      allStudentCourses = [];
      displayCourses([]);
      updateDashboardStats();
      return;
    }

    const courseCodes = enrollments.map((e) => e.code_cours);

    const { data: coursesData, error: coursesError } = await _supabase
      .from("cours")
      .select("*")
      .in("code_cours", courseCodes);

    if (coursesError) throw coursesError;

    allStudentCourses = coursesData || [];
    displayCourses(allStudentCourses);
    updateDashboardStats();
  } catch (err) {
    console.error("Erreur lors du chargement de vos cours :", err);
    container.innerHTML = `<p class="text-red-400 text-center py-8 text-xs">Erreur lors du chargement de vos cours.</p>`;
    ["stat-total-cours", "stat-cours-actifs", "stat-cours-acheves"].forEach(
      (id) => {
        const stat = document.getElementById(id);
        if (stat) stat.textContent = "—";
      },
    );
  }
}

function updateDashboardStats() {
  const totalCoursEl = document.getElementById("stat-total-cours");
  const coursActifsEl = document.getElementById("stat-cours-actifs");
  const coursAchevesEl = document.getElementById("stat-cours-acheves");

  if (totalCoursEl) totalCoursEl.innerText = allStudentCourses.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeCount = allStudentCourses.filter((c) => {
    const start = c.date_debut ? new Date(c.date_debut) : null;
    const end = c.date_fin ? new Date(c.date_fin) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(0, 0, 0, 0);
    return (!start || start <= today) && (!end || end >= today);
  }).length;
  const completedCount = allStudentCourses.filter((c) => {
    if (!c.date_fin) return false;
    const end = new Date(c.date_fin);
    end.setHours(0, 0, 0, 0);
    return end < today;
  }).length;

  if (coursActifsEl) coursActifsEl.innerText = activeCount;
  if (coursAchevesEl) coursAchevesEl.innerText = completedCount;
}

// ================= AFFICHAGE DES COURS AVEC BADGES =================
function displayCourses(courses) {
  const container = document.getElementById("modules-container");
  if (!container) return;

  if (courses.length === 0) {
    container.innerHTML = `<p class="text-zinc-500 text-center py-8 text-xs">Vous n'êtes inscrit à aucun cours pour le moment. Cliquez sur "Rejoindre un nouveau cours" pour commencer.</p>`;
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  container.innerHTML = courses
    .filter((course) => courseMatchesStatus(course, studentStatusFilter))
    .map((course) => {
      const startDate = course.date_debut ? new Date(course.date_debut) : null;
      const endDate = course.date_fin ? new Date(course.date_fin) : null;
      if (startDate) startDate.setHours(0, 0, 0, 0);
      if (endDate) endDate.setHours(0, 0, 0, 0);

      let badgeStatus = "";
      if (startDate && startDate > today) {
        badgeStatus = `<span class="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 font-medium">commence bientot</span>`;
      } else if (endDate && endDate < today) {
        badgeStatus = `<span class="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20 font-medium">fini</span>`;
      } else {
        badgeStatus = `<span class="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">en cours</span>`;
      }

      return `
            <div class="dashboard-hover-card bg-[#202020] border border-zinc-800 rounded-2xl 
            p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all">
                <div class="space-y-1.5 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-xs font-mono bg-brand/10 text-brand px-2.5 py-1 rounded-full border border-brand/20">${course.code_cours || "CODE"}</span>
                        ${badgeStatus}
                        <span class="text-xs text-zinc-400">• Classe : ${course.classe || "Non spécifiée"}</span>
                    </div>
                    <h3 class="text-base font-bold text-gray-100">${course.nom_cours}</h3>
                    <p class="text-xs text-zinc-400">Professeur : <span class="text-brand font-medium">${course.professeur?.toUpperCase() || "Professeur indisponible"}</span></p>
                    <p class="text-xs text-zinc-500">${course.professeur_email || "Professeur indisponible"}</p>
                    <p class="text-[11px] text-zinc-500">Période : Du ${course.date_debut || "---"} au ${course.date_fin || "---"}</p>
                </div>
                
                <div class="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
                    <button onclick="openViewCourseModal('${course.code_cours}', '${course.nom_cours.replace(/'/g, "\\'")}')" class="course-attendance-button px-3.5 py-2 
                    bg-brand/50 hover:bg-brand-hover text-brand hover:text-white rounded-xl text-xs font-bold transition-all border border-brand/50 cursor-pointer 
                    flex items-center gap-1.5">
                        <i class="fa-solid fa-eye"></i> Voir mes présences
                    </button>
                </div>
            </div>
        `;
    })
    .join("");
  applyStudentCourseControls(true);
}

let studentCoursePage = 1;

function applyStudentCourseControls(resetPage = false) {
  const container = document.getElementById("modules-container");
  const pagination = document.getElementById("student-pagination");
  const pageSizeInput = document.getElementById("student-page-size");
  if (!container || !pagination) return;
  if (resetPage) studentCoursePage = 1;

  const pageSize = Number(pageSizeInput?.value || 10);
  const cards = Array.from(container.children);
  const pageCount = Math.max(1, Math.ceil(cards.length / pageSize));
  studentCoursePage = Math.min(studentCoursePage, pageCount);
  const start = (studentCoursePage - 1) * pageSize;
  cards.forEach((card, index) =>
    card.classList.toggle("hidden", index < start || index >= start + pageSize),
  );
  pagination.innerHTML = `
        <span>${cards.length ? start + 1 : 0}-${Math.min(start + pageSize, cards.length)} sur ${cards.length}</span>
        <div class="flex gap-2">
            <button type="button" ${studentCoursePage === 1 ? "disabled" : ""} onclick="studentCoursePage--; applyStudentCourseControls()" class="px-3 py-1.5 bg-zinc-800 rounded-lg disabled:opacity-40">Précédent</button>
            <button type="button" ${studentCoursePage === pageCount ? "disabled" : ""} onclick="studentCoursePage++; applyStudentCourseControls()" class="px-3 py-1.5 bg-zinc-800 rounded-lg disabled:opacity-40">Suivant</button>
        </div>
    `;
}

function filterCourses(searchTerm) {
  const term = searchTerm.toLowerCase();
  const filtered = allStudentCourses.filter(
    (c) =>
      (c.nom_cours && c.nom_cours.toLowerCase().includes(term)) ||
      (c.code_cours && c.code_cours.toLowerCase().includes(term)) ||
      (c.professeur_email && c.professeur_email.toLowerCase().includes(term)) ||
      (c.professeur && c.professeur.toLowerCase().includes(term)) ||
      (c.classe && c.classe.toLowerCase().includes(term)),
  );
  displayCourses(filtered);
}

function searchStudentCourses() {
  const term =
    document.getElementById("search-cours")?.value.trim().toLowerCase() || "";
  filterCourses(term);
  if (!term) return;

  Array.from(
    document.querySelectorAll("#modules-container .dashboard-hover-card"),
  )
    .filter((card) => card.textContent.toLowerCase().includes(term))
    .forEach((card) => {
      card.classList.remove("search-highlight");
      void card.offsetWidth;
      card.classList.add("search-highlight");
      setTimeout(() => card.classList.remove("search-highlight"), 2000);
    });
}

function courseMatchesStatus(course, status) {
  if (status === "all") return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = course.date_debut ? new Date(course.date_debut) : null;
  const end = course.date_fin ? new Date(course.date_fin) : null;
  if (start) start.setHours(0, 0, 0, 0);
  if (end) end.setHours(0, 0, 0, 0);
  if (status === "upcoming") return start && start > today;
  if (status === "completed") return end && end < today;
  return (!start || start <= today) && (!end || end >= today);
}

function filterStudentCoursesByStatus(status) {
  studentStatusFilter = status;
  if (document.getElementById("content-cours")?.classList.contains("hidden")) {
    switchTab("cours");
  }
  setActiveDashboardStat(status);
  document.querySelectorAll("#student-dashboard-submenu [data-stat-filter]").forEach((item) => {
    const isActive = item.dataset.statFilter === status;
    item.toggleAttribute("aria-current", isActive);
    if (isActive) item.setAttribute("aria-current", "page");
  });
  displayCourses(allStudentCourses);
}

function getDatesBetween(startDateStr, endDateStr) {
  const dates = [];
  if (!startDateStr || !endDateStr) return dates;

  const [startYear, startMonth, startDay] = startDateStr.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDateStr.split("-").map(Number);
  const currentDate = new Date(startYear, startMonth - 1, startDay);
  const endDate = new Date(endYear, endMonth - 1, endDay);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

// ================= MODALE : VOIR LES PRÉSENCES DE L'ÉTUDIANT POUR UN COURS =================
async function openViewCourseModal(codeCours, courseName) {
  const modal = document.getElementById("view-course-modal");
  const titleEl = document.getElementById("view-course-title");
  const subtitleEl = document.getElementById("view-course-subtitle");
  const attendanceContainer = document.getElementById(
    "view-course-attendance-container",
  );

  if (!modal) return;

  titleEl.innerText = courseName;
  subtitleEl.innerText = `Code du cours : ${codeCours}`;
  attendanceContainer.innerHTML = `<p class="text-zinc-500 text-xs text-center py-6">${loadingMarkup("Chargement de votre historique de présences...")}</p>`;

  modal.classList.remove("hidden");

  try {
    const { data: course, error: courseError } = await _supabase
      .from("cours")
      .select("*")
      .eq("code_cours", codeCours)
      .single();

    if (courseError || !course)
      throw courseError || new Error("Cours introuvable");

    subtitleEl.innerText = `Registre officiel • Période : du ${course.date_debut || "---"} au ${course.date_fin || "---"} | Classe : ${course.classe || "Non renseignée"}`;

    const { data: attendanceData, error } = await _supabase
      .from("presences")
      .select("*")
      .eq("code_cours", codeCours);

    if (error) throw error;

    const studentAttendance = (attendanceData || []).filter(
      (att) =>
        (att.etudiant_id &&
          String(att.etudiant_id) === String(currentUser.id)) ||
        (att.email &&
          currentUser.email &&
          att.email.toLowerCase() === currentUser.email.toLowerCase()),
    );
    const attendanceMap = {};
    studentAttendance.forEach((att) => {
      attendanceMap[att.date] = att.statut;
    });
    const courseDates = getDatesBetween(course.date_debut, course.date_fin);
    const courseDateStrings = new Set(
      courseDates.map(
        (date) =>
          `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      ),
    );
    const courseAttendance = studentAttendance.filter((att) =>
      courseDateStrings.has(att.date),
    );
    const studiedDates = new Set(
      courseAttendance
        .filter((att) =>
          ["Présent", "present", "Absent", "absent"].includes(att.statut),
        )
        .map((att) => att.date),
    );
    const presentCount = courseAttendance.filter(
      (att) => att.statut === "Présent" || att.statut === "present",
    ).length;
    const attendedCount = courseAttendance.filter((att) =>
      ["Présent", "present", "Absent", "absent"].includes(att.statut),
    ).length;
    const percentage =
      attendedCount > 0
        ? Math.round((presentCount / attendedCount) * 100)
        : null;

    let html = `
            <div class="overflow-x-auto rounded-2xl border border-zinc-800 bg-[#191919]">
            <table class="w-full text-left border-collapse text-xs">
                <thead>
                    <tr class="border-b border-zinc-800 bg-[#222222]">
                        <th class="p-3.5 font-bold text-zinc-300 whitespace-nowrap">Nom complet</th>
                        <th class="p-3.5 font-bold text-zinc-300 whitespace-nowrap">Matricule</th>
                        <th class="p-3.5 font-bold text-brand text-center whitespace-nowrap">Taux de présence</th>
                        ${courseDates.map((date) => `<th class="p-3.5 font-mono font-bold text-brand text-center whitespace-nowrap border-l border-zinc-800">${date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}</th>`).join("")}
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-800">
        `;

    const fullName =
      `${currentUser.prenom || ""} ${currentUser.postnom || ""} ${currentUser.nom || ""}`
        .trim()
        .toUpperCase();
    html += `
                <tr class="hover:bg-zinc-800/30 transition-all">
                    <td class="p-3.5 font-bold text-gray-200 whitespace-nowrap">${fullName}</td>
                    <td class="p-3.5 font-mono text-zinc-400 whitespace-nowrap">${currentUser.matricule || "Non renseigné"}</td>
                    <td class="p-3.5 text-center whitespace-nowrap"><span class="px-2.5 py-1 rounded-full text-xs font-mono font-bold text-brand bg-brand/10 border border-brand/20">${percentage !== null ? percentage + "%" : "---"}</span></td>
                </tr>
        `;

    const rowStart = html.lastIndexOf("</tr>");
    const dateCells = courseDates
      .map((date) => {
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        const status = attendanceMap[dateStr];
        let cellContent = `<span class="text-zinc-500 italic">Non pris</span>`;
        if (status === "Présent" || status === "present")
          cellContent = `<span class="text-emerald-400 font-bold">Présent</span>`;
        if (status === "Absent" || status === "absent")
          cellContent = `<span class="text-red-400 font-bold">Absent</span>`;
        return `<td class="p-3.5 text-center whitespace-nowrap border-l border-zinc-800/60">${cellContent}</td>`;
      })
      .join("");
    html = html.slice(0, rowStart) + dateCells + html.slice(rowStart);

    html += `
                </tbody>
            </table>
            </div>
            <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div class="bg-[#191919] border border-zinc-800 rounded-xl p-3 text-zinc-300">Nombre total de jours du cours : <strong class="text-gray-100">${courseDates.length}</strong></div>
                <div class="bg-[#191919] border border-zinc-800 rounded-xl p-3 text-zinc-300">Jours étudiés : <strong class="text-gray-100">${studiedDates.size}</strong></div>
            </div>
        `;

    attendanceContainer.innerHTML = html;
  } catch (err) {
    console.error("Erreur chargement présences:", err);
    attendanceContainer.innerHTML = `<p class="text-red-400 text-xs text-center py-6">Erreur lors du chargement de vos présences.</p>`;
  }
}

function toggleViewCourseModal(show) {
  const modal = document.getElementById("view-course-modal");
  if (modal) {
    if (show) modal.classList.remove("hidden");
    else modal.classList.add("hidden");
  }
}

async function logout() {
  if (
    !(await showConfirmDialog("Voulez-vous vraiment vous déconnecter ?", {
      title: "Déconnexion",
      danger: false,
      confirmLabel: "Se déconnecter",
    }))
  )
    return;
  localStorage.removeItem("currentUser");
  localStorage.removeItem("smart-attendance-last-activity");
  localStorage.removeItem("smart-attendance-session-expired");
  window.location.href = "../login.html";
}

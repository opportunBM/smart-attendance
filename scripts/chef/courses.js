// État local des cours du département
let allCourses = [];
let chefStatusFilter = "all";
let allDepartmentStudents = [];
let chefCoursePage = 1;
let courseProfessors = [];

async function loadCourseClassOptions() {
  const facultySelect = document.getElementById("course-faculty");
  const classSelect = document.getElementById("course-class");
  if (!facultySelect || !classSelect || !currentUser?.departement_id) return;
  const facultyLoading = document.getElementById("course-faculty-loading");
  facultyLoading?.classList.remove("hidden");
  try {
    const { data: department, error: departmentError } = await _supabase
      .from("departements").select("id, nom").eq("id", currentUser.departement_id).single();
    if (departmentError) throw departmentError;
    facultySelect.innerHTML = `<option value="${department.id}">${department.nom}</option>`;
    facultySelect.dataset.departmentName = department.nom;
    const { data: classes, error } = await _supabase
      .from("classes").select("id, nom").eq("departement_id", department.id).order("nom");
    if (error) throw error;
    classSelect.innerHTML = '<option value="" disabled selected>Choisissez une classe</option>' +
      (classes || []).map((item) => `<option value="${item.id}" data-name="${item.nom}">${item.nom}</option>`).join("");
    classSelect.disabled = !(classes || []).length;
    await loadCourseProfessors();
  } finally {
    facultyLoading?.classList.add("hidden");
  }
}

async function loadCourseProfessors() {
  const options = document.getElementById("course-professor-options");
  if (!options) return;
  const { data: professors, error } = await _supabase
    .from("utilisateurs")
    .select("id, email, nom, postnom, prenom")
    .eq("role", "professeur")
    .order("nom");
  if (error) throw error;
  courseProfessors = professors || [];
  filterCourseProfessors(
    document.getElementById("course-professor-search")?.value || "",
  );
}

function initializeCourseProfessorPicker() {
  const picker = document.getElementById("course-professor-picker");
  const trigger = document.getElementById("course-professor-trigger");
  const dropdown = document.getElementById("course-professor-dropdown");
  const search = document.getElementById("course-professor-search");
  const options = document.getElementById("course-professor-options");
  const professorInput = document.getElementById("course-professor-email");
  const selectedLabel = document.getElementById("course-professor-selected");
  if (
    !picker ||
    !trigger ||
    !dropdown ||
    !search ||
    !options ||
    !professorInput ||
    !selectedLabel
  ) return;

  const closePicker = () => {
    dropdown.classList.add("hidden");
    trigger.setAttribute("aria-expanded", "false");
  };

  trigger.addEventListener("click", () => {
    const isOpening = dropdown.classList.contains("hidden");
    dropdown.classList.toggle("hidden", !isOpening);
    trigger.setAttribute("aria-expanded", String(isOpening));
    if (isOpening) {
      search.value = "";
      filterCourseProfessors("");
      search.focus();
    }
  });
  search.addEventListener("input", () =>
    filterCourseProfessors(search.value),
  );
  search.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePicker();
      trigger.focus();
    } else if (event.key === "Enter") {
      event.preventDefault();
      options.querySelector("button[data-professor-email]")?.click();
    }
  });
  options.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const option = target.closest("button[data-professor-email]");
    if (!(option instanceof HTMLButtonElement)) return;

    const email = option.dataset.professorEmail;
    const professor = courseProfessors.find((item) => item.email === email);
    if (!professor || !email) return;
    professorInput.value = email;
    selectedLabel.textContent = `${[professor.prenom, professor.nom]
      .filter(Boolean)
      .join(" ")}${professor.prenom || professor.nom ? " — " : ""}${email}`;
    selectedLabel.classList.remove("text-zinc-400");
    selectedLabel.classList.add("text-gray-200");
    closePicker();
    trigger.focus();
  });
  document.addEventListener("click", (event) => {
    if (event.target instanceof Node && !picker.contains(event.target)) {
      closePicker();
    }
  });
}

function filterCourseProfessors(searchTerm) {
  const options = document.getElementById("course-professor-options");
  const professorInput = document.getElementById("course-professor-email");
  if (!options || !professorInput) return;

  const term = searchTerm.trim().toLowerCase();
  const matchingProfessors = courseProfessors.filter((professor) =>
    (professor.email || "").toLowerCase().includes(term),
  );
  options.replaceChildren();
  if (!matchingProfessors.length) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "px-3 py-2 text-xs text-zinc-500";
    emptyMessage.textContent = term
      ? "Aucun professeur correspondant."
      : "Aucun professeur disponible.";
    options.appendChild(emptyMessage);
    return;
  }

  matchingProfessors.forEach((professor) => {
    const option = document.createElement("button");
    option.type = "button";
    option.setAttribute("role", "option");
    option.setAttribute(
      "aria-selected",
      String(professor.email === professorInput.value),
    );
    option.dataset.professorEmail = professor.email || "";
    option.className =
      "w-full rounded-lg px-3 py-2 text-left text-sm text-gray-200 hover:bg-zinc-800 focus:bg-zinc-800 focus:outline-none";
    const name = [professor.prenom, professor.nom].filter(Boolean).join(" ");
    option.textContent = `${name ? `${name} — ` : ""}${professor.email || ""}`;
    options.appendChild(option);
  });
}

function toggleCourseModal(show) {
  const modal = document.getElementById("course-modal");
  if (!modal) return;
  modal.classList.toggle("hidden", !show);
}

async function handleCourseCreation(e) {
  e.preventDefault();

  if (!currentUser || currentUser.role !== "chef_departement") {
    showNotification("Action non autorisée.", "error");
    return;
  }

  const formElement = e.target;
  const submitBtn =
    formElement.querySelector('button[type="submit"]') ||
    document.getElementById("submit-course-btn");
  const originalBtnText = submitBtn ? submitBtn.innerHTML : "Créer le cours";

  try {
    const nom_cours = document.getElementById("course-name").value.trim();
    const annee_academique = document
      .getElementById("course-year")
      .value.trim();
    const code_cours = document.getElementById("course-code").value.trim();
    const departmentId = document.getElementById("course-faculty").value;
    const facultySelect = document.getElementById("course-faculty");
    const faculte = facultySelect.selectedOptions[0]?.textContent.trim();
    const classSelect = document.getElementById("course-class");
    const classeId = classSelect.value;
      const classe = classSelect.selectedOptions[0]?.textContent.trim();
    const date_debut = document.getElementById("course-start-date").value;
    const date_fin = document.getElementById("course-end-date").value;
    const code_enregistrement = document
      .getElementById("course-enrollment-code")
      .value.trim();
    const professeur_email = document.getElementById("course-professor-email").value;

    // On refuse les dates de début déjà passées
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(date_debut);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date_fin);
    endDate.setHours(0, 0, 0, 0);

    if (startDate < today) {
      showNotification(
        "Erreur : Il est interdit de mettre une date de début déjà passée.",
        "error",
      );
      return;
    }
    if (endDate < startDate) {
      showNotification(
        "Erreur : La date de fin ne peut pas être antérieure à la date de début.",
        "error",
      );
      return;
    }
    if (!professeur_email) {
      showNotification(
        "L'e-mail du professeur assigné est obligatoire.",
        "error",
      );
      return;
    }
    if (!departmentId || !classeId) {
      showNotification("Sélectionnez un département et une classe valides.", "error");
      return;
    }
    const professorConfirmation = `Cours : ${nom_cours}\nCode : ${code_cours}\nDépartement : ${faculte}\nClasse : ${classe}\nProfesseur : ${professeur_email}\nPériode : du ${date_debut} au ${date_fin}`;
    if (!(await showConfirmDialog(professorConfirmation.replace(/\n/g, "<br>"), {
      title: "Confirmer la création du cours",
      danger: false,
      confirmLabel: "Créer le cours",
    }))) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-spinner animate-spin mr-2"></i> Création en cours...`;
      submitBtn.classList.add("opacity-75", "cursor-not-allowed");
    }

    const { data: profData, error: profError } = await _supabase
      .from("utilisateurs")
      .select("*")
      .eq("email", professeur_email)
      .eq("role", "professeur")
      .single();

    if (profError || !profData) {
      showNotification(
        "Aucun professeur trouvé avec cette adresse e-mail.",
        "error",
      );
      return;
    }

    const { error } = await _supabase.from("cours").insert([
      {
        nom_cours,
        annee_academique,
        code_cours,
        faculte,
        classe,
        date_debut,
        date_fin,
        code_enregistrement,
        professeur_id: profData.id,
        professeur_email,
        professeur: `${profData.prenom} ${profData.nom}`,
        chef_id: currentUser.id,
        departement_id: departmentId,
        classe_id: classeId,
      },
    ]);

    if (error) throw error;

    if (typeof createNotification === "function") {
      await createNotification({
        userId: profData.id,
        type: "course_assigned",
        title: "Nouveau cours assigné",
        message: `Le cours ${nom_cours} (${code_cours}) vous a été assigné.`,
      });
    }

    if (typeof sendNotificationEmail === "function" && profData.email) {
      try {
        await sendNotificationEmail({
          toEmail: profData.email,
          toName: `${profData.prenom || ""} ${profData.nom || ""}`.trim(),
          subject: `Nouveau cours assigné : ${nom_cours}`,
          message: `Un nouveau cours vous a été assigné. Cours : ${nom_cours}. Code : ${code_cours}. Classe : ${classe}. Département : ${faculte}. Période : du ${date_debut} au ${date_fin}.`,
          actionUrl: new URL("../admin/profDashboard.html", document.baseURI)
            .href,
        });
      } catch (emailError) {
        console.warn(
          "Cours créé, mais e-mail professeur non envoyé :",
          emailError,
        );
      }
    }

    showNotification("Cours créé avec succès");
    toggleCourseModal(false);
    formElement.reset();
    await loadCourseClassOptions();
    loadDepartmentCourses();
  } catch (err) {
    console.error("Erreur lors de la création du cours :", err);
    showNotification("Erreur lors de la création du cours.", "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
      submitBtn.classList.remove("opacity-75", "cursor-not-allowed");
    }
  }
}

async function loadDepartmentCourses() {
  const container = document.getElementById("modules-container");
  if (!container) return;
  container.innerHTML = `<p class="text-zinc-500 text-center py-8 text-xs">${loadingMarkup("Chargement de vos cours...")}</p>`;
  [
    "stat-total-cours",
    "stat-cours-actifs",
    "stat-cours-acheves",
    "stat-cours-futurs",
    "stat-total-eleves",
  ].forEach((id) => {
    const stat = document.getElementById(id);
    if (stat) stat.innerHTML = loadingMarkup("", "sa-loading--compact");
  });

  try {
    const { data, error } = await _supabase
      .from("cours")
      .select("*")
      .eq("chef_id", currentUser.id);
    if (error) throw error;

    allCourses = data || [];
    const courseCodes = allCourses
      .map((course) => course.code_cours)
      .filter(Boolean);
    const { data: enrollmentRows, error: enrollmentError } = courseCodes.length
      ? await _supabase
          .from("inscriptions")
          .select("code_cours, etudiant_id, etudiant_email")
          .in("code_cours", courseCodes)
      : { data: [], error: null };

    if (enrollmentError) throw enrollmentError;

    const enrolledByCourse = {};
    (enrollmentRows || []).forEach((enrollment) => {
      if (!enrolledByCourse[enrollment.code_cours]) {
        enrolledByCourse[enrollment.code_cours] = new Set();
      }
      const studentKey = enrollment.etudiant_id || enrollment.etudiant_email;
      if (studentKey) enrolledByCourse[enrollment.code_cours].add(studentKey);
    });
    allCourses = allCourses.map((course) => ({
      ...course,
      enrolled_student_count: enrolledByCourse[course.code_cours]?.size || 0,
    }));

    const professorEmails = [
      ...new Set(
        allCourses.map((course) => course.professeur_email).filter(Boolean),
      ),
    ];

    if (professorEmails.length > 0) {
      const { data: professors, error: professorsError } = await _supabase
        .from("utilisateurs")
        .select("email, matricule")
        .eq("role", "professeur")
        .in("email", professorEmails);
      if (professorsError) throw professorsError;
      const professorMatricules = Object.fromEntries(
        (professors || []).map((p) => [p.email, p.matricule]),
      );
      allCourses = allCourses.map((course) => ({
        ...course,
        professeur_matricule:
          professorMatricules[course.professeur_email] || null,
      }));
    }

    await loadDepartmentStudentsForStats();
    displayCourses(allCourses);
    updateDashboardStats();
  } catch (err) {
    console.error("Erreur lors du chargement des cours :", err);
    container.innerHTML = `<p class="text-red-400 text-center py-8 text-xs">Erreur lors du chargement de vos cours.</p>`;
    [
      "stat-total-cours",
      "stat-cours-actifs",
      "stat-cours-acheves",
      "stat-cours-futurs",
      "stat-total-eleves",
    ].forEach((id) => {
      const stat = document.getElementById(id);
      if (stat) stat.textContent = "—";
    });
  }
}

async function loadDepartmentStudentsForStats() {
  let query = _supabase
    .from("utilisateurs")
    .select(
      "id, role, nom, postnom, prenom, matricule, faculte, annee_etude, email, photo_profil, card_code",
    )
    .eq("role", "etudiant");
  if (currentUser.faculte) query = query.eq("faculte", currentUser.faculte);
  const { data, error } = await query;
  if (error) throw error;
  allDepartmentStudents = data || [];
}

function updateDashboardStats() {
  const stats = countCourseStats(allCourses);
  const totalCoursEl = document.getElementById("stat-total-cours");
  const coursActifsEl = document.getElementById("stat-cours-actifs");
  const coursAchevesEl = document.getElementById("stat-cours-acheves");
  const coursFutursEl = document.getElementById("stat-cours-futurs");
  const totalElevesEl = document.getElementById("stat-total-eleves");

  if (totalCoursEl) totalCoursEl.innerText = allCourses.length;
  if (coursActifsEl) coursActifsEl.innerText = stats.active;
  if (coursAchevesEl) coursAchevesEl.innerText = stats.completed;
  if (coursFutursEl) coursFutursEl.innerText = stats.upcoming;
  if (totalElevesEl) totalElevesEl.innerText = allDepartmentStudents.length;
}

function displayCourses(courses) {
  const container = document.getElementById("modules-container");
  if (!container) return;

  if (courses.length === 0) {
    container.innerHTML = `<p class="text-zinc-500 text-center py-8 text-xs">Aucun cours trouvé.</p>`;
    return;
  }

  container.innerHTML = courses
    .map((course) => {
      const badgeStatus = getCourseStatusBadge(course);
      return `
            <div class="dashboard-hover-card bg-[#202020] border border-zinc-800 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all">
                <div class="space-y-1.5 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-xs font-mono bg-brand/10 text-brand px-2.5 py-1 rounded-full border border-brand/20">${course.code_cours || "CODE"}</span>
                        ${badgeStatus}
                        <span class="text-xs text-zinc-400">• Classe : ${course.classe || "Non spécifiée"}</span>
                    </div>
                    <h3 class="text-base font-bold text-gray-100">${course.nom_cours}</h3>
                    <p class="text-xs text-zinc-400">Professeur : <span class="text-brand font-medium">${course.professeur?.toUpperCase() || "Professeur indisponible"}</span></p>
                    <p class="text-xs text-zinc-500">${course.professeur_email || "Professeur indisponible"}</p>
                    <p class="text-xs text-zinc-500">Matricule : ${course.professeur_matricule || "Non renseigné"}</p>
                    <p class="text-xs text-zinc-400">Élèves inscrits : <span class="text-zinc-200 font-semibold">${course.enrolled_student_count || 0}</span></p>
                    <p class="text-xs text-zinc-400">Année académique : <span class="text-zinc-200 font-medium">${course.annee_academique || "Non spécifiée"}</span></p>
                    <p class="text-[11px] text-zinc-500">Période : Du ${course.date_debut || "---"} au ${course.date_fin || "---"}</p>
                </div>
                <div class="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
                    <button onclick="openViewCourseModal('${course.id}')" class="course-view-button px-3.5 py-2 bg-zinc-500 hover:bg-brand-hover 
                    text-brand hover:text-white rounded-xl text-xs font-bold transition-all border border-brand/30 cursor-pointer flex items-center gap-1.5">
                        <i class="fa-solid fa-eye"></i> Voir le registre
                    </button>
                    <button onclick="openManageCourseModal('${course.id}')" class="course-manage-button px-3.5 py-2 bg-zinc-900 hover:bg-zinc-700 text-zinc-200 
                    rounded-xl text-xs font-bold transition-all border border-zinc-700 cursor-pointer flex items-center gap-1.5">
                        <i class="fa-solid fa-gear"></i> Gérer le cours
                    </button>
                    <button onclick="deleteChefCourse('${course.id}')" class="px-3.5 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 
                    hover:text-white rounded-xl text-xs font-bold transition-all border border-red-500/30 cursor-pointer flex items-center gap-1.5">
                        <i class="fa-solid fa-trash"></i> Supprimer
                    </button>
                </div>
            </div>
        `;
    })
    .join("");
  applyChefCourseControls(true);
}

async function deleteChefCourse(courseId) {
  if (!currentUser || currentUser.role !== "chef_departement") {
    showNotification("Action non autorisée.", "error");
    return;
  }

  const course = allCourses.find((item) => item.id === courseId);
  if (!course) {
    showNotification("Cours introuvable.", "error");
    return;
  }

  const safeCourseText = (value) => {
    const element = document.createElement("div");
    element.textContent = value ?? "";
    return element.innerHTML;
  };
  const confirmation = await showConfirmDialog(
    `<strong>ATTENTION : suppression définitive</strong><br><br>
     Vous êtes sur le point de supprimer le cours
     <strong>${safeCourseText(course.nom_cours || "sans nom")}</strong>
     (code : <strong>${safeCourseText(course.code_cours || "non renseigné")}</strong>).<br><br>
     Cette action supprimera définitivement le cours, toutes les inscriptions des élèves,
     toutes les présences et toutes les informations associées. Elle est irréversible.`,
    {
      title: "Supprimer définitivement le cours ?",
      danger: true,
      confirmLabel: "Supprimer définitivement",
    },
  );
  if (!confirmation) return;

  try {
    if (course.code_cours) {
      const { error: attendanceError } = await _supabase
        .from("presences")
        .delete()
        .eq("code_cours", course.code_cours);
      if (attendanceError) throw attendanceError;

      const { error: enrollmentError } = await _supabase
        .from("inscriptions")
        .delete()
        .eq("code_cours", course.code_cours);
      if (enrollmentError) throw enrollmentError;
    }

    const { error: courseError } = await _supabase
      .from("cours")
      .delete()
      .eq("id", course.id)
      .eq("chef_id", currentUser.id);
    if (courseError) throw courseError;

    showNotification("Cours et toutes ses données supprimés définitivement.");
    await loadDepartmentCourses();
  } catch (error) {
    console.error("Erreur lors de la suppression du cours :", error);
    showNotification("Suppression impossible. Veuillez réessayer.", "error");
  }
}

function applyChefCourseControls(resetPage = false) {
  const container = document.getElementById("modules-container");
  const pagination = document.getElementById("chef-course-pagination");
  const pageSizeInput = document.getElementById("chef-course-page-size");
  const search = document.getElementById("search-cours");
  if (!container || !pagination) return;

  if (resetPage) chefCoursePage = 1;
  const term = (search?.value || "").trim().toLowerCase();
  const cards = Array.from(container.children).filter(
    (card) =>
      card.textContent.toLowerCase().includes(term) &&
      courseMatchesStatus(cardCourseLookup(card), chefStatusFilter),
  );
  const pageSize = Number(pageSizeInput?.value || 10);
  const pageCount = Math.max(1, Math.ceil(cards.length / pageSize));
  chefCoursePage = Math.min(chefCoursePage, pageCount);
  const start = (chefCoursePage - 1) * pageSize;
  const visibleCards = new Set(cards.slice(start, start + pageSize));
  Array.from(container.children).forEach((card) =>
    card.classList.toggle("hidden", !visibleCards.has(card)),
  );

  pagination.innerHTML = `<span>${cards.length ? start + 1 : 0}-${Math.min(start + pageSize, cards.length)} sur ${cards.length}</span><div class="flex gap-2"><button type="button" ${chefCoursePage === 1 ? "disabled" : ""} onclick="chefCoursePage--; applyChefCourseControls()" class="px-3 py-1.5 bg-zinc-800 rounded-lg disabled:opacity-40">Précédent</button><button type="button" ${chefCoursePage === pageCount ? "disabled" : ""} onclick="chefCoursePage++; applyChefCourseControls()" class="px-3 py-1.5 bg-zinc-800 rounded-lg disabled:opacity-40">Suivant</button></div>`;
}

function cardCourseLookup(card) {
  return allCourses.find((course) =>
    card.textContent.includes(course.nom_cours),
  );
}

function filterChefCoursesByStatus(status) {
  chefStatusFilter = status;
  switchTab("cours");
  setActiveDashboardStat(status);
  document
    .querySelectorAll("#chef-dashboard-submenu [data-stat-filter]")
    .forEach((button) => {
      if (button.dataset.statFilter === status) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });
  applyChefCourseControls(true);
}

function filterCourses(searchTerm) {
  const term = searchTerm.toLowerCase();
  const filtered = allCourses.filter(
    (c) =>
      (c.nom_cours && c.nom_cours.toLowerCase().includes(term)) ||
      (c.code_cours && c.code_cours.toLowerCase().includes(term)) ||
      (c.professeur_email && c.professeur_email.toLowerCase().includes(term)) ||
      (c.professeur && c.professeur.toLowerCase().includes(term)) ||
      (c.classe && c.classe.toLowerCase().includes(term)),
  );
  displayCourses(filtered);
}

function searchChefCourses() {
  const search = document.getElementById("search-cours");
  const term = search?.value.trim().toLowerCase() || "";
  filterCourses(term);
  if (!term) return;

  const matchingCards = Array.from(
    document.querySelectorAll("#modules-container .dashboard-hover-card"),
  ).filter((card) => card.textContent.toLowerCase().includes(term));
  matchingCards.forEach((card) => {
    card.classList.remove("search-highlight");
    void card.offsetWidth;
    card.classList.add("search-highlight");
    setTimeout(() => card.classList.remove("search-highlight"), 2000);
  });
}

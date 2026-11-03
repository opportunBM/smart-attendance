// Liste des cours assignés au professeur
let professorCourses = [];
let professorStatusFilter = "all";
let professorCoursePage = 1;

async function loadProfessorCours() {
  const container = document.getElementById("modules-container");
  if (!container) return;
  container.innerHTML = `<p class="text-zinc-500 text-center py-8 text-xs">${loadingMarkup("Chargement de vos cours assignés...")}</p>`;
  [
    "stat-total-cours",
    "stat-cours-actifs",
    "stat-cours-acheves",
    "stat-cours-futurs",
  ].forEach((id) => {
    const stat = document.getElementById(id);
    if (stat) stat.innerHTML = loadingMarkup("", "sa-loading--compact");
  });

  try {
    const { data: courses, error } = await _supabase
      .from("cours")
      .select("*")
      .eq("professeur_id", currentUser.id);
    if (error) throw error;

    professorCourses = courses || [];

    if (!courses || courses.length === 0) {
      updateProfessorDashboardStats();
      container.innerHTML = `<p class="text-zinc-500 text-xs text-center py-6">Aucun cours ne vous a encore été assigné par le chef de département.</p>`;
      return;
    }

    container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-left" id="prof-courses-grid"></div>`;
    const gridContainer = document.getElementById("prof-courses-grid");

    for (const course of courses) {
      const { data: enrollData, error: enrollError } = await _supabase
        .from("inscriptions")
        .select("etudiant_id, etudiant_email")
        .eq("code_cours", course.code_cours);
      if (enrollError) throw enrollError;
      const studentIds = (enrollData || [])
        .map((enrollment) => enrollment.etudiant_id)
        .filter(Boolean);
      const studentEmails = (enrollData || [])
        .map((enrollment) => enrollment.etudiant_email)
        .filter(Boolean);
      const enrolledStudents = new Set();

      if (studentIds.length) {
        const { data: studentsById, error: studentsByIdError } = await _supabase
          .from("utilisateurs")
          .select("id")
          .eq("role", "etudiant")
          .in("id", studentIds);
        if (studentsByIdError) throw studentsByIdError;
        (studentsById || []).forEach((student) =>
          enrolledStudents.add(student.id),
        );
      }
      if (studentEmails.length) {
        const { data: studentsByEmail, error: studentsByEmailError } = await _supabase
          .from("utilisateurs")
          .select("id, email")
          .eq("role", "etudiant")
          .in("email", studentEmails);
        if (studentsByEmailError) throw studentsByEmailError;
        (studentsByEmail || []).forEach((student) =>
          enrolledStudents.add(student.id || student.email),
        );
      }
      const studentCount = enrolledStudents.size;

      const card = document.createElement("div");
      card.className =
        "dashboard-hover-card course-card bg-[#191919] border border-zinc-800 p-5 rounded-2xl shadow-md transition-all flex flex-col justify-between";
      const hasEnrolledStudents = studentCount > 0;
      card.innerHTML = `
                <div>
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-xs font-mono bg-brand/10 text-brand px-2.5 py-1 rounded-full border border-brand/20">${course.code_cours || "CODE"}</span>
                        <span class="text-xs font-mono bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-full border border-zinc-700">Code d'accès : <strong class="text-brand">${course.code_enregistrement || "Non renseigné"}</strong></span>
                    </div>
                    <h4 class="text-base font-bold text-gray-100 mb-1">${course.nom_cours}</h4>
                    <p class="text-xs text-zinc-400 mb-3"><i class="fa-solid fa-graduation-cap mr-1.5 text-brand"></i> ${course.faculte || "Département"} - ${course.classe || "Classe"}</p>
                    <p class="text-xs text-zinc-400 mb-3">Année académique : <span class="text-zinc-200 font-medium">${course.annee_academique || "Non spécifiée"}</span></p>
                    <div class="flex items-center gap-1.5 text-xs text-zinc-300 mb-4 bg-zinc-900/60 px-3 py-2 rounded-xl border border-zinc-800/80">
                        <i class="fa-solid fa-users text-brand"></i>
                        <span>Étudiants inscrits : <strong class="text-gray-100">${studentCount}</strong></span>
                    </div>
                </div>
                <div class="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2 flex-wrap">
                    <span class="text-[11px] text-zinc-500">Du ${course.date_debut || "---"} au ${course.date_fin || "---"}</span>
                    <div class="flex items-center gap-2 flex-wrap">
                        <button onclick='openAttendanceRegisterModal(${JSON.stringify(course)})' class="professor-register-button px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 
                        rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5">
                            <i class="fa-solid fa-table-list"></i> Registre
                        </button>
                        <button onclick='openLiveAttendanceIfStudents(${JSON.stringify(course)})' class="px-3 py-2 ${
                          hasEnrolledStudents
                            ? "bg-brand hover:bg-brand-hover cursor-pointer"
                            : "bg-zinc-700 cursor-not-allowed opacity-60"
                        } text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5">
                            <i class="fa-solid fa-clipboard-user"></i> Faire l'appel
                        </button>
                    </div>
                </div>`;
      gridContainer.appendChild(card);
    }

    updateProfessorDashboardStats();
    applyProfessorCourseControls(true);
  } catch (err) {
    console.error("Erreur de chargement des cours :", err);
    container.innerHTML = `<p class="text-red-400 text-xs text-center py-6">Impossible de charger vos cours assignés.</p>`;
    [
      "stat-total-cours",
      "stat-cours-actifs",
      "stat-cours-acheves",
      "stat-cours-futurs",
    ].forEach((id) => {
      const stat = document.getElementById(id);
      if (stat) stat.textContent = "—";
    });
  }
}

async function openLiveAttendanceIfStudents(course) {
  const { data, error } = await _supabase
    .from("inscriptions")
    .select("etudiant_id, etudiant_email")
    .eq("code_cours", course.code_cours);

  if (error) {
    console.error("Erreur vérification des inscriptions :", error.message);
    showNotification("Impossible de vérifier les étudiants inscrits.", "error");
    return;
  }

  const studentKeys = new Set();
  (data || []).forEach((enrollment) => {
    if (enrollment.etudiant_id) studentKeys.add(enrollment.etudiant_id);
    if (enrollment.etudiant_email) studentKeys.add(enrollment.etudiant_email);
  });

  if (studentKeys.size === 0) {
    showNotification(
      "Impossible de lancer l'appel : aucun étudiant n'est inscrit à ce cours.",
      "error",
    );
    return;
  }

  await openLiveAttendanceModal(course);
}

function updateProfessorDashboardStats() {
  const stats = countCourseStats(professorCourses);
  const totalCoursEl = document.getElementById("stat-total-cours");
  const coursActifsEl = document.getElementById("stat-cours-actifs");
  const coursAchevesEl = document.getElementById("stat-cours-acheves");
  const coursFutursEl = document.getElementById("stat-cours-futurs");

  if (totalCoursEl) totalCoursEl.innerText = professorCourses.length;
  if (coursActifsEl) coursActifsEl.innerText = stats.active;
  if (coursAchevesEl) coursAchevesEl.innerText = stats.completed;
  if (coursFutursEl) coursFutursEl.innerText = stats.upcoming;
}

function applyProfessorCourseControls(resetPage = false) {
  const grid = document.getElementById("prof-courses-grid");
  const pagination = document.getElementById("prof-pagination");
  const search = document.getElementById("search-cours");
  const pageSizeInput = document.getElementById("prof-page-size");
  if (!grid || !pagination) return;
  if (resetPage) professorCoursePage = 1;

  const term = (search?.value || "").trim().toLowerCase();
  const cards = Array.from(grid.children).filter(
    (card) =>
      card.textContent.toLowerCase().includes(term) &&
      courseMatchesStatus(
        professorCourses.find((c) => card.textContent.includes(c.nom_cours)),
        professorStatusFilter,
      ),
  );
  const pageSize = Number(pageSizeInput?.value || 10);
  const pageCount = Math.max(1, Math.ceil(cards.length / pageSize));
  professorCoursePage = Math.min(professorCoursePage, pageCount);
  const start = (professorCoursePage - 1) * pageSize;
  const visibleCards = new Set(cards.slice(start, start + pageSize));
  Array.from(grid.children).forEach((card) =>
    card.classList.toggle("hidden", !visibleCards.has(card)),
  );

  pagination.innerHTML = `
        <span>${cards.length ? start + 1 : 0}-${Math.min(start + pageSize, cards.length)} sur ${cards.length}</span>
        <div class="flex gap-2">
            <button type="button" ${professorCoursePage === 1 ? "disabled" : ""} onclick="professorCoursePage--; applyProfessorCourseControls()" class="px-3 py-1.5 bg-zinc-800 rounded-lg disabled:opacity-40">Précédent</button>
            <button type="button" ${professorCoursePage === pageCount ? "disabled" : ""} onclick="professorCoursePage++; applyProfessorCourseControls()" class="px-3 py-1.5 bg-zinc-800 rounded-lg disabled:opacity-40">Suivant</button>
        </div>`;
}

function searchProfessorCourses() {
  applyProfessorCourseControls(true);
  const term =
    document.getElementById("search-cours")?.value.trim().toLowerCase() || "";
  if (!term) return;

  Array.from(
    document.querySelectorAll("#prof-courses-grid .dashboard-hover-card"),
  )
    .filter(
      (card) =>
        !card.classList.contains("hidden") &&
        card.textContent.toLowerCase().includes(term),
    )
    .forEach((card) => {
      card.classList.remove("search-highlight");
      void card.offsetWidth;
      card.classList.add("search-highlight");
      setTimeout(() => card.classList.remove("search-highlight"), 2000);
    });
}

function filterProfessorCoursesByStatus(status) {
  professorStatusFilter = status;
  if (document.getElementById("content-cours")?.classList.contains("hidden")) {
    switchTab("cours");
  }
  setActiveDashboardStat(status);
  document
    .querySelectorAll("#prof-dashboard-submenu [data-stat-filter]")
    .forEach((item) => {
      const isActive = item.dataset.statFilter === status;
      item.toggleAttribute("aria-current", isActive);
      if (isActive) item.setAttribute("aria-current", "page");
    });
  applyProfessorCourseControls(true);
}

let users = [];
let courses = [];
let enrollments = [];
let attendances = [];
let departments = [];
let academicClasses = [];
let pendingChefs = [];
let pendingProfessors = [];
let administrativeCodes = { professor: null, chef: null };
let oldAdministrativeCodes = [];
let currentDepartment = null;
let currentClass = null;
let currentTab = "departements";

document.addEventListener("DOMContentLoaded", initializeAdminDashboard);

async function initializeAdminDashboard() {
  if (
    !guardRole(
      "administrateur",
      "../login.html",
      "Accès refusé : cette page est réservée à l’administrateur.",
    )
  ) {
    return;
  }
  bindAdminEvents();
  await loadAdminData();
  window.setInterval(() => loadAdministrativeCodes({ silent: true }), 10000);
}

function bindAdminEvents() {
  const departmentSearch = document.getElementById("department-search");
  departmentSearch.addEventListener("input", renderDepartments);
  document
    .getElementById("department-search-button")
    ?.addEventListener("click", searchAdminDepartments);
  departmentSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") searchAdminDepartments();
  });
  document
    .getElementById("professor-search")
    ?.addEventListener("input", renderProfessors);
  document
    .getElementById("professor-search-button")
    ?.addEventListener("click", searchAdminProfessors);
  document.getElementById("professor-search")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") searchAdminProfessors();
  });
  document
    .getElementById("chef-search")
    ?.addEventListener("input", renderChefs);
  document
    .getElementById("chef-search-button")
    ?.addEventListener("click", searchAdminChefs);
  document.getElementById("chef-search")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") searchAdminChefs();
  });
  document
    .getElementById("refresh-admin-codes")
    ?.addEventListener("click", (event) =>
      runRefreshAnimation(event.currentTarget, () =>
        loadAdministrativeCodes(),
      ),
    );
  document.getElementById("show-old-codes")?.addEventListener("click", () => {
    document.getElementById("old-codes-panel")?.classList.toggle("hidden");
    loadAdministrativeCodeHistory();
  });
  document
    .getElementById("refresh-old-codes")
    ?.addEventListener("click", (event) =>
      runRefreshAnimation(event.currentTarget, loadAdministrativeCodeHistory),
    );
  document.getElementById("open-create-department")?.addEventListener("click", openCreateDepartmentModal);
  document.getElementById("create-department-form")?.addEventListener("submit", createDepartment);
  document.getElementById("new-department-class-count")?.addEventListener("change", renderDepartmentClassInputs);
  document.getElementById("add-class-form")?.addEventListener("submit", addClassToDepartment);
}

async function runRefreshAnimation(button, refreshTask) {
  if (!button || button.classList.contains("is-refreshing")) return;
  button.classList.add("is-refreshing");
  button.disabled = true;
  try {
    await refreshTask();
  } finally {
    button.disabled = false;
    button.classList.remove("is-refreshing");
  }
}

async function refreshPendingRegistrations(button) {
  await runRefreshAnimation(button, loadPendingRegistrations);
}

function searchAdminDepartments() {
  const search = document.getElementById("department-search");
  const term = search?.value.trim().toLowerCase() || "";
  renderDepartments();
  if (!term) return;

  const matchingCards = Array.from(
    document.querySelectorAll("#departments-container .dashboard-hover-card"),
  ).filter((card) => card.textContent.toLowerCase().includes(term));
  matchingCards.forEach((card) => {
    card.classList.remove("search-highlight");
    void card.offsetWidth;
    card.classList.add("search-highlight");
    setTimeout(() => card.classList.remove("search-highlight"), 2000);
  });
}

function highlightSearchResults(containerSelector, inputId) {
  const term = document.getElementById(inputId)?.value.trim().toLowerCase() || "";
  if (!term) return;
  Array.from(document.querySelectorAll(`${containerSelector} .dashboard-hover-card, ${containerSelector} > button`))
    .filter((card) => card.textContent.toLowerCase().includes(term))
    .forEach((card) => {
      card.classList.remove("search-highlight");
      void card.offsetWidth;
      card.classList.add("search-highlight");
      setTimeout(() => card.classList.remove("search-highlight"), 2000);
    });
}

function searchAdminProfessors() {
  renderProfessors();
  highlightSearchResults("#professors-container", "professor-search");
}

function searchAdminChefs() {
  renderChefs();
  highlightSearchResults("#chefs-container", "chef-search");
}

async function loadAdminData() {
  showLoadingState();

  const [usersResult, coursesResult, enrollmentsResult, attendancesResult, departmentsResult, classesResult] =
    await Promise.all([
      _supabase
        .from("utilisateurs")
        .select(
          "id, role, nom, postnom, prenom, matricule, faculte, annee_etude, email, photo_profil, code_administratif, date_creation, departement_id, classe_id",
        ),
      _supabase.from("cours").select("*"),
      _supabase.from("inscriptions").select("*"),
      _supabase.from("presences").select("*"),
      _supabase.from("departements").select("*").order("nom"),
      _supabase.from("classes").select("*").order("nom"),
    ]);

  if (usersResult.error) {
    showNotification("Impossible de charger les utilisateurs.", "error");
  }
  if (coursesResult.error) {
    showNotification("Impossible de charger les cours.", "error");
  }
  if (enrollmentsResult.error) {
    showNotification("Impossible de charger les inscriptions.", "error");
  }
  if (attendancesResult.error) {
    showNotification("Impossible de charger les présences.", "error");
  }
  if (departmentsResult.error) {
    showNotification("Impossible de charger les départements.", "error");
  }
  if (classesResult.error) {
    showNotification("Impossible de charger les classes.", "error");
  }

  users = usersResult.data || [];
  courses = coursesResult.data || [];
  enrollments = enrollmentsResult.data || [];
  attendances = attendancesResult.data || [];
  academicClasses = classesResult.data || [];

  buildDepartments(departmentsResult.data || []);
  populateClassDepartmentSelect();
  renderDepartments();
  renderProfessors();
  renderChefs();
  updateStats();
  await loadPendingRegistrations();
  await loadAdministrativeCodes();
  await loadAdministrativeCodeHistory({ silent: true });
}

async function loadAdministrativeCodeHistory({ silent = false } = {}) {
  const container = document.getElementById("old-codes-container");
  if (!silent && container) container.innerHTML = loadingState();

  const { data, error } = await _supabase
    .from("codes_admin_historique")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    if (!silent) {
      if (container) {
        container.innerHTML =
          '<p class="text-red-400 text-center py-6 text-xs">Impossible de charger l’historique des codes.</p>';
      }
      showNotification(
        "La table d’historique des codes n’est pas disponible. Exécute la migration SQL fournie.",
        "error",
      );
    }
    return;
  }
  oldAdministrativeCodes = data || [];
  renderAdministrativeCodeHistory();
}

function renderAdministrativeCodeHistory() {
  const container = document.getElementById("old-codes-container");
  if (!container) return;
  if (!oldAdministrativeCodes.length) {
    container.innerHTML = emptyState("Aucun ancien code enregistré.");
    return;
  }
  container.innerHTML = oldAdministrativeCodes
    .map((entry) => {
      const expectedRole =
        entry.role === "chef_departement" ? "chef_departement" : "professeur";
      const account = users.find(
        (user) =>
          (entry.account_id && user.id === entry.account_id) ||
          (entry.email &&
            user.role === expectedRole &&
            user.email?.trim().toLowerCase() === entry.email.trim().toLowerCase()),
      );
      const approved = entry.status === "approved";
      const roleLabel =
        entry.role === "chef_departement"
         ? "Chef de département · code_admin_pro"
         : "Professeur · code_admin";
      const statusLabel = approved && account
        ? `<p class="text-xs text-emerald-400 mt-2"><i class="fa-solid fa-circle-check mr-1"></i>Compte actif · ${escapeHtml(fullName(account))} · ${escapeHtml(account.email || entry.email || "")}</p>`
        : approved
         ? `<p class="text-xs text-amber-400 mt-2"><i class="fa-solid fa-user-slash mr-1"></i>Compte associé supprimé ou introuvable · ce code peut être retiré de l’historique</p>`
         : `<p class="text-xs ${entry.status === "rejected" ? "text-red-400" : "text-amber-400"} mt-2">${entry.status === "rejected" ? "Inscription rejetée" : "Inscription en attente"}</p>`;
      const canDelete = !account;
      const cardDetails = `
        <p class="font-mono font-bold tracking-wider text-brand">${escapeHtml(entry.code)}</p>
        <p class="text-xs text-zinc-400 mt-1">${roleLabel} · ${formatDate(entry.created_at)}</p>
        ${statusLabel}`;
      return `<div class="dashboard-hover-card relative border border-zinc-800 bg-[#191919] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      ${
        approved && account
          ? `<button type="button" onclick="openHistoricalAccount('${account.id}')" aria-label="Ouvrir le compte associé à ${escapeHtml(entry.email || fullName(account))}" class="admin-card-open-target"></button>
        <div class="relative z-10 pointer-events-none flex-1">${cardDetails}</div>`
          : `<div class="flex-1">${cardDetails}</div>`
      }
      ${canDelete ? `<button type="button" onclick="deleteHistoricalCode('${entry.id}')" class="admin-detail-control relative z-10 px-3 py-2 rounded-lg border border-red-500/30 text-red-400 text-xs 
      font-bold hover:bg-red-500/10 hover:border-red-400 transition-all"><i class="fa-solid fa-trash mr-1"></i>Supprimer</button>` : ""}
    </div>`;
    })
    .join("");
}

async function deleteHistoricalCode(id) {
  const entry = oldAdministrativeCodes.find((item) => item.id === id);
  if (!entry) return;
  const expectedRole =
    entry.role === "chef_departement" ? "chef_departement" : "professeur";
  const knownAccount = users.find(
    (user) =>
      (entry.account_id && user.id === entry.account_id) ||
      (entry.email &&
        user.role === expectedRole &&
        user.email?.trim().toLowerCase() === entry.email.trim().toLowerCase()),
  );
  const { data: activeAccount, error: accountError } = knownAccount?.id
    ? await _supabase
        .from("utilisateurs")
        .select("id")
        .eq("id", knownAccount.id)
        .maybeSingle()
    : { data: null, error: null };
  if (accountError) {
    showNotification("Vérification du compte impossible. Veuillez réessayer.", "error");
    return;
  }
  if (activeAccount) {
    showNotification("Ce code est encore associé à un compte actif.", "error");
    return;
  }
  if (
    !(await showConfirmDialog("Supprimer cet ancien code sans compte actif de l’historique ?", {
      title: "Supprimer l’ancien code",
    }))
  )
    return;
  const { error } = await _supabase
    .from("codes_admin_historique")
    .delete()
    .eq("id", id);
  if (error) {
    showNotification("Suppression impossible. Veuillez réessayer.", "error");
    return;
  }
  showNotification("Ancien code supprimé.");
  await loadAdministrativeCodeHistory();
}

async function loadAdministrativeCodes({ silent = false } = {}) {
  const [professorResult, chefResult] = await Promise.all([
    _supabase.from("codes_admin").select("code").limit(1).maybeSingle(),
    _supabase.from("codes_admin_pro").select("code").limit(1).maybeSingle(),
  ]);

  administrativeCodes = {
    professor: professorResult.data?.code || null,
    chef: chefResult.data?.code || null,
  };
  document.getElementById("admin-prof-code").textContent =
    administrativeCodes.professor || "Aucun code disponible";
  document.getElementById("admin-chef-code").textContent =
    administrativeCodes.chef || "Aucun code disponible";

  if (!silent && (professorResult.error || chefResult.error)) {
    showNotification(
      "Impossible de charger un ou plusieurs codes administratifs.",
      "error",
    );
  }
}

async function loadPendingRegistrations() {
  const [chefResult, professorResult] = await Promise.all([
    _supabase
      .from("chef_attente")
      .select("*")
      .order("date_creation", { ascending: false }),
    _supabase
      .from("prof_attente")
      .select("*")
      .order("date_creation", { ascending: false }),
  ]);

  pendingChefs = chefResult.data || [];
  pendingProfessors = professorResult.data || [];

  if (chefResult.error) {
    renderPendingError(
      "pending-chefs-container",
      "chef_attente",
      chefResult.error,
    );
  } else {
    renderPendingList("pending-chefs-container", pendingChefs, "chef");
  }

  if (professorResult.error) {
    renderPendingError(
      "pending-professors-container",
      "prof_attente",
      professorResult.error,
    );
  } else {
    renderPendingList(
      "pending-professors-container",
      pendingProfessors,
      "professeur",
    );
  }

  updateStats();

  if (currentTab === "departements" && pendingChefs.length) {
    switchTab("attente-chefs");
  } else if (currentTab === "departements" && pendingProfessors.length) {
    switchTab("attente-professeurs");
  }
}

function buildDepartments(academicDepartments = []) {
  const chefs = users.filter((user) => user.role === "chef_departement");
  departments = academicDepartments.map((department) => {
    const departmentCourses = courses.filter(
      (course) => course.departement_id === department.id || course.faculte === department.nom,
    );
    const classes = academicClasses.filter((item) => item.departement_id === department.id).map((item) => ({
      ...item,
      courses: departmentCourses.filter((course) => course.classe_id === item.id || course.classe === item.nom),
    }));

    return {
      id: department.id,
      nom: department.nom,
      faculte: department.nom,
      code_departement: department.code_departement,
      chef: chefs.find((chef) => chef.departement_id === department.id || chef.faculte === department.nom) || null,
      classes,
    };
  });
}

function populateClassDepartmentSelect() {
  const select = document.getElementById("new-class-department");
  if (!select) return;
  select.innerHTML = '<option value="">Département...</option>' +
    departments.map((department) => `<option value="${department.id}">${escapeHtml(department.nom)}</option>`).join("");
}

async function createDepartment(event) {
  event.preventDefault();
  const name = document.getElementById("new-department-name").value.trim();
  const code = document.getElementById("new-department-code").value.trim().toUpperCase();
  const classNames = [...document.querySelectorAll("#new-department-class-inputs input")]
    .map((input) => input.value.trim()).filter(Boolean);
  if (!name || !code || !classNames.length || new Set(classNames.map((item) => item.toLowerCase())).size !== classNames.length) {
    showNotification("Renseignez le département et des noms de classes uniques.", "error");
    return;
  }
  const details = `Département : ${name}\nCode : ${code}\nClasses (${classNames.length}) : ${classNames.join(", ")}`;
  if (!(await showConfirmDialog(details.replace(/\n/g, "<br>"), { title: "Confirmer la création", danger: false, confirmLabel: "Créer" }))) return;
  const { data: department, error } = await _supabase.from("departements").insert({ nom: name, code_departement: code }).select("id").single();
  if (error) {
    showNotification("Création impossible. Vérifiez les informations puis réessayez.", "error");
    return;
  }
  const { error: classesError } = await _supabase.from("classes").insert(
    classNames.map((nom) => ({ departement_id: department.id, nom })),
  );
  if (classesError) {
    const { error: rollbackError } = await _supabase
      .from("departements")
      .delete()
      .eq("id", department.id);
    if (rollbackError) {
      console.error("Échec de l'annulation du département créé :", rollbackError);
      showNotification(
        "Les classes n'ont pas été créées et le département incomplet n'a pas pu être annulé.",
        "error",
      );
      await loadAdminData();
      return;
    }
    showNotification(`Création des classes impossible : ${classesError.message}`, "error");
    return;
  }
  event.target.reset();
  document.getElementById("new-department-class-inputs").innerHTML = "";
  closeCreateDepartmentModal();
  showNotification("Département et classes créés.");
  await loadAdminData();
}

function openCreateDepartmentModal() {
  document.getElementById("create-department-modal")?.classList.remove("hidden");
}

function closeCreateDepartmentModal() {
  document.getElementById("create-department-modal")?.classList.add("hidden");
}

let departmentForNewClass = null;

function openAddClassModal(departmentId) {
  const department = departments.find((item) => item.id === departmentId);
  if (!department) return;
  if (department.classes.length >= 5) {
    showNotification("Ce département possède déjà la limite de 5 classes.", "error");
    return;
  }
  departmentForNewClass = department;
  document.getElementById("add-class-department-label").textContent =
    `${department.nom} · ${department.classes.length}/5 classes`;
  document.getElementById("add-class-name").value = "";
  document.getElementById("add-class-modal")?.classList.remove("hidden");
  document.getElementById("add-class-name")?.focus();
}

function closeAddClassModal() {
  departmentForNewClass = null;
  document.getElementById("add-class-modal")?.classList.add("hidden");
}

async function addClassToDepartment(event) {
  event.preventDefault();
  if (!departmentForNewClass) return;
  const department = departmentForNewClass;
  const name = document.getElementById("add-class-name").value.trim();
  if (!name) return;
  if (department.classes.length >= 5) {
    showNotification("Ce département possède déjà la limite de 5 classes.", "error");
    closeAddClassModal();
    return;
  }
  if (department.classes.some((item) => item.nom.toLowerCase() === name.toLowerCase())) {
    showNotification("Cette classe existe déjà dans ce département.", "error");
    return;
  }
  const details = `Département : ${department.nom}<br>Nouvelle classe : ${name}<br>Classes après ajout : ${department.classes.length + 1}/5`;
  if (!(await showConfirmDialog(details, {
    title: "Confirmer l'ajout de la classe",
    danger: false,
    confirmLabel: "Ajouter",
  }))) return;
  const { error } = await _supabase.from("classes").insert({
    departement_id: department.id,
    nom: name,
  });
  if (error) {
    showNotification("Ajout impossible. Vérifiez les informations puis réessayez.", "error");
    return;
  }
  closeAddClassModal();
  showNotification("Classe ajoutée au département.");
  await loadAdminData();
}

function renderDepartmentClassInputs(event) {
  const count = Math.min(5, Number(event.target.value || 0));
  const container = document.getElementById("new-department-class-inputs");
  container.innerHTML = Array.from({ length: count }, (_, index) =>
    `<input required placeholder="Nom de la classe ${index + 1}" class="w-full px-3 py-2 bg-[#191919] border border-zinc-700 rounded-xl text-sm">`,
  ).join("");
}

function renderDepartments() {
  const container = document.getElementById("departments-container");
  const search = document
    .getElementById("department-search")
    .value.trim()
    .toLowerCase();
  const filtered = departments.filter((department) => {
    const chefName = department.chef ? fullName(department.chef) : "";
    return `${department.nom} ${chefName}`.toLowerCase().includes(search);
  });

  if (!filtered.length) {
    container.innerHTML = emptyState("Aucun département disponible.");
    return;
  }

  container.innerHTML = filtered
    .map(
      (department) => `
        <div class="dashboard-hover-card bg-[#202020] border border-zinc-800 rounded-2xl p-5 transition-all">
          <div>
            <div class="flex items-start justify-between gap-4">
                <div>
                    <p class="text-xs text-brand font-bold uppercase tracking-wider">
                        ${escapeHtml(department.faculte)}
                    </p>
                    <h3 class="text-lg font-extrabold mt-2">
                        ${escapeHtml(department.nom)}
                    </h3>
                    <p class="text-xs text-zinc-500 mt-1">Code : <span class="font-mono text-brand">${escapeHtml(department.code_departement)}</span></p>
                </div>
                <i class="fa-solid fa-building text-zinc-600"></i>
            </div>
            ${renderDepartmentChef(department.chef)}
            <div class="mt-4 flex gap-3 text-xs text-zinc-500">
                <span><i class="fa-solid fa-layer-group mr-1"></i>${department.classes.length} classe(s)</span>
                <span><i class="fa-solid fa-book-open mr-1"></i>${departmentCoursesCount(department)} cours</span>
            </div>
          </div>
          <div class="mt-5 pt-4 border-t border-zinc-800 flex flex-wrap justify-end gap-2">
            <button type="button" onclick="openDepartment('${department.id}')"
              class="admin-detail-control px-3 py-2 rounded-lg border border-brand/30 text-brand text-xs font-bold">
              <i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>Consulter
            </button>
            ${
              department.classes.length < 5
                ? `<button type="button" onclick="openAddClassModal('${department.id}')"
              class="admin-detail-control mr-2 px-3 py-2 rounded-lg border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs font-bold">
              <i class="fa-solid fa-plus mr-1"></i>Ajouter une classe</button>`
                : ""
            }
            <button type="button" onclick="deleteDepartment('${department.id}')"
              class="admin-detail-control px-3 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold">
              <i class="fa-solid fa-trash mr-1"></i>Supprimer le département
            </button>
          </div>
        </div>
    `,
    )
    .join("");
}

function renderDepartmentChef(chef) {
  if (!chef) {
    return `
            <div class="border-t border-zinc-800 mt-5 pt-4 text-xs text-amber-400">
                <i class="fa-solid fa-user-slash mr-2"></i>Chef indisponible
            </div>
        `;
  }

  return `
        <div class="border-t border-zinc-800 mt-5 pt-4 flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold text-xs">
                ${initials(chef)}
            </div>
            <div>
                <p class="text-xs text-zinc-500">Chef de département</p>
                <p class="text-sm font-semibold">${escapeHtml(fullName(chef))}</p>
                <p class="text-xs text-zinc-500 mt-1">
                    <i class="fa-regular fa-calendar mr-1"></i>Enrôlé le ${formatDate(chef.date_creation)}
                </p>
            </div>
        </div>
    `;
}

function renderProfessors() {
  const container = document.getElementById("professors-container");
  const search = document
    .getElementById("professor-search")
    .value.trim()
    .toLowerCase();
  const professors = users
    .filter((user) => user.role === "professeur")
    .filter((professor) => {
      return `${fullName(professor)} ${professor.email} ${professor.matricule} ${professor.faculte}`
        .toLowerCase()
        .includes(search);
    });

  if (!professors.length) {
    container.innerHTML = emptyState("Aucun professeur confirmé.");
    return;
  }

  container.innerHTML = professors
    .map(
      (professor) => `
        <article class="dashboard-hover-card bg-[#202020] border border-zinc-800 rounded-2xl p-5 transition-all">
            <div class="flex items-center gap-3 border-b border-zinc-800 pb-4">
                ${avatarMarkup(professor, "w-11 h-11")}
                <div>
                    <h3 class="font-bold">${escapeHtml(fullName(professor))}</h3>
                    <p class="text-xs text-emerald-400">
                        Professeur · ${escapeHtml(professor.matricule)}
                    </p>
                </div>
            </div>
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs">
                ${detailField("Département", professor.faculte)}
                ${detailField("Email", professor.email)}
                ${detailField("Code administratif", professor.code_administratif)}
                ${detailField("Date d’inscription", formatDate(professor.date_creation))}
            </dl>
            <div class="mt-4 flex justify-end">
                <button type="button" onclick="openProfessorModal('${professor.id}')"
                    class="admin-detail-control px-3 py-2 rounded-lg border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                    <i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>Détails et actions
                </button>
            </div>
        </article>
    `,
    )
    .join("");
}

function renderChefs() {
  const container = document.getElementById("chefs-container");
  if (!container) return;
  const search = document.getElementById("chef-search")?.value.trim().toLowerCase() || "";
  const chefs = users
    .filter((user) => user.role === "chef_departement")
    .filter((chef) =>
      `${fullName(chef)} ${chef.email || ""} ${chef.matricule || ""} ${chef.faculte || ""} ${chef.code_departement || ""}`
        .toLowerCase()
        .includes(search),
    );
  if (!chefs.length) {
    container.innerHTML = emptyState("Aucun chef de département confirmé.");
    return;
  }
  container.innerHTML = chefs
    .map(
      (chef) => `
    <article class="dashboard-hover-card bg-[#202020] border border-zinc-800 rounded-2xl p-5 transition-all">
      <div class="flex items-center gap-3 border-b border-zinc-800 pb-4">
        ${avatarMarkup(chef, "w-11 h-11")}
        <div><h3 class="font-bold">${escapeHtml(fullName(chef))}</h3><p class="text-xs text-blue-400">Chef de département · ${escapeHtml(chef.matricule)}</p></div>
      </div>
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs">
        ${detailField("Département", chef.faculte)}${detailField("Email", chef.email)}${detailField("Code administratif", chef.code_administratif)}${detailField("Date d’inscription", formatDate(chef.date_creation))}
      </dl>
      <div class="mt-4 flex justify-end">
        <button type="button" onclick="openChefModal('${chef.id}')"
          class="admin-detail-control px-3 py-2 rounded-lg border border-blue-500/30 text-blue-400 text-xs font-bold">
          <i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>Détails et actions
        </button>
      </div>
    </article>`,
    )
    .join("");
}

function renderPendingList(containerId, records, type) {
  const container = document.getElementById(containerId);

  if (!records.length) {
    container.innerHTML = emptyState(
      `Aucune inscription de ${type} en attente.`,
    );
    return;
  }

  container.innerHTML = records
    .map((record) => {
      const existingChef =
        type === "chef"
          ? users.find(
              (user) =>
                user.role === "chef_departement" &&
                user.faculte === record.faculte,
            )
          : null;
      const actionLabel = existingChef ? "Mettre à jour le chef" : "Confirmer";

      return `
        <article class="bg-[#202020] border border-zinc-800 rounded-2xl p-5">
            <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                <div class="flex items-center gap-3">
                    ${avatarMarkup(record, "w-12 h-12")}
                    <div>
                        <h3 class="font-bold">${escapeHtml(fullName(record))}</h3>
                        <p class="text-xs text-amber-400">
                            ${escapeHtml(record.role)} · ${escapeHtml(record.matricule)}
                        </p>
                        <p class="text-xs text-zinc-500 mt-1">
                            Demande reçue le ${formatDate(record.date_creation)}
                        </p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="confirmRegistration('${record.id}', '${type}')"
                        class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
                        <i class="fa-solid ${existingChef ? "fa-arrows-rotate" : "fa-check"} mr-2"></i>${actionLabel}
                    </button>
                    <button onclick="deleteRegistration('${record.id}', '${type}')"
                        class="px-4 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold">
                        <i class="fa-solid fa-trash mr-2"></i>Supprimer
                    </button>
                </div>
            </div>
            <dl class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5 pt-4 border-t border-zinc-800 text-xs">
                ${pendingFields(record)}
            </dl>
        </article>
        `;
    })
    .join("");
}

async function confirmRegistration(id, type) {
  const sourceTable = type === "chef" ? "chef_attente" : "prof_attente";
  const records = type === "chef" ? pendingChefs : pendingProfessors;
  const record = records.find((item) => item.id === id);
  const departmentChef =
    type === "chef"
      ? users.find(
          (user) =>
            user.role === "chef_departement" &&
            user.faculte === record?.faculte,
        )
      : null;
  const replacingExistingChef = Boolean(departmentChef);

  if (!record) return;
  const confirmed = await showConfirmDialog(
    replacingExistingChef
      ? "Ce compte chef de département est créé pour un département déjà assigné à un autre chef de département. Si vous confirmez son inscription, il sera le nouveau chef et l'ancien chef sera supprimé définitivement du système."
      : `Confirmer l'inscription de ${fullName(record)} ?`,
    {
      title: replacingExistingChef
        ? "Remplacement définitif du chef"
        : "Confirmer l’inscription",
      danger: replacingExistingChef,
      confirmLabel: replacingExistingChef
        ? "Remplacer et confirmer"
        : "Confirmer",
    },
  );
  if (!confirmed) {
    if (replacingExistingChef) {
      await rejectPendingRegistration(id, type, record);
    }
    return;
  }

  const normalizedEmail = record.email?.trim().toLowerCase();
  const userData = {
    role: type === "chef" ? "chef_departement" : "professeur",
    nom: record.nom,
    postnom: record.postnom,
    prenom: record.prenom,
    matricule: record.matricule,
    faculte: type === "chef" ? record.faculte : null,
    annee_etude: null,
    email: normalizedEmail,
    mot_de_passe: record.mot_de_passe,
    photo_profil: record.photo_profil,
    code_administratif: record.code_administratif,
    code_departement: type === "chef" ? record.code_departement || null : null,
    departement_id: type === "chef" ? record.departement_id || null : null,
    classe_id: null,
  };

  const targetRole = type === "chef" ? "chef_departement" : "professeur";
  const existingUser = users.find(
    (user) =>
      (normalizedEmail &&
        user.email?.trim().toLowerCase() === normalizedEmail) ||
      (record.matricule && user.matricule === record.matricule),
  );
  const existingSameRole =
    existingUser?.role === targetRole ? existingUser : null;

  if (existingUser && !existingSameRole) {
    showNotification(
      `Impossible de confirmer : l'e-mail ou le matricule appartient déjà à un autre rôle (${existingUser.role}).`,
      "error",
    );
    return;
  }

  const existingChef =
    type === "chef" ? existingSameRole || departmentChef : existingSameRole;
  const replacingChef = type === "chef" && existingChef && !existingSameRole;
  const userRequest = existingChef
    ? existingSameRole
      ? _supabase
          .from("utilisateurs")
          .update(userData)
          .eq("id", existingChef.id)
          .select("id")
          .single()
      : _supabase.from("utilisateurs").insert([userData]).select("id").single()
    : _supabase.from("utilisateurs").insert([userData]).select("id").single();
  const { data: savedUser, error: insertError } = await userRequest;

  if (insertError) {
    console.error("Erreur confirmation inscription", {
      code: insertError.code,
      details: insertError.details,
      hint: insertError.hint,
      message: insertError.message,
    });
    showNotification(
      insertError.code === "23505"
        ? "Confirmation impossible : cet e-mail, matricule ou département existe déjà."
        : `Confirmation impossible : ${insertError.message}`,
      "error",
    );
    return;
  }

  if (replacingChef) {
    const { error: reassignError } = await _supabase
      .from("cours")
      .update({ chef_id: savedUser.id })
      .eq("chef_id", existingChef.id);
    if (reassignError) {
      showNotification(
        `Remplacement interrompu : ${reassignError.message}`,
        "error",
      );
      const { error: rollbackError } = await _supabase
        .from("utilisateurs")
        .delete()
        .eq("id", savedUser.id);
      if (rollbackError) {
        console.error("Échec de l'annulation du nouveau chef :", rollbackError);
        showNotification(
          "Le transfert des cours a échoué et le nouveau compte n'a pas pu être annulé.",
          "error",
        );
      }
      return;
    }
    const { error: themeCleanupError } = await _supabase
      .from("user_themes")
      .delete()
      .eq("user_id", existingChef.id);
    if (themeCleanupError) {
      console.error("Préférences de l'ancien chef non supprimées :", themeCleanupError);
      showNotification(
        "Le remplacement continue, mais les préférences de l'ancien chef n'ont pas été supprimées.",
        "error",
      );
    }
    const { error: oldChefDeleteError } = await _supabase
      .from("utilisateurs")
      .delete()
      .eq("id", existingChef.id);
    if (oldChefDeleteError) {
      showNotification(
        `Nouveau chef créé, mais ancien compte non supprimé : ${oldChefDeleteError.message}`,
        "error",
      );
      return;
    }
  }

  const { error: historyUpdateError } = await _supabase
    .from("codes_admin_historique")
    .update({
      status: "approved",
      account_id: savedUser.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("registration_id", id);
  if (historyUpdateError) {
    console.error("Historique d'inscription non mis à jour :", historyUpdateError);
    showNotification(
      "Utilisateur confirmé, mais l'historique des codes n'a pas pu être actualisé.",
      "error",
    );
  }

  const { error: deleteError } = await _supabase
    .from(sourceTable)
    .delete()
    .eq("id", id);

  if (deleteError) {
    showNotification(
      `Utilisateur créé, mais demande conservée : ${deleteError.message}`,
      "error",
    );
    return;
  }

  const { error: themeError } = await _supabase
    .from("user_themes")
    .upsert(
      { user_id: savedUser.id, theme: "dark" },
      { onConflict: "user_id", ignoreDuplicates: true },
    );

  if (themeError) {
    console.warn(
      "Utilisateur confirmé, mais thème non initialisé :",
      themeError.message,
    );
  }

  if (typeof createNotification === "function") {
    await createNotification({
      userId: savedUser.id,
      type: "registration_confirmed",
      title: "Inscription confirmée",
      message: "Votre inscription a été confirmée par l’administration.",
    });
  }

  if (typeof sendNotificationEmail === "function" && record.email) {
    try {
      await sendNotificationEmail({
        toEmail: record.email,
        toName: fullName(record),
        subject: "Votre inscription Smart Attendance est confirmée",
        message: `Votre compte ${targetRole === "professeur" ? "professeur" : "chef de département"} a été confirmé par l’administration. Vous pouvez maintenant vous connecter à Smart Attendance.`,
        actionUrl: new URL("../login.html", document.baseURI).href,
      });
    } catch (emailError) {
      console.warn(
        "Confirmation enregistrée, mais e-mail non envoyé :",
        emailError,
      );
    }
  }

  showNotification(
    existingChef
      ? "Chef de département mis à jour."
      : "Inscription confirmée avec succès.",
  );
  await loadAdminData();
  await loadAdministrativeCodes();
}

async function deleteRegistration(id, type) {
  const table = type === "chef" ? "chef_attente" : "prof_attente";
  const records = type === "chef" ? pendingChefs : pendingProfessors;
  const record = records.find((item) => item.id === id);

  if (
    !(await showConfirmDialog(
      "Supprimer définitivement cette inscription en attente ?",
      { title: "Supprimer l’inscription" },
    ))
  )
    return;

  await rejectPendingRegistration(id, type, record);
}

async function rejectPendingRegistration(id, type, record) {
  const table = type === "chef" ? "chef_attente" : "prof_attente";
  const { error } = await _supabase.from(table).delete().eq("id", id);
  if (error) {
    showNotification("Suppression impossible. Veuillez réessayer.", "error");
    return;
  }
  const { error: historyUpdateError } = await _supabase
    .from("codes_admin_historique")
    .update({ status: "rejected", resolved_at: new Date().toISOString() })
    .eq("registration_id", id);
  if (historyUpdateError) {
    console.error("Historique du refus non mis à jour :", historyUpdateError);
    showNotification(
      "Inscription supprimée, mais l'historique du code n'a pas pu être actualisé.",
      "error",
    );
  }
  if (record?.email && typeof sendNotificationEmail === "function") {
    try {
      await sendNotificationEmail({
        toEmail: record.email,
        toName: fullName(record),
        subject: "Mise à jour de votre inscription Smart Attendance",
        message: `Votre demande d'inscription comme ${type === "chef" ? "chef de département" : "professeur"} n'a pas été retenue par l'administration. Contactez l'administration pour plus d'informations.`,
        actionUrl: new URL("../login.html", document.baseURI).href,
      });
    } catch (emailError) {
      console.warn(
        "Inscription supprimée, mais e-mail de refus non envoyé :",
        emailError,
      );
    }
  }
  showNotification("Inscription en attente supprimée.");
  await loadPendingRegistrations();
}

async function deleteDepartment(departmentId) {
  const department = departments.find((item) => item.id === departmentId);
  if (!department) return;
  const faculty = department.faculte;
  const departmentCourses = courses.filter(
    (course) =>
      course.departement_id === department.id || course.faculte === faculty,
  );
  const courseIds = departmentCourses
    .map((course) => course.id)
    .filter(Boolean);
  const courseCodes = departmentCourses
    .map((course) => course.code_cours)
    .filter(Boolean);
  const departmentStudents = users.filter(
    (user) =>
      user.role === "etudiant" &&
      (user.departement_id === department.id || user.faculte === faculty),
  );
  const studentIds = departmentStudents
    .map((student) => student.id)
    .filter(Boolean);
  const studentEmails = departmentStudents
    .map((student) => student.email)
    .filter(Boolean);
  const departmentChefs = users.filter(
    (user) =>
      user.role === "chef_departement" &&
      (user.departement_id === department.id || user.faculte === faculty),
  );

  const confirmed = await showConfirmDialog(
    `ATTENTION : si vous supprimez le département ${faculty}, toutes les informations de ce dernier seront définitivement effacées par le système : le chef de ce département, les élèves, les cours, les classes, les inscriptions et les listes de présences. Cette action est irréversible.`,
    {
      title: "Suppression définitive du département",
      confirmLabel: "Supprimer définitivement",
    },
  );
  if (!confirmed) return;

  try {
    const deleteIn = async (table, column, values) => {
      if (!values.length) return;
      const { error } = await _supabase.from(table).delete().in(column, values);
      if (error) throw error;
    };

    await deleteIn("presences", "code_cours", courseCodes);
    await deleteIn("inscriptions", "code_cours", courseCodes);
    await deleteIn("presences", "etudiant_id", studentIds);
    await deleteIn("presences", "email", studentEmails);
    await deleteIn("inscriptions", "etudiant_id", studentIds);
    await deleteIn("inscriptions", "etudiant_email", studentEmails);
    await deleteIn(
      "user_themes",
      "user_id",
      [...studentIds, ...departmentChefs.map((chef) => chef.id)].filter(
        Boolean,
      ),
    );
    await deleteIn("cours", "id", courseIds);
    await deleteIn(
      "utilisateurs",
      "id",
      [...studentIds, ...departmentChefs.map((chef) => chef.id)].filter(
        Boolean,
      ),
    );
    await deleteIn("chef_attente", "departement_id", [department.id]);
    await deleteIn("chef_attente", "faculte", [faculty]);
    await deleteIn("prof_attente", "faculte", [faculty]);
    await deleteIn("codes_admin_historique", "faculte", [faculty]);
    await deleteIn("classes", "departement_id", [department.id]);
    const { error: departmentDeleteError } = await _supabase
      .from("departements")
      .delete()
      .eq("id", department.id);
    if (departmentDeleteError) throw departmentDeleteError;

    showNotification(`Département ${faculty} supprimé définitivement.`);
    await loadAdminData();
  } catch (error) {
    console.error("Suppression département interrompue :", error);
    showNotification("Suppression interrompue. Veuillez réessayer.", "error");
    await loadAdminData();
  }
}

function openDepartment(id) {
  currentDepartment = departments.find((department) => department.id === id);

  if (!currentDepartment) {
    return;
  }

  document.getElementById("modal-department-name").textContent =
    currentDepartment.nom;
  document.getElementById("modal-department-faculty").textContent =
    currentDepartment.faculte;
  document.getElementById("modal-department-breadcrumb").textContent =
    `Départements / ${currentDepartment.nom}`;
  document.getElementById("classes-container").innerHTML = currentDepartment
    .classes.length
    ? currentDepartment.classes
        .map(
          (departmentClass) => `
            <article class="dashboard-hover-card bg-[#202020] border border-zinc-800 rounded-2xl p-5 transition-all">
                <div>
                    <div class="flex justify-between">
                        <i class="fa-solid fa-layer-group text-blue-400"></i>
                        <span class="text-xs text-zinc-500">Classe</span>
                    </div>
                    <h3 class="font-bold mt-4">${escapeHtml(departmentClass.nom)}</h3>
                    <p class="text-xs text-zinc-500 mt-2">
                        ${classStudentCount(departmentClass)} élève(s) ·
                        ${departmentClass.courses.length} cours
                    </p>
                </div>
                <div class="mt-4 flex justify-end gap-2">
                <button type="button" onclick="openClass('${departmentClass.id}')"
                    class="admin-detail-control px-3 py-2 rounded-lg border border-blue-500/30 text-blue-400 text-xs font-bold transition-all">
                    <i class="fa-solid fa-arrow-up-right-from-square mr-1"></i>Consulter
                </button>
                <button type="button" onclick="deleteDepartmentClass('${departmentClass.id}')"
                    class="admin-detail-control px-3 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold transition-all">
                    <i class="fa-solid fa-trash mr-1"></i>Supprimer la classe
                </button>
                </div>
            </article>
        `,
        )
        .join("")
    : emptyState("Aucune classe trouvée dans ce département.");

  document.getElementById("department-modal").classList.remove("hidden");
}

async function deleteDepartmentClass(classId) {
  const department = departments.find((item) => item.id === currentDepartment?.id);
  const departmentClass = department?.classes.find((item) => item.id === classId);
  if (!department || !departmentClass) {
    showNotification("Classe ou département introuvable.", "error");
    return;
  }

  const departmentCourses = courses.filter(
    (course) =>
      (course.departement_id === department.id ||
        course.faculte === department.faculte) &&
      (course.classe_id === departmentClass.id ||
        course.classe === departmentClass.nom),
  );
  const courseIds = departmentCourses.map((course) => course.id).filter(Boolean);
  const courseCodes = departmentCourses
    .map((course) => course.code_cours)
    .filter(Boolean);
  const students = users.filter((user) =>
    classStudentMatches(user, department, departmentClass),
  );
  const studentIds = students.map((student) => student.id).filter(Boolean);
  const studentEmails = students
    .map((student) => student.email)
    .filter(Boolean);
  const safeClassName = escapeHtml(departmentClass.nom);
  const confirmed = await showConfirmDialog(
    `ATTENTION : la suppression de la classe <strong>${safeClassName}</strong> supprimera définitivement ses ${students.length} élève(s), ses ${departmentCourses.length} cours, les inscriptions et tous les registres de présence associés. Cette action est irréversible.`,
    {
      title: "Suppression définitive de la classe",
      confirmLabel: "Supprimer définitivement",
    },
  );
  if (!confirmed) return;

  try {
    const deleteIn = async (table, column, values) => {
      if (!values.length) return;
      const { error } = await _supabase.from(table).delete().in(column, values);
      if (error) throw error;
    };

    await deleteIn("presences", "code_cours", courseCodes);
    await deleteIn("inscriptions", "code_cours", courseCodes);
    await deleteIn("presences", "etudiant_id", studentIds);
    await deleteIn("presences", "email", studentEmails);
    await deleteIn("inscriptions", "etudiant_id", studentIds);
    await deleteIn("inscriptions", "etudiant_email", studentEmails);
    await deleteIn("user_themes", "user_id", studentIds);
    await deleteIn("cours", "id", courseIds);
    await deleteIn("utilisateurs", "id", studentIds);

    const { error: classDeleteError } = await _supabase
      .from("classes")
      .delete()
      .eq("id", departmentClass.id)
      .eq("departement_id", department.id);
    if (classDeleteError) throw classDeleteError;

    showNotification(`Classe ${departmentClass.nom} et ses données supprimées.`);
  } catch (error) {
    console.error("Suppression de classe interrompue :", error);
    showNotification(
      `Suppression interrompue : ${error.message || "une erreur est survenue"}.`,
      "error",
    );
  }

  await loadAdminData();
  const updatedDepartment = departments.find((item) => item.id === department.id);
  if (updatedDepartment) openDepartment(updatedDepartment.id);
}

function openClass(id) {
  currentClass = currentDepartment.classes.find(
    (departmentClass) => departmentClass.id === id,
  );

  if (!currentClass) {
    return;
  }

  document.getElementById("modal-class-name").textContent = currentClass.nom;
  document.getElementById("modal-class-department").textContent =
    currentDepartment.nom;
  document.getElementById("modal-class-breadcrumb").textContent =
    `Départements / ${currentDepartment.nom} / ${currentClass.nom}`;
  setClassOption("none");
  document.getElementById("class-detail-container").innerHTML = `
        <p class="text-zinc-500 text-center py-8 text-xs">
            Choisissez une liste à consulter.
        </p>
    `;
  document.getElementById("class-modal").classList.remove("hidden");
}

function showClassStudents() {
  const students = users.filter((user) =>
    classStudentMatches(user, currentDepartment, currentClass),
  );

  setClassOption("students");
  document.getElementById("class-detail-container").innerHTML = `
        <h3 class="text-xs uppercase tracking-wider text-brand font-bold mb-3">
            Élèves de la classe (${students.length})
        </h3>
        ${
          students.length
            ? students
                .map(
                  (student) => `
            <div onclick="showStudentCourses('${student.id}')" class="admin-detail-control cursor-pointer bg-[#202020] border border-zinc-800 rounded-xl p-4 flex items-center justify-between gap-4">
                ${avatarMarkup(student, "w-10 h-10")}
                <div class="flex-1">
                    <p class="font-semibold text-sm uppercase">${escapeHtml(fullName(student))}</p>
                    <p class="text-xs text-zinc-500 mt-1">
                        ${escapeHtml(student.matricule)} · ${escapeHtml(student.email)} ·
                        Inscrit le ${formatDate(student.date_creation)}
                    </p>
                </div>
                <button onclick="event.stopPropagation(); showStudentCourses('${student.id}')" class="admin-detail-control px-3 py-2 rounded-lg border border-brand/30 text-brand hover:bg-brand-hover text-xs font-bold">
                    <i class="fa-solid fa-book-open mr-1"></i>Cours
                </button>
                <button onclick="event.stopPropagation(); deleteUserById('${student.id}')" class="admin-detail-control px-3 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `,
                )
                .join("")
            : emptyState("Aucun élève trouvé dans cette classe.")
        }
    `;
}

function showClassCourses() {
  setClassOption("courses");
  document.getElementById("class-detail-container").innerHTML = `
        <h3 class="text-xs uppercase tracking-wider text-blue-400 font-bold mb-3">
            Cours de la classe (${currentClass.courses.length})
        </h3>
        ${
          currentClass.courses.length
            ? currentClass.courses
                .map(
                  (course) => `
            <div class="w-full bg-[#202020] border border-zinc-800 rounded-xl p-4">
                <div class="flex justify-between gap-3">
                    <button onclick="showCourseStudents('${course.code_cours}')" class="admin-detail-control text-left flex-1">
                        <span class="text-xs font-mono text-blue-400">
                            ${escapeHtml(course.code_cours)}
                        </span>
                        <p class="font-semibold text-sm mt-1">
                            ${escapeHtml(course.nom_cours)}
                        </p>
                        <p class="text-xs text-zinc-400 mt-2">
                            <i class="fa-solid fa-user-tie text-emerald-400 mr-1"></i>
                            Professeur : ${escapeHtml(courseProfessorName(course))}
                        </p>
                        <p class="text-[11px] text-zinc-500 mt-2">
                            Début le ${formatDate(course.date_debut)} · Fin le ${formatDate(course.date_fin)}
                        </p>
                        <p class="text-[11px] text-zinc-400 mt-1">
                            Code d'accès : ${escapeHtml(course.code_enregistrement)}
                        </p>
                        <p class="text-[11px] text-zinc-400 mt-1">
                            ${classCourseStudentCount(course.code_cours)} élève(s) inscrit(s)
                        </p>
                    </button>
                    <div class="flex items-start gap-3">
                        <i class="fa-solid fa-chevron-right text-zinc-600 mt-2"></i>
                        <button onclick="deleteCourse('${course.id}')" class="admin-detail-control text-red-400 hover:text-red-300" title="Supprimer le cours">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `,
                )
                .join("")
            : emptyState("Aucun cours disponible.")
        }
    `;
}

function courseProfessorName(course) {
  const professor = users.find(
    (user) =>
      user.role === "professeur" &&
      ((course.professeur_id && user.id === course.professeur_id) ||
        (user.email &&
          course.professeur_email &&
          user.email.toLowerCase() === course.professeur_email.toLowerCase())),
  );

  return professor
    ? fullName(professor)
    : "Professeur indisponible";
}

function classCourseStudentCount(codeCours) {
  const keys = new Set();
  enrollments
    .filter((enrollment) => enrollment.code_cours === codeCours)
    .forEach((enrollment) => {
      if (enrollment.etudiant_id) keys.add(enrollment.etudiant_id);
      if (enrollment.etudiant_email) keys.add(enrollment.etudiant_email);
    });
  return users.filter((user) => keys.has(user.id) || keys.has(user.email))
    .length;
}

async function deleteCourse(courseId) {
  if (
    !(await showConfirmDialog("Supprimer définitivement ce cours ?", {
      title: "Supprimer le cours",
    }))
  )
    return;

  const { error } = await _supabase.from("cours").delete().eq("id", courseId);

  if (error) {
    showNotification("Suppression impossible. Veuillez réessayer.", "error");
    return;
  }

  showNotification("Cours supprimé.");
  await loadAdminData();
  if (currentDepartment) {
    const updated = departments.find(
      (item) => item.id === currentDepartment.id,
    );
    if (updated) {
      currentDepartment = updated;
      openDepartment(updated.id);
    }
  }
}

function showCourseStudents(codeCours) {
  const registeredKeys = new Set();
  const courseEnrollments = enrollments.filter(
    (enrollment) => enrollment.code_cours === codeCours,
  );
  courseEnrollments.forEach((enrollment) => {
    if (enrollment.etudiant_id) registeredKeys.add(enrollment.etudiant_id);
    if (enrollment.etudiant_email)
      registeredKeys.add(enrollment.etudiant_email);
  });
  const students = users.filter(
    (user) => registeredKeys.has(user.id) || registeredKeys.has(user.email),
  );

  setClassOption("courses");
  const course = courses.find((item) => item.code_cours === codeCours);
  document.getElementById("class-detail-container").innerHTML = `
        <button onclick="showClassCourses()" class="admin-detail-control text-xs text-zinc-400 hover:text-white mb-4">
            <i class="fa-solid fa-arrow-left mr-2"></i>Retour aux cours
        </button>
        <h3 class="text-sm font-bold text-brand mb-3">
            ${escapeHtml(course?.nom_cours || codeCours)} · Étudiants inscrits (${students.length})
        </h3>
        ${
          students.length
            ? students
                .map(
                  (student) => `
            <div class="bg-[#202020] border border-zinc-800 rounded-xl p-4 text-sm">
                ${avatarMarkup(student, "w-9 h-9 inline-flex mr-3")}
                <span class="uppercase font-bold">${escapeHtml(fullName(student))}</span>
                <span class="text-xs text-zinc-500 ml-3">${escapeHtml(student.matricule)}</span>
                <span class="text-xs text-emerald-400 float-right">${attendancePercentage(student, codeCours)}%</span>
            </div>
        `,
                )
                .join("")
            : emptyState("Aucun étudiant inscrit à ce cours.")
        }
    `;
}

function showStudentCourses(studentId) {
  const student = users.find((user) => user.id === studentId);
  if (!student) return;

  setClassOption("students");

  const studentCourses = courses.filter((course) => {
    const enrolled = enrollments.some(
      (enrollment) =>
        enrollment.code_cours === course.code_cours &&
        (enrollment.etudiant_id === student.id ||
          enrollment.etudiant_email === student.email),
    );
    const marked = attendances.some(
      (attendance) =>
        attendance.code_cours === course.code_cours &&
        (attendance.etudiant_id === student.id ||
          attendance.email === student.email),
    );
    return enrolled || marked;
  });

  document.getElementById("class-detail-container").innerHTML = `
        <button onclick="showClassStudents()" class="admin-detail-control text-xs text-zinc-400 hover:text-white mb-4">
            <i class="fa-solid fa-arrow-left mr-2"></i>Retour aux élèves
        </button>
        <div class="flex items-center gap-3 mb-5">
            ${avatarMarkup(student, "w-11 h-11")}
            <div>
                <h3 class="text-sm font-bold uppercase">${escapeHtml(fullName(student))}</h3>
                <p class="text-xs text-zinc-500">Cours enregistrés</p>
            </div>
        </div>
        ${
          studentCourses.length
            ? studentCourses
                .map(
                  (course) => `
            <div class="bg-[#202020] border border-zinc-800 rounded-xl p-4 flex justify-between gap-4">
                <div>
                    <p class="font-semibold text-sm">${escapeHtml(course.nom_cours)}</p>
                    <p class="text-xs text-zinc-500 mt-1">${escapeHtml(course.code_cours)}</p>
                </div>
                <strong class="text-emerald-400 text-sm">${attendancePercentage(student, course.code_cours)}%</strong>
            </div>
        `,
                )
                .join("")
            : emptyState("Aucun cours enregistré pour cet élève.")
        }
    `;
}

function setClassOption(option) {
  const studentsButton = document.getElementById("class-students-option");
  const coursesButton = document.getElementById("class-courses-option");
  const active =
    "admin-detail-control p-5 rounded-2xl border border-brand bg-brand/10 text-left";
  const inactive =
    "admin-detail-control p-5 rounded-2xl border border-zinc-800 bg-[#202020] hover:border-brand text-left";

  studentsButton.className = option === "students" ? active : inactive;
  coursesButton.className = option === "courses" ? active : inactive;
}

function classStudentCount(departmentClass) {
  return users.filter((user) =>
    classStudentMatches(user, currentDepartment, departmentClass),
  ).length;
}

function classStudentMatches(student, department, departmentClass) {
  const studentFaculty = String(student.faculte || "")
    .trim()
    .toLowerCase();
  const departmentFaculty = String(department?.faculte || "")
    .trim()
    .toLowerCase();
  const studentYear = String(student.annee_etude || "")
    .trim()
    .toLowerCase();
  const className = String(departmentClass?.nom || "")
    .trim()
    .toLowerCase();

  return (
    student.role === "etudiant" &&
    ((student.classe_id && student.classe_id === departmentClass?.id) ||
      (!student.classe_id && studentFaculty === departmentFaculty && studentYear === className))
  );
}

function attendancePercentage(student, codeCours) {
  const records = attendances.filter(
    (attendance) =>
      attendance.code_cours === codeCours &&
      (attendance.etudiant_id === student.id ||
        attendance.email === student.email) &&
      ["Présent", "present", "Absent", "absent"].includes(attendance.statut),
  );
  if (!records.length) return 0;
  const present = records.filter(
    (attendance) =>
      attendance.statut === "Présent" || attendance.statut === "present",
  ).length;
  return Math.round((present / records.length) * 100);
}

function openProfessorModal(professorId) {
  const professor = users.find((user) => user.id === professorId);
  if (!professor) return;

  openAdminAccountModal(professor, "Professeur", "emerald");
}

function openChefModal(chefId) {
  const chef = users.find((user) => user.id === chefId);
  if (!chef) return;
  openAdminAccountModal(chef, "Chef de département", "blue");
}

function openHistoricalAccount(accountId) {
  const account = users.find((user) => user.id === accountId);
  if (!account) return;
  switchTab(account.role === "chef_departement" ? "chefs" : "professeurs");
  openAdminAccountModal(
    account,
    account.role === "chef_departement" ? "Chef de département" : "Professeur",
    account.role === "chef_departement" ? "blue" : "emerald",
  );
}

function openAdminAccountModal(account, roleLabel, roleColor) {
  const assignedCourses =
    account.role === "professeur"
      ? courses.filter(
          (course) =>
            course.professeur_id === account.id ||
            (course.professeur_email &&
              account.email &&
              course.professeur_email.toLowerCase() ===
                account.email.toLowerCase()),
        )
      : [];

  document.getElementById("professor-modal-name").textContent =
    fullName(account);
  document.getElementById("professor-modal-content").innerHTML = `
        <div class="bg-[#202020] border border-zinc-800 rounded-3xl p-6 md:p-8">
            <div class="flex flex-col items-center border-b border-zinc-800 pb-6">
                ${avatarMarkup(account, "w-28 h-28")}
                <h3 class="text-xl font-bold mt-4 uppercase">${escapeHtml(fullName(account))}</h3>
                <p class="text-sm text-${roleColor}-400 mt-1">${roleLabel}</p>
            </div>
            <dl class="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6 text-sm">
                ${detailField("Nom", account.nom)}${detailField("Postnom", account.postnom)}${detailField("Prénom", account.prenom)}${detailField("Matricule", account.matricule)}${detailField("Département", account.faculte)}${detailField("Email", account.email)}${detailField("Code administratif", account.code_administratif)}${detailField("Date d’inscription", formatDate(account.date_creation))}
            </dl>
            ${
              account.role === "professeur"
                ? renderProfessorCourses(assignedCourses)
                : ""
            }
        </div>
    `;
  document.getElementById("professor-delete-button").onclick = () =>
    deleteUser(account);
  document.getElementById("professor-modal").classList.remove("hidden");
}

function renderProfessorCourses(assignedCourses) {
  const content = assignedCourses.length
    ? assignedCourses
        .map((course) => {
          const courseEnrollments = enrollments.filter(
            (enrollment) => enrollment.code_cours === course.code_cours,
          );
          const courseAttendance = attendances.filter(
            (attendance) =>
              attendance.code_cours === course.code_cours &&
              ["Présent", "present", "Absent", "absent"].includes(
                attendance.statut,
              ),
          );
          const presentCount = courseAttendance.filter(
            (attendance) =>
              attendance.statut === "Présent" ||
              attendance.statut === "present",
          ).length;
          const attendanceRate = courseAttendance.length
            ? `${Math.round((presentCount / courseAttendance.length) * 100)}%`
            : "Aucune donnée";
          const chef = users.find(
            (user) =>
              user.role === "chef_departement" &&
              ((course.chef_id && user.id === course.chef_id) ||
                (user.email &&
                  course.chef_email &&
                  user.email.toLowerCase() ===
                    course.chef_email.toLowerCase())),
          );
          const department =
            departments.find(
              (item) => item.id === course.departement_id,
            )?.nom ||
            course.faculte ||
            "Département non renseigné";

          return `
            <article class="rounded-2xl border border-zinc-800 bg-[#191919] p-5">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 class="font-bold text-gray-100">${escapeHtml(course.nom_cours || "Cours sans nom")}</h4>
                  <p class="text-xs text-brand mt-1">${escapeHtml(course.code_cours || "Code non renseigné")}</p>
                </div>
                <span class="text-xs rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-400">${escapeHtml(attendanceRate)} de présence</span>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs">
                ${detailField("Classe", course.classe)}
                ${detailField("Département", department)}
                ${detailField("Chef ayant assigné", chef ? fullName(chef) : "Chef indisponible")}
                ${detailField("Inscriptions", `${courseEnrollments.length} étudiant(s)`)}
                ${detailField("Dates", `Du ${course.date_debut || "Non renseignée"} au ${course.date_fin || "Non renseignée"}`)}
                ${detailField("Présences prises en compte", `${courseAttendance.length}`)}
              </div>
            </article>
          `;
        })
        .join("")
    : `<p class="text-sm text-zinc-500">Aucun cours assigné à ce professeur.</p>`;

  return `
    <section class="mt-8 border-t border-zinc-800 pt-6">
      <div class="flex items-center gap-2 mb-4">
        <i class="fa-solid fa-book-open text-emerald-400"></i>
        <h3 class="text-lg font-bold">Cours assignés</h3>
      </div>
      <div class="space-y-3">${content}</div>
    </section>
  `;
}

function closeProfessorModal() {
  document.getElementById("professor-modal").classList.add("hidden");
}

async function deleteUser(user) {
  const isProfessor = user.role === "professeur";
  const isChef = user.role === "chef_departement";
  const message = isProfessor
    ? `Supprimer définitivement le compte de ${fullName(user)} ?<br><br>
       Les inscriptions dans ses cours seront supprimées. Les cours et les présences seront conservés,
       mais le professeur sera marqué comme indisponible.`
    : isChef
      ? `Supprimer uniquement le compte de ${fullName(user)} ?<br><br>
         Le département, les classes, les cours, les inscriptions et les présences seront conservés.
         Le chef sera affiché comme indisponible.`
      : `Supprimer le compte de ${fullName(user)} ?`;

  if (
    !(await showConfirmDialog(message, {
      title: isProfessor
        ? "Suppression définitive du professeur"
        : isChef
          ? "Suppression du chef de département"
          : "Supprimer le compte",
      confirmLabel: "Supprimer définitivement",
    }))
  ) return;

  if (isProfessor) {
    const professorEmail = user.email ? user.email.toLowerCase() : "";
    const courseFilter = professorEmail
      ? `professeur_id.eq.${user.id},professeur_email.ilike.${professorEmail}`
      : `professeur_id.eq.${user.id}`;
    const { data: assignedCourses, error: coursesError } = await _supabase
      .from("cours")
      .select("code_cours")
      .or(courseFilter);
    if (coursesError) {
      console.error("Cours du professeur introuvables :", coursesError);
      showNotification("Impossible de préparer la suppression du professeur.", "error");
      return;
    }

    const courseCodes = (assignedCourses || [])
      .map((course) => course.code_cours)
      .filter(Boolean);
    if (courseCodes.length) {
      const { error: enrollmentsError } = await _supabase
        .from("inscriptions")
        .delete()
        .in("code_cours", courseCodes);
      if (enrollmentsError) {
        console.error("Inscriptions du professeur non supprimées :", enrollmentsError);
        showNotification("Impossible de supprimer les inscriptions du professeur.", "error");
        return;
      }

      const { error: coursesUpdateError } = await _supabase
        .from("cours")
        .update({ professeur_id: null })
        .in("code_cours", courseCodes);
      if (coursesUpdateError) {
        console.error("Désaffectation du professeur impossible :", coursesUpdateError);
        showNotification(
          "Suppression impossible. Exécutez d'abord la correction SQL du trigger des cours.",
          "error",
        );
        return;
      }
    }
  } else if (isChef) {
    const { error: coursesUpdateError } = await _supabase
      .from("cours")
      .update({ chef_id: null })
      .eq("chef_id", user.id);
    if (coursesUpdateError) {
      console.error("Cours du chef non désaffectés :", coursesUpdateError);
      showNotification("Impossible de désaffecter les cours du chef.", "error");
      return;
    }
  }

  const { error } = await _supabase.from("utilisateurs").delete().eq("id", user.id);
  if (error) {
    showNotification("Suppression impossible. Veuillez réessayer.", "error");
    return;
  }

  closeProfessorModal();
  showNotification("Compte supprimé.");
  await loadAdminData();
}

async function deleteUserById(userId) {
  const user = users.find((item) => item.id === userId);
  if (user) await deleteUser(user);
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".content-panel").forEach((panel) => {
    panel.classList.add("hidden");
  });

  document.getElementById(`content-${tab}`).classList.remove("hidden");

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.remove("active-tab");
  });

  document.getElementById(`btn-${tab}`).classList.add("active-tab");

  document.querySelectorAll('[id^="stat-card-"]').forEach((card) => {
    card.classList.remove("active-stat-card");
  });
  const statCard = document.getElementById(`stat-card-${tab}`);
  if (statCard) statCard.classList.add("active-stat-card");
}

function updateStats() {
  document.getElementById("stat-departements").textContent = departments.length;
  document.getElementById("stat-attente-chefs").textContent =
    pendingChefs.length;
  document.getElementById("stat-attente-professeurs").textContent =
    pendingProfessors.length;
  document.getElementById("stat-chefs").textContent = users.filter(
    (user) => user.role === "chef_departement",
  ).length;
  document.getElementById("stat-professeurs").textContent = users.filter(
    (user) => user.role === "professeur",
  ).length;
}

function showLoadingState() {
  document.getElementById("departments-container").innerHTML = loadingState();
  document.getElementById("professors-container").innerHTML = loadingState();
  document.getElementById("pending-chefs-container").innerHTML = loadingState();
  document.getElementById("pending-professors-container").innerHTML =
    loadingState();
  [
    "stat-departements",
    "stat-attente-chefs",
    "stat-attente-professeurs",
    "stat-chefs",
    "stat-professeurs",
  ].forEach((id) => {
    const stat = document.getElementById(id);
    if (stat) stat.innerHTML = loadingMarkup("", "sa-loading--compact");
  });
}

function renderPendingError(containerId, table, error) {
  document.getElementById(containerId).innerHTML = `
        <div class="border border-red-500/30 bg-red-500/5 rounded-2xl p-5 text-sm text-red-300">
            <i class="fa-solid fa-triangle-exclamation mr-2"></i>
            Impossible de charger ces inscriptions en attente.
            <p class="text-xs text-red-200/70 mt-3">
                Vérifiez votre connexion puis réessayez.
            </p>
        </div>
    `;
}

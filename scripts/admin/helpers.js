// Helpers d'affichage utilisés par le dashboard administrateur
function avatarMarkup(person, sizeClass) {
  const source = person.avatar_url || person.photo_profil;
  if (source) {
    return `<img src="${escapeHtml(source)}" alt="Photo de profil" class="${sizeClass} rounded-full object-cover border border-zinc-700 shrink-0">`;
  }
  return `<div class="${sizeClass} rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold text-xs shrink-0">${initials(person)}</div>`;
}

function pendingFields(record) {
  const fields = [
    ["Nom", record.nom],
    ["Postnom", record.postnom],
    ["Prénom", record.prenom],
    ["Matricule", record.matricule],
    ["Département", record.faculte],
    ["Email", record.email],
    ["Rôle", record.role],
    ["Code administratif", record.code_administratif],
    ["Photo de profil", record.photo_profil],
    ["Date de création", formatDate(record.date_creation)],
    ["ID", record.id],
  ];

  return fields.map(([label, value]) => detailField(label, value)).join("");
}

function detailField(label, value) {
  return `
        <div>
            <dt class="text-zinc-500">${escapeHtml(label)}</dt>
            <dd class="text-zinc-200 mt-1 break-all">${escapeHtml(value)}</dd>
        </div>
    `;
}

function departmentCoursesCount(department) {
  return department.classes.reduce(
    (total, item) => total + item.courses.length,
    0,
  );
}

function fullName(person) {
  return `${person.prenom || ""} ${person.postnom || ""} ${person.nom || ""}`.trim();
}

function initials(person) {
  return `${person.prenom?.[0] || ""}${person.nom?.[0] || ""}`.toUpperCase();
}

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "Non renseignée";
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "Non renseigné";
  return div.innerHTML;
}

function loadingState() {
  return `<p class="text-zinc-500 text-center py-10 text-xs">${loadingMarkup("Chargement...")}</p>`;
}

function emptyState(message) {
  return `<p class="text-zinc-500 text-center py-8 text-xs">${escapeHtml(message)}</p>`;
}

function closeDepartment() {
  document.getElementById("department-modal").classList.add("hidden");
}

function closeClass() {
  document.getElementById("class-modal").classList.add("hidden");
}

async function closeDashboard() {
  if (
    !(await showConfirmDialog("Quitter le tableau de bord administrateur ?", {
      title: "Fermer le dashboard",
      confirmLabel: "Quitter",
    }))
  )
    return;
  window.location.href = "../home.html";
}

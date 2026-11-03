// Point d'entrée du dashboard professeur
document.addEventListener("DOMContentLoaded", () => {
  if (
    !guardRole(
      "professeur",
      "../login.html",
      "Accès refusé : cette page est réservée aux professeurs.",
    )
  ) {
    return;
  }

  initializeProfessorSidebar();
  initializeProfessorProfile();
  loadProfessorCours();

  const searchCoursInput = document.getElementById("search-cours");
  if (searchCoursInput) {
    searchCoursInput.addEventListener("input", () =>
      applyProfessorCourseControls(),
    );
    searchCoursInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") searchProfessorCourses();
    });
  }

  const pageSizeInput = document.getElementById("prof-page-size");
  if (pageSizeInput) {
    pageSizeInput.addEventListener("change", () =>
      applyProfessorCourseControls(true),
    );
  }

  const updateProfileForm = document.getElementById("update-profile-form");
  if (updateProfileForm) {
    updateProfileForm.addEventListener("submit", handleProfileUpdate);
    initializeProfileSaveControls();
    initializeProfileEditModal();
  }
  document
    .getElementById("prof-course-search-button")
    ?.addEventListener("click", searchProfessorCourses);
});

function initializeProfessorSidebar() {
  const sidebar = document.getElementById("prof-sidebar");
  const toggle = document.getElementById("prof-sidebar-toggle");
  const shell = document.querySelector(".prof-shell");
  if (!sidebar || !toggle || !shell) return;

  const mobileViewport = window.matchMedia("(max-width: 767px)");
  const setOpen = (isOpen) => {
    sidebar.classList.toggle("is-open", mobileViewport.matches && isOpen);
    sidebar.inert = mobileViewport.matches && !isOpen;
    shell.classList.toggle("sidebar-collapsed", !mobileViewport.matches && !isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute(
      "aria-label",
      isOpen ? "Fermer le menu professeur" : "Ouvrir le menu professeur",
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
  const logoutButton = document.querySelector("#prof-top-actions .logout-button");
  if (themeSwitcher && logoutButton) logoutButton.before(themeSwitcher);
}

function closeProfessorSidebar() {
  const sidebar = document.getElementById("prof-sidebar");
  const toggle = document.getElementById("prof-sidebar-toggle");
  if (!sidebar || !toggle || !window.matchMedia("(max-width: 767px)").matches) return;

  sidebar.classList.remove("is-open");
  sidebar.inert = true;
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Ouvrir le menu professeur");
  toggle.querySelector("i")?.classList.add("fa-bars");
  toggle.querySelector("i")?.classList.remove("fa-xmark");
  toggle.focus();
}

function toggleProfessorDashboardMenu() {
  const dashboardButton = document.getElementById("btn-cours");
  const submenu = document.getElementById("prof-dashboard-submenu");
  const chevron = document.getElementById("prof-dashboard-chevron");
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

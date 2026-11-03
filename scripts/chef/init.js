// Point d'entrée du dashboard chef de département
document.addEventListener("DOMContentLoaded", () => {
  if (
    !guardRole(
      "chef_departement",
      "../login.html",
      "Accès refusé : cette page est réservée au chef de département.",
    )
  ) {
    return;
  }

  initializeChefProfile();
  initializeChefSidebar();
  setActiveDashboardStat("all");
  loadCourseClassOptions().catch((error) => {
    console.error("Erreur chargement des classes du département :", error);
    showNotification("Impossible de charger les classes du département.", "error");
    const options = document.getElementById("course-professor-options");
    if (options) {
      options.innerHTML =
        '<p class="px-3 py-2 text-xs text-red-400">Impossible de charger les professeurs.</p>';
    }
    const facultySelect = document.getElementById("course-faculty");
    if (facultySelect) {
      facultySelect.innerHTML =
        '<option value="">Impossible de charger le département.</option>';
    }
  });
  loadDepartmentCourses();
  loadDepartmentClasses();

  const searchCoursInput = document.getElementById("search-cours");
  if (searchCoursInput) {
    searchCoursInput.addEventListener("input", (e) =>
      filterCourses(e.target.value),
    );
    searchCoursInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") searchChefCourses();
    });
  }
  document
    .getElementById("course-search-button")
    ?.addEventListener("click", searchChefCourses);
  const coursePageSizeInput = document.getElementById("chef-course-page-size");
  if (coursePageSizeInput)
    coursePageSizeInput.addEventListener("change", () =>
      applyChefCourseControls(true),
    );

  const searchClassesInput = document.getElementById("search-classes");
  if (searchClassesInput) {
    searchClassesInput.addEventListener("input", (e) =>
      filterClasses(e.target.value),
    );
  }
  const classPageSizeInput = document.getElementById("chef-class-page-size");
  if (classPageSizeInput)
    classPageSizeInput.addEventListener("change", () =>
      applyChefClassControls(true),
    );
  const academicYearInput = document.getElementById("chef-class-academic-year");
  if (academicYearInput) {
    academicYearInput.addEventListener("change", () =>
      filterClasses(document.getElementById("search-classes")?.value || ""),
    );
  }

  const updateProfileForm = document.getElementById("update-profile-form");
  if (updateProfileForm) {
    updateProfileForm.addEventListener("submit", handleProfileUpdate);
    initializeProfileSaveControls();
    initializeProfileEditModal();
  }

  const createCourseForm = document.getElementById("create-course-form");
  if (createCourseForm) {
    createCourseForm.addEventListener("submit", handleCourseCreation);
  }
  initializeCourseProfessorPicker();
});

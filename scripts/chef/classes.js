// Gestion des classes (promotions) et liste des élèves par classe
let allClassesMap = {};
let chefClassPage = 1;

async function loadDepartmentClasses() {
  const container = document.getElementById("classes-container");
  if (!container) return;
  container.innerHTML = `<p class="text-zinc-500 text-center py-8 text-xs col-span-2">${loadingMarkup("Chargement des classes...")}</p>`;

  try {
    const { data: departmentClasses, error: classesError } = await _supabase
      .from("classes")
      .select("id, nom")
      .eq("departement_id", currentUser.departement_id)
      .order("nom");
    if (classesError) throw classesError;
    let query = _supabase
      .from("utilisateurs")
      .select(
        "id, role, nom, postnom, prenom, matricule, faculte, annee_etude, email, photo_profil, classe_id",
      )
      .eq("role", "etudiant");
    if (currentUser.faculte) query = query.eq("faculte", currentUser.faculte);

    const { data, error } = await query;
    if (error) throw error;

    const students = data || [];
    const { data: departmentCourses, error: coursesError } = await _supabase
      .from("cours")
      .select("code_cours, annee_academique")
      .eq("chef_id", currentUser.id);
    if (coursesError) throw coursesError;

    const courseYears = Object.fromEntries(
      (departmentCourses || []).map((c) => [c.code_cours, c.annee_academique]),
    );
    const departmentCourseCodes = Object.keys(courseYears);

    const { data: enrollments, error: enrollmentsError } =
      departmentCourseCodes.length > 0
        ? await _supabase
            .from("inscriptions")
            .select("code_cours, etudiant_id, etudiant_email")
            .in("code_cours", departmentCourseCodes)
        : { data: [] };
    if (enrollmentsError) throw enrollmentsError;

    const academicYearsByStudent = {};
    (enrollments || []).forEach((enrollment) => {
      const studentKey = enrollment.etudiant_id || enrollment.etudiant_email;
      const academicYear = courseYears[enrollment.code_cours];
      if (!studentKey || !academicYear) return;
      if (!academicYearsByStudent[studentKey])
        academicYearsByStudent[studentKey] = [];
      if (!academicYearsByStudent[studentKey].includes(academicYear)) {
        academicYearsByStudent[studentKey].push(academicYear);
      }
    });

    students.forEach((student) => {
      student.academic_years =
        academicYearsByStudent[student.id] ||
        academicYearsByStudent[student.email] ||
        [];
    });

    allClassesMap = {};
    (departmentClasses || []).forEach((departmentClass) => {
      allClassesMap[departmentClass.nom] = students.filter(
        (student) => student.classe_id === departmentClass.id ||
          (!student.classe_id && student.annee_etude === departmentClass.nom),
      );
    });

    displayClasses(allClassesMap);
  } catch (err) {
    console.error("Erreur chargement élèves:", err);
    container.innerHTML = `<p class="text-red-400 text-center py-8 text-xs col-span-2">Erreur lors du chargement des élèves.</p>`;
  }
}

function displayClasses(classesMap) {
  const container = document.getElementById("classes-container");
  if (!container) return;

  const classNames = Object.keys(classesMap);
  if (classNames.length === 0) {
    container.innerHTML = `<p class="text-zinc-500 text-center py-8 text-xs col-span-2">Aucun élève trouvé.</p>`;
    return;
  }

  container.innerHTML = classNames
    .map((className) => {
      const studentCount = classesMap[className].length;
      const encodedStudents = encodeURIComponent(
        JSON.stringify(classesMap[className]),
      );
      const academicYears = [
        ...new Set(
          classesMap[className].flatMap((s) => s.academic_years || []),
        ),
      ].sort();
      const academicYearLabel =
        academicYears.length > 0
          ? academicYears.join(", ")
          : "Année non spécifiée";

      return `
            <div onclick="openClassStudentsModal('${className}', '${encodedStudents}')" class="dashboard-hover-card cursor-pointer bg-[#202020] border border-zinc-800 rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-brand/50 transition-all">
                <div class="space-y-1">
                    <span class="text-xs font-mono bg-brand/10 text-brand px-2.5 py-1 rounded-full border border-brand/20">Promotion / Année</span>
                    <h3 class="text-base font-bold text-gray-100 mt-2">${className}</h3>
                    <p class="text-xs text-brand">Année académique : ${academicYearLabel}</p>
                    <p class="text-xs text-zinc-400"><span class="text-zinc-200 font-semibold">${studentCount}</span> élève(s) dans cette classe</p>
                </div>
                <button onclick="event.stopPropagation(); openClassStudentsModal('${className}', '${encodedStudents}')" class="px-4 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer whitespace-nowrap">
                    <i class="fa-solid fa-eye mr-1.5"></i> Voir les élèves
                </button>
            </div>`;
    })
    .join("");
  applyChefClassControls(true);
}

function applyChefClassControls(resetPage = false) {
  const container = document.getElementById("classes-container");
  const pagination = document.getElementById("chef-class-pagination");
  const pageSizeInput = document.getElementById("chef-class-page-size");
  if (!container || !pagination) return;

  if (resetPage) chefClassPage = 1;
  const cards = Array.from(container.children);
  const pageSize = Number(pageSizeInput?.value || 10);
  const pageCount = Math.max(1, Math.ceil(cards.length / pageSize));
  chefClassPage = Math.min(chefClassPage, pageCount);
  const start = (chefClassPage - 1) * pageSize;
  cards.forEach((card, index) =>
    card.classList.toggle("hidden", index < start || index >= start + pageSize),
  );

  pagination.innerHTML = `<span>${cards.length ? start + 1 : 0}-${Math.min(start + pageSize, cards.length)} sur ${cards.length}</span><div class="flex gap-2"><button type="button" ${chefClassPage === 1 ? "disabled" : ""} onclick="chefClassPage--; applyChefClassControls()" class="px-3 py-1.5 bg-zinc-800 rounded-lg disabled:opacity-40">Précédent</button><button type="button" ${chefClassPage === pageCount ? "disabled" : ""} onclick="chefClassPage++; applyChefClassControls()" class="px-3 py-1.5 bg-zinc-800 rounded-lg disabled:opacity-40">Suivant</button></div>`;
}

function filterClasses(searchTerm) {
  const term = searchTerm.toLowerCase();
  const academicYear =
    document.getElementById("chef-class-academic-year")?.value || "";
  const filteredMap = {};
  for (const [className, students] of Object.entries(allClassesMap)) {
    const matchingStudents = students.filter(
      (s) => !academicYear || s.academic_years.includes(academicYear),
    );
    if (className.toLowerCase().includes(term) && matchingStudents.length > 0) {
      filteredMap[className] = matchingStudents;
    }
  }
  displayClasses(filteredMap);
}

async function openClassStudentsModal(className, encodedStudents) {
  const modal = document.getElementById("class-students-modal");
  const titleEl = document.getElementById("detail-class-title");
  const infoEl = document.getElementById("detail-class-info");
  const badgeEl = document.getElementById("detail-class-badge");
  const studentsContainer = document.getElementById("class-students-container");
  if (!modal) return;

  const students = JSON.parse(decodeURIComponent(encodedStudents));
  badgeEl.innerText = "Année d'étude";
  titleEl.innerText = className;
  infoEl.innerText = `${students.length} élève(s) inscrit(s) dans cette promotion`;

  if (students.length === 0) {
    studentsContainer.innerHTML = `<p class="text-zinc-500 text-xs text-center py-4">Aucun élève trouvé.</p>`;
  } else {
    studentsContainer.innerHTML = `<p class="text-zinc-500 text-xs text-center py-4">${loadingMarkup("Chargement des inscriptions et présences...")}</p>`;
    const departmentCourseCodes = allCourses
      .map((c) => c.code_cours)
      .filter(Boolean);
    const courseNames = Object.fromEntries(
      allCourses.map((c) => [c.code_cours, c.nom_cours]),
    );

    const { data: enrollments, error: enrollmentsError } =
      departmentCourseCodes.length > 0
        ? await _supabase
            .from("inscriptions")
            .select("code_cours, etudiant_id, etudiant_email")
            .in("code_cours", departmentCourseCodes)
        : { data: [] };
    const { data: attendanceData, error: attendanceError } =
      departmentCourseCodes.length > 0
        ? await _supabase
            .from("presences")
            .select("code_cours, etudiant_id, email, statut")
            .in("code_cours", departmentCourseCodes)
        : { data: [] };
    if (enrollmentsError || attendanceError) {
      const error = enrollmentsError || attendanceError;
      console.error("Erreur chargement inscriptions/présences :", error);
      studentsContainer.innerHTML =
        '<p class="text-red-400 text-xs text-center py-4">Impossible de charger les inscriptions et présences.</p>';
      modal.classList.remove("hidden");
      return;
    }

    const htmlRows = students
      .map((student) => {
        const studentEnrollments = (enrollments || []).filter(
          (e) =>
            (e.etudiant_id && String(e.etudiant_id) === String(student.id)) ||
            (e.etudiant_email &&
              e.etudiant_email.toLowerCase() ===
                (student.email || "").toLowerCase()),
        );
        const courseSummary =
          studentEnrollments
            .map((enrollment) => {
              const attendance = (attendanceData || []).filter(
                (item) =>
                  item.code_cours === enrollment.code_cours &&
                  ((item.etudiant_id &&
                    String(item.etudiant_id) === String(student.id)) ||
                    (item.email &&
                      item.email.toLowerCase() ===
                        (student.email || "").toLowerCase())),
              );
              const presentCount = attendance.filter(
                (item) =>
                  item.statut === "Présent" || item.statut === "present",
              ).length;
              const callCount = attendance.filter((item) =>
                ["Présent", "present", "Absent", "absent"].includes(
                  item.statut,
                ),
              ).length;
              const percentage =
                callCount > 0
                  ? `${Math.round((presentCount / callCount) * 100)}%`
                  : "---";
              return `<div>${courseNames[enrollment.code_cours] || enrollment.code_cours} : <strong>${percentage}</strong></div>`;
            })
            .join("") || "---";

        return `
                <tr class="border-b border-zinc-800 hover:bg-zinc-800/30">
                    <td class="p-3.5 font-bold text-gray-200">${`${student.prenom || ""} ${student.postnom || ""} ${student.nom || ""}`.trim().toUpperCase()}</td>
                    <td class="p-3.5 text-zinc-400">${student.email || "---"}</td>
                    <td class="p-3.5 font-mono text-zinc-400">${student.matricule || "Non renseigné"}</td>
                    <td class="p-3.5 text-zinc-300"><strong>${studentEnrollments.length}</strong> cours<div class="mt-1 space-y-1 text-xs">${courseSummary}</div></td>
                </tr>`;
      })
      .join("");

    studentsContainer.innerHTML = `
            <div class="overflow-x-auto rounded-2xl border border-zinc-800 bg-[#191919]">
                <table class="w-full text-left border-collapse text-xs">
                    <thead class="bg-[#222222]"><tr class="border-b border-zinc-800">
                        <th class="p-3.5 font-bold text-zinc-300">Nom complet</th>
                        <th class="p-3.5 font-bold text-zinc-300">Email</th>
                        <th class="p-3.5 font-bold text-zinc-300">Matricule</th>
                        <th class="p-3.5 font-bold text-zinc-300">Cours inscrits / présence</th>
                    </tr></thead>
                    <tbody>${htmlRows}</tbody>
                </table>
            </div>`;
  }
  modal.classList.remove("hidden");
}

function toggleClassStudentsModal(show) {
  const modal = document.getElementById("class-students-modal");
  if (modal) modal.classList.toggle("hidden", !show);
}

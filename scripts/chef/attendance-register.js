// Modale plein écran : registre d'appel d'un cours avec export Excel/PDF
async function openViewCourseModal(courseId) {
  let modal = document.getElementById("view-course-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "view-course-modal";
    modal.className = "fixed inset-0 z-50 bg-[#121212] flex flex-col hidden";
    document.body.appendChild(modal);
  }

  // On recharge le cours depuis Supabase pour avoir les dates à jour
  let course = allCourses.find((c) => c.id == courseId || c.id === courseId);
  try {
    const { data: freshCourse, error: freshErr } = await _supabase
      .from("cours")
      .select("*")
      .eq("id", courseId)
      .single();
    if (freshErr) {
      console.warn("Cours non actualisé, utilisation des données affichées :", freshErr);
    } else if (freshCourse) {
      course = freshCourse;
    }
  } catch (err) {
    console.error("Erreur lors de l'actualisation du cours :", err);
  }
  if (!course) return;

  modal.className = "fixed inset-0 z-50 bg-[#121212] flex flex-col";
  modal.innerHTML = `
        <div class="p-4 md:p-6 bg-[#1a1a1a] border-b border-zinc-800 flex justify-between items-center shrink-0">
            <div>
                <span class="text-xs font-mono bg-brand/10 text-brand px-2.5 py-1 rounded-full border border-brand/20">${course.code_cours || "CODE"}</span>
                <h2 class="text-lg md:text-xl font-bold text-gray-100 mt-1" id="view-course-title">${course.nom_cours}</h2>
                <p class="text-xs text-zinc-400" id="view-course-subtitle">Registre officiel • Période : du ${course.date_debut || "---"} au ${course.date_fin || "---"} | Classe : ${course.classe || "Non renseignée"}</p>
            </div>
            <button onclick="toggleViewCourseModal(false)" class="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-all cursor-pointer">
                <i class="fa-solid fa-xmark text-lg"></i>
            </button>
        </div>
        <div class="flex-1 overflow-auto p-4 md:p-6" id="view-course-students-container">
            <p class="text-zinc-500 text-xs text-center py-10">${loadingMarkup("Chargement des élèves enregistrés...")}</p>
        </div>
        <div class="p-4 md:p-6 bg-[#1a1a1a] border-t border-zinc-800 flex justify-between items-center shrink-0 flex-wrap gap-3">
            <span class="text-xs text-zinc-400">Le taux de présence est calculé uniquement sur base des jours où l'appel a été effectué.</span>
            <div class="flex items-center gap-3">
                <button onclick="exportAttendanceExcel('${course.code_cours}', '${course.nom_cours}')" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2">
                    <i class="fa-solid fa-file-excel"></i> Exporter en Excel
                </button>
                <button onclick="exportAttendancePDF()" class="pdf-export-button px-4 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2">
                    <i class="fa-solid fa-file-pdf"></i> Exporter en PDF
                </button>
            </div>
        </div>
    `;

  attendanceExportContext = {
    courseName: course.nom_cours || "Cours",
    professorName:
      course.professeur?.toUpperCase() || "Professeur non renseigné",
    professorEmail: course.professeur_email || "Adresse e-mail non renseignée",
  };
  modal.classList.remove("hidden");

  try {
    const enrolledStudents = await fetchEnrolledStudents(course);
    const studentsContainer = document.getElementById(
      "view-course-students-container",
    );

    if (enrolledStudents.length === 0) {
      studentsContainer.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-center py-20">
                    <i class="fa-solid fa-users-slash text-4xl text-zinc-600 mb-3"></i>
                    <p class="text-zinc-400 text-sm font-semibold">Aucun élève ne s'est encore enregistré à ce cours.</p>
                </div>`;
      return;
    }

    studentsContainer.innerHTML = await buildChefAttendanceTable(
      course,
      enrolledStudents,
    );
  } catch (err) {
    console.error("Erreur chargement registre du cours:", err);
    document.getElementById("view-course-students-container").innerHTML =
      `<p class="text-red-400 text-xs text-center py-10">Erreur lors du chargement des données.</p>`;
  }
}

async function fetchEnrolledStudents(course) {
  const registeredStudentIds = new Set();

  const { data: enrollData, error: enrollmentsError } = await _supabase
    .from("inscriptions")
    .select("etudiant_id, etudiant_email")
    .eq("code_cours", course.code_cours);
  if (enrollmentsError) throw enrollmentsError;

  if (enrollData?.length) {
    enrollData.forEach((e) => {
      if (e.etudiant_id) registeredStudentIds.add(e.etudiant_id);
      if (e.etudiant_email) registeredStudentIds.add(e.etudiant_email);
    });
  } else {
    const { data: attDataCheck, error: attendanceLookupError } = await _supabase
      .from("presences")
      .select("etudiant_id, email")
      .eq("code_cours", course.code_cours);
    if (attendanceLookupError) throw attendanceLookupError;
    (attDataCheck || []).forEach((a) => {
      if (a.etudiant_id) registeredStudentIds.add(a.etudiant_id);
      if (a.email) registeredStudentIds.add(a.email);
    });
  }

  return allDepartmentStudents.filter(
    (s) => registeredStudentIds.has(s.id) || registeredStudentIds.has(s.email),
  );
}

async function buildChefAttendanceTable(course, enrolledStudents) {
  const attendanceMap = {};
  const { data: attendanceData, error: attendanceError } = await _supabase
    .from("presences")
    .select("*")
    .eq("code_cours", course.code_cours);
  if (attendanceError) throw attendanceError;
  (attendanceData || []).forEach((att) => {
    attendanceMap[`${att.etudiant_id || att.email}_${att.date}`] = att.statut;
  });

  const departmentCourseCodes = allCourses
    .map((c) => c.code_cours)
    .filter(Boolean);
  const courseNamesByCode = Object.fromEntries(
    allCourses.map((c) => [c.code_cours, c.nom_cours]),
  );

  const { data: allEnrollments, error: allEnrollmentsError } =
    departmentCourseCodes.length > 0
      ? await _supabase
          .from("inscriptions")
          .select("code_cours, etudiant_id, etudiant_email")
          .in("code_cours", departmentCourseCodes)
      : { data: [] };
  if (allEnrollmentsError) throw allEnrollmentsError;
  const { data: allAttendance, error: allAttendanceError } =
    departmentCourseCodes.length > 0
      ? await _supabase
          .from("presences")
          .select("code_cours, etudiant_id, email, statut")
          .in("code_cours", departmentCourseCodes)
      : { data: [] };
  if (allAttendanceError) throw allAttendanceError;

  const enrolledCoursesByStudent = {};
  (allEnrollments || []).forEach((enrollment) => {
    [enrollment.etudiant_id, enrollment.etudiant_email]
      .filter(Boolean)
      .forEach((studentKey) => {
        if (!enrolledCoursesByStudent[studentKey])
          enrolledCoursesByStudent[studentKey] = new Set();
        enrolledCoursesByStudent[studentKey].add(enrollment.code_cours);
      });
  });

  const attendanceByStudentAndCourse = {};
  (allAttendance || []).forEach((attendance) => {
    [attendance.etudiant_id, attendance.email]
      .filter(Boolean)
      .forEach((studentKey) => {
        const key = `${studentKey}_${attendance.code_cours}`;
        if (!attendanceByStudentAndCourse[key])
          attendanceByStudentAndCourse[key] = { present: 0, total: 0 };
        if (
          attendance.statut === "Présent" ||
          attendance.statut === "present"
        ) {
          attendanceByStudentAndCourse[key].present++;
          attendanceByStudentAndCourse[key].total++;
        } else if (
          attendance.statut === "Absent" ||
          attendance.statut === "absent"
        ) {
          attendanceByStudentAndCourse[key].total++;
        }
      });
  });

  const courseDates =
    course.date_debut && course.date_fin
      ? getDatesBetween(course.date_debut, course.date_fin)
      : [];
  const studiedDates = new Set();
  let totalPresent = 0;
  let totalMarked = 0;

  let html = `
        <div class="overflow-x-auto rounded-2xl border border-zinc-800 bg-[#191919]">
            <table class="w-full text-left border-collapse text-xs" id="attendance-table-element">
                <thead>
                    <tr class="border-b border-zinc-800 bg-[#222222]">
                        <th class="p-3.5 font-bold text-zinc-300 whitespace-nowrap">Nom complet</th>
                        <th class="p-3.5 font-bold text-zinc-300 whitespace-nowrap">Email</th>
                        <th class="p-3.5 font-bold text-zinc-300 whitespace-nowrap">Matricule</th>
                        <th class="p-3.5 font-bold text-zinc-300 whitespace-nowrap">Cours inscrits / présence</th>
                        <th class="p-3.5 font-bold text-brand text-center whitespace-nowrap border-l border-zinc-800">Taux de présence</th>
                        ${courseDates.map((d) => `<th class="p-3.5 font-mono font-bold text-brand text-center whitespace-nowrap border-l border-zinc-800">${d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}</th>`).join("")}
                        <th class="p-3.5 font-bold text-zinc-300 text-center whitespace-nowrap border-l border-zinc-800">Code carte</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-800">
    `;

  enrolledStudents.forEach((student) => {
    const fullName =
      `${student.prenom || ""} ${student.postnom || ""} ${student.nom || ""}`
        .trim()
        .toUpperCase();
    const studentCourses = Array.from(
      new Set([
        ...(enrolledCoursesByStudent[student.id] || []),
        ...(enrolledCoursesByStudent[student.email] || []),
      ]),
    );
    const courseSummary =
      studentCourses
        .map((courseCode) => {
          const courseStats =
            attendanceByStudentAndCourse[`${student.id}_${courseCode}`] ||
            attendanceByStudentAndCourse[`${student.email}_${courseCode}`];
          const pct = courseStats?.total
            ? Math.round((courseStats.present / courseStats.total) * 100)
            : null;
          return `${courseNamesByCode[courseCode] || courseCode} : ${pct === null ? "---" : pct + "%"}`;
        })
        .join("<br>") || "---";

    let presentCount = 0;
    let totalAppelsEffectues = 0;

    courseDates.forEach((d) => {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const status =
        attendanceMap[`${student.id}_${dateStr}`] ||
        attendanceMap[`${student.email}_${dateStr}`];
      if (status === "Présent" || status === "present") {
        presentCount++;
        totalAppelsEffectues++;
        totalPresent++;
        totalMarked++;
        studiedDates.add(dateStr);
      } else if (status === "Absent" || status === "absent") {
        totalAppelsEffectues++;
        totalMarked++;
        studiedDates.add(dateStr);
      }
    });

    const percentage =
      totalAppelsEffectues > 0
        ? Math.round((presentCount / totalAppelsEffectues) * 100)
        : null;
    let badgeColor = "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
    if (percentage !== null) {
      if (percentage < 50)
        badgeColor = "text-red-400 bg-red-500/10 border-red-500/20";
      else if (percentage < 75)
        badgeColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
      else
        badgeColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    }

    html += `
            <tr class="hover:bg-zinc-800/30 transition-all">
                <td class="p-3.5 font-bold text-gray-200 whitespace-nowrap">${fullName}</td>
                <td class="p-3.5 text-zinc-400 whitespace-nowrap">${student.email || "---"}</td>
                <td class="p-3.5 font-mono text-zinc-400 whitespace-nowrap">${student.matricule || "Non renseigné"}</td>
                <td class="p-3.5 text-zinc-300 whitespace-nowrap"><strong>${studentCourses.length}</strong> cours<br>${courseSummary}</td>
                <td class="p-3.5 text-center whitespace-nowrap border-l border-zinc-800">
                    <span class="px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${badgeColor}">${percentage !== null ? percentage + "%" : "---"}</span>
                </td>
        `;

    courseDates.forEach((d) => {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const status =
        attendanceMap[`${student.id}_${dateStr}`] ||
        attendanceMap[`${student.email}_${dateStr}`];
      let cellContent = `<span class="text-zinc-500 italic">Non pris</span>`;
      if (status === "Présent" || status === "present") {
        cellContent = `<span class="text-emerald-400 font-bold flex items-center justify-center gap-1"><i class="fa-solid fa-check"></i> Présent</span>`;
      } else if (status === "Absent" || status === "absent") {
        cellContent = `<span class="text-red-400 font-bold flex items-center justify-center gap-1"><i class="fa-solid fa-xmark"></i> Absent</span>`;
      }
      html += `<td class="p-3.5 text-center whitespace-nowrap border-l border-zinc-800/60">${cellContent}</td>`;
    });
    html += `<td class="p-3.5 font-mono text-zinc-400 text-center whitespace-nowrap border-l border-zinc-800">${escapeExportText(student.card_code || "Non renseigné")}</td>`;
    html += `</tr>`;
  });

  html += `
                </tbody>
            </table>
        </div>
        <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div class="bg-[#191919] border border-zinc-800 rounded-xl p-3 text-zinc-300">Jours du cours : <strong class="text-gray-100">${courseDates.length}</strong></div>
            <div class="bg-[#191919] border border-zinc-800 rounded-xl p-3 text-zinc-300">Jours étudiés : <strong class="text-gray-100">${studiedDates.size}</strong></div>
            <div class="bg-[#191919] border border-zinc-800 rounded-xl p-3 text-zinc-300">Taux global : <strong class="text-emerald-400">${totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) + "%" : "---"}</strong></div>
        </div>
    `;
  return html;
}

function toggleViewCourseModal(show) {
  const modal = document.getElementById("view-course-modal");
  if (modal) modal.classList.toggle("hidden", !show);
}

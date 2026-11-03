// Modale plein écran : registre d'appel (vue professeur)
async function openAttendanceRegisterModal(course) {
  let modal = document.getElementById("fullscreen-attendance-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "fullscreen-attendance-modal";
    modal.className = "fixed inset-0 z-50 bg-[#121212] flex flex-col hidden";
    document.body.appendChild(modal);
  }

  // Recharge le cours pour prendre en compte les modifications du chef
  let currentCourse = course;
  try {
    const { data: freshCourses, error: freshErr } = await _supabase
      .from("cours")
      .select("*")
      .eq("code_cours", course.code_cours)
      .limit(1);
    if (freshErr) {
      console.warn("Cours non actualisé, utilisation des données affichées :", freshErr);
    } else if (freshCourses?.length) {
      currentCourse = freshCourses[0];
    }
  } catch (err) {
    console.error("Erreur lors de l'actualisation du cours :", err);
  }

  modal.innerHTML = `
        <div class="p-4 md:p-6 bg-[#1a1a1a] border-b border-zinc-800 flex justify-between items-center shrink-0">
            <div>
                <span class="text-xs font-mono bg-brand/10 text-brand px-2.5 py-1 rounded-full border border-brand/20">${currentCourse.code_cours || "CODE"}</span>
                <h2 class="text-lg md:text-xl font-bold text-gray-100 mt-1">${currentCourse.nom_cours}</h2>
                <p class="text-xs text-zinc-400">Registre d'appel officiel • Période : Du ${currentCourse.date_debut || "---"} au ${currentCourse.date_fin || "---"}</p>
            </div>
            <button onclick="closeAttendanceRegisterModal()" class="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-all cursor-pointer">
                <i class="fa-solid fa-xmark text-lg"></i>
            </button>
        </div>
        <div class="flex-1 overflow-auto p-4 md:p-6" id="attendance-modal-body">
            <p class="text-zinc-500 text-xs text-center py-10">${loadingMarkup("Chargement du registre...")}</p>
        </div>
        <div class="p-4 md:p-6 bg-[#1a1a1a] border-t border-zinc-800 flex justify-between items-center shrink-0 flex-wrap gap-3">
            <span class="text-xs text-zinc-400">Les jours où l'appel n'a pas été effectué affichent « Non pris ».</span>
            <div class="flex items-center gap-3">
                <button onclick="exportAttendanceExcel('${currentCourse.code_cours}', '${currentCourse.nom_cours}')" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2">
                    <i class="fa-solid fa-file-excel"></i> Exporter en Excel
                </button>
                <button onclick="exportAttendancePDF()" class="pdf-export-button px-4 py-2.5 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2">
                    <i class="fa-solid fa-file-pdf"></i> Exporter en PDF
                </button>
            </div>
        </div>`;

  const professorName =
    `${currentUser.prenom || ""} ${currentUser.postnom || ""} ${currentUser.nom || ""}`
      .trim()
      .toUpperCase();
  attendanceExportContext = {
    courseName: currentCourse.nom_cours || "Cours",
    professorName,
    professorEmail: currentUser.email || "Adresse e-mail non renseignée",
  };
  modal.classList.remove("hidden");

  try {
    const { data: enrollments, error: enrollmentsError } = await _supabase
      .from("inscriptions")
      .select("etudiant_id, etudiant_email")
      .eq("code_cours", currentCourse.code_cours);

    if (enrollmentsError) throw enrollmentsError;

    if (!enrollments?.length) {
      document.getElementById("attendance-modal-body").innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-center py-20">
                    <i class="fa-solid fa-users-slash text-4xl text-zinc-600 mb-3"></i>
                    <p class="text-zinc-400 text-sm font-semibold">Aucun étudiant inscrit à ce cours pour le moment.</p>
                </div>`;
      return;
    }

    const studentIds = enrollments.map((e) => e.etudiant_id).filter(Boolean);
    const studentEmails = enrollments
      .map((e) => e.etudiant_email)
      .filter(Boolean);
    let students = [];

    if (studentIds.length) {
      const { data: sById, error: studentsByIdError } = await _supabase
        .from("utilisateurs")
        .select("id, nom, postnom, prenom, matricule, email, photo_profil, card_code")
        .eq("role", "etudiant")
        .in("id", studentIds);
      if (studentsByIdError) throw studentsByIdError;
      if (sById) students = students.concat(sById);
    }
    if (studentEmails.length) {
      const { data: sByEmail, error: studentsByEmailError } = await _supabase
        .from("utilisateurs")
        .select("id, nom, postnom, prenom, matricule, email, photo_profil, card_code")
        .eq("role", "etudiant")
        .in("email", studentEmails);
      if (studentsByEmailError) throw studentsByEmailError;
      if (sByEmail) {
        const existingIds = new Set(students.map((s) => s.id));
        sByEmail.forEach((s) => {
          if (!existingIds.has(s.id)) students.push(s);
        });
      }
    }

    const attendanceMap = {};
    const { data: attendanceData, error: attendanceError } = await _supabase
      .from("presences")
      .select("*")
      .eq("code_cours", currentCourse.code_cours);
    if (attendanceError) throw attendanceError;
    (attendanceData || []).forEach((att) => {
      attendanceMap[`${att.etudiant_id || att.email}_${att.date}`] = att.statut;
    });

    const courseDates =
      currentCourse.date_debut && currentCourse.date_fin
        ? getDatesBetween(currentCourse.date_debut, currentCourse.date_fin)
        : [];
    const studiedDates = new Set();
    let totalPresent = 0;
    let totalMarked = 0;

    let tableHtml = `
            <div class="overflow-x-auto rounded-2xl border border-zinc-800 bg-[#191919]">
                <table class="w-full text-left border-collapse text-xs" id="attendance-table-element">
                    <thead>
                        <tr class="border-b border-zinc-800 bg-[#222222]">
                            <th class="p-3.5 font-bold text-zinc-300 whitespace-nowrap">Nom complet</th>
                            <th class="p-3.5 font-bold text-zinc-300 whitespace-nowrap">Matricule</th>
                            <th class="p-3.5 font-bold text-brand text-center whitespace-nowrap border-l border-zinc-800">Taux de présence</th>
                            ${courseDates.map((d) => `<th class="p-3.5 font-mono font-bold text-brand text-center whitespace-nowrap border-l border-zinc-800">${d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })}</th>`).join("")}
                            <th class="p-3.5 font-bold text-zinc-300 text-center whitespace-nowrap border-l border-zinc-800">Code carte</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-800">`;

    students.forEach((student) => {
      const fullName =
        `${student.prenom || ""} ${student.postnom || ""} ${student.nom || ""}`
          .trim()
          .toUpperCase();
      const matricule = student.matricule || "Non renseigné";
      let presentCount = 0;
      let attendedCount = 0;

      courseDates.forEach((d) => {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const status =
          attendanceMap[`${student.id}_${dateStr}`] ||
          attendanceMap[`${student.email}_${dateStr}`];
        if (status === "Présent" || status === "present") {
          presentCount++;
          attendedCount++;
          totalPresent++;
          totalMarked++;
          studiedDates.add(dateStr);
        } else if (status === "Absent" || status === "absent") {
          attendedCount++;
          totalMarked++;
          studiedDates.add(dateStr);
        }
      });

      const percentage =
        attendedCount > 0
          ? Math.round((presentCount / attendedCount) * 100)
          : null;
      let percentageColor = "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
      if (percentage !== null) {
        if (percentage < 50)
          percentageColor = "text-red-400 bg-red-500/10 border-red-500/20";
        else if (percentage < 75)
          percentageColor =
            "text-amber-400 bg-amber-500/10 border-amber-500/20";
        else
          percentageColor =
            "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      }

      tableHtml += `
                <tr class="hover:bg-zinc-800/30 transition-all">
                    <td class="p-3.5 font-bold text-gray-200 whitespace-nowrap">${fullName}</td>
                    <td class="p-3.5 font-mono text-zinc-400 whitespace-nowrap">${matricule}</td>
                    <td class="p-3.5 text-center whitespace-nowrap border-l border-zinc-800">
                        <span class="px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${percentageColor}">${percentage !== null ? percentage + "%" : "---"}</span>
                    </td>`;

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
        tableHtml += `<td class="p-3.5 text-center whitespace-nowrap border-l border-zinc-800/60">${cellContent}</td>`;
      });
      tableHtml += `<td class="p-3.5 font-mono text-zinc-400 text-center whitespace-nowrap border-l border-zinc-800">${escapeAttendanceText(student.card_code || "Non renseigné")}<\/td>`;
      tableHtml += `</tr>`;
    });

    tableHtml += `
                    </tbody>
                </table>
            </div>
            <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div class="bg-[#191919] border border-zinc-800 rounded-xl p-3 text-zinc-300">Jours du cours : <strong class="text-gray-100">${courseDates.length}</strong></div>
                <div class="bg-[#191919] border border-zinc-800 rounded-xl p-3 text-zinc-300">Jours étudiés : <strong class="text-gray-100">${studiedDates.size}</strong></div>
                <div class="bg-[#191919] border border-zinc-800 rounded-xl p-3 text-zinc-300">Taux global : <strong class="text-emerald-400">${totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) + "%" : "---"}</strong></div>
            </div>`;

    document.getElementById("attendance-modal-body").innerHTML = tableHtml;
  } catch (err) {
    console.error("Erreur chargement registre d'appel :", err);
    document.getElementById("attendance-modal-body").innerHTML =
      `<p class="text-red-400 text-xs text-center py-10">Erreur lors du chargement des présences.</p>`;
  }
}

function closeAttendanceRegisterModal() {
  const modal = document.getElementById("fullscreen-attendance-modal");
  if (modal) modal.classList.add("hidden");
}

// Ouvre l'appel avec le code de carte enregistré dans card_code.
async function openLiveAttendanceModal(course) {
  let modal = document.getElementById("live-attendance-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "live-attendance-modal";
    modal.className =
      "fixed inset-0 z-50 bg-[#121212] flex flex-col hidden overflow-y-auto";
    document.body.appendChild(modal);
  }

  const today = getTodayDate();
  const todayLabel = formatAttendanceDate(today);
  const professorName =
    `${currentUser.prenom || ""} ${currentUser.postnom || ""} ${currentUser.nom || ""}`
      .trim()
      .toUpperCase();
  modal.innerHTML = `
        <div class="p-5 md:p-7 bg-[#1a1a1a] border-b border-zinc-800 shrink-0">
            <div class="flex justify-between items-start gap-5">
                <div class="min-w-0">
                    <span class="inline-flex text-xs font-mono bg-brand/10 text-brand px-2.5 py-1 rounded-full border border-brand/20">${escapeAttendanceText(course.code_cours || "CODE")}</span>
                    <h1 class="text-2xl md:text-4xl font-black text-gray-100 tracking-tight mt-3 break-words">${escapeAttendanceText(course.nom_cours || "Cours")}</h1>
                    <p class="text-sm text-zinc-400 mt-2">Session de prise de présence</p>
                </div>
                <button type="button" onclick="finishLiveAttendance()" class="shrink-0 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2">
                    <i class="fa-solid fa-check"></i> Finir l'appel
                </button>
            </div>
            <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div class="bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-3">
                    <p class="text-zinc-500 uppercase tracking-wider font-bold">Département</p>
                    <p class="text-zinc-200 font-semibold mt-1">${escapeAttendanceText(course.faculte || "Non renseigné")}</p>
                </div>
                <div class="bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-3">
                    <p class="text-zinc-500 uppercase tracking-wider font-bold">Classe</p>
                    <p class="text-zinc-200 font-semibold mt-1">${escapeAttendanceText(course.classe || "Non renseignée")}</p>
                </div>
                <div class="bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-3">
                    <p class="text-zinc-500 uppercase tracking-wider font-bold">Année académique</p>
                    <p class="text-zinc-200 font-semibold mt-1">${escapeAttendanceText(course.annee_academique || "Non renseignée")}</p>
                </div>
                <div class="bg-[#121212] border border-zinc-800 rounded-xl px-3.5 py-3">
                    <p class="text-zinc-500 uppercase tracking-wider font-bold">Professeur</p>
                    <p class="text-zinc-200 font-semibold mt-1">${escapeAttendanceText(professorName || "Non renseigné")}</p>
                </div>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-400">
                <span class="text-emerald-400 font-bold"><i class="fa-solid fa-calendar-day mr-1.5"></i>Date de l'appel : ${todayLabel}</span>
                <span><i class="fa-regular fa-calendar mr-1.5 text-brand"></i>Du ${escapeAttendanceText(course.date_debut || "---")} au ${escapeAttendanceText(course.date_fin || "---")}</span>
                <span><i class="fa-solid fa-key mr-1.5 text-brand"></i>Code d'accès : ${escapeAttendanceText(course.code_enregistrement || "Non renseigné")}</span>
            </div>
        </div>
        <div class="flex-1 p-6 max-w-5xl mx-auto w-full flex flex-col gap-6">
            <div class="bg-[#191919] border border-zinc-800 p-6 rounded-2xl shadow-lg">
                <label class="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-wider">Scanner la carte de l'étudiant</label>
                <input type="text" id="card-scan-input" placeholder="Saisissez le code de la carte..." maxlength="10" inputmode="numeric" autocomplete="off" autofocus
                    class="w-full bg-[#121212] border border-zinc-700 text-gray-100 px-4 py-3.5 rounded-xl text-lg font-mono focus:outline-none focus:border-brand transition-all shadow-inner">
            </div>
            <div id="live-feedback-container"></div>
            <div id="student-display-card" class="hidden bg-[#191919] border border-zinc-800 p-8 rounded-2xl shadow-2xl"></div>
        </div>`;

  modal.dataset.courseCode = course.code_cours;
  modal.classList.remove("hidden");

  const scanInput = document.getElementById("card-scan-input");
  scanInput?.focus();
  let scanTimer;
  let scanInProgress = false;
  const attendancePreparation = initializeTodayAbsences(course, today)
    .catch((error) => {
      console.error("Erreur lors de la préparation de l'appel :", error);
      const feedback = document.getElementById("live-feedback-container");
      if (feedback) {
        feedback.innerHTML =
          '<div class="bg-red-950/40 border border-red-500/40 text-red-300 p-4 rounded-2xl text-center text-sm font-semibold">Le registre quotidien n’est pas encore configuré. Exécutez la migration de présence fournie avec le projet.</div>';
      }
      return false;
    });
  const scheduleCardScan = () => {
    const cardCode = scanInput.value.replace(/\s/g, "").slice(0, 10);
    scanInput.value = cardCode;
    if (cardCode.length !== 10 || scanInProgress) return;
    clearTimeout(scanTimer);
    scanTimer = setTimeout(async () => {
      scanInProgress = true;
      try {
        await processStudentCardScan(cardCode, course, today);
      } catch (error) {
        console.error("Appel non enregistré :", error);
      } finally {
        scanInput.value = "";
        scanInput.focus();
        scanInProgress = false;
      }
    }, 120);
  };
  scanInput?.addEventListener("input", scheduleCardScan);
  scanInput?.addEventListener("keyup", scheduleCardScan);
}

function closeLiveAttendanceModal() {
  document.getElementById("live-attendance-modal")?.classList.add("hidden");
}

function finishLiveAttendance() {
  closeLiveAttendanceModal();
  showNotification("L'appel est terminé.");
}

// Prépare tous les inscrits avec le statut Absent, comme dans l'ancien appel.
async function initializeTodayAbsences(course, today) {
  const { data: enrollments, error } = await _supabase
    .from("inscriptions")
    .select("etudiant_id, etudiant_email")
    .eq("code_cours", course.code_cours);
  if (error) throw error;

  if (!enrollments?.length) return;

  const { data: existing, error: lookupError } = await _supabase
    .from("presences")
    .select("etudiant_id, email")
    .eq("code_cours", course.code_cours)
    .eq("date", today);
  if (lookupError) throw lookupError;

  const existingKeys = new Set(
    (existing || []).flatMap((attendance) =>
      [attendance.etudiant_id, attendance.email]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase()),
    ),
  );
  const missing = (enrollments || [])
    .filter((enrollment) => {
      const keys = [enrollment.etudiant_id, enrollment.etudiant_email]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return keys.length && !keys.some((key) => existingKeys.has(key));
    })
    .map((enrollment) => ({
      code_cours: course.code_cours,
      etudiant_id: enrollment.etudiant_id || null,
      email: enrollment.etudiant_email || null,
      date: today,
      statut: "Absent",
    }));

  if (missing.length) {
    const { error: insertError } = await _supabase
      .from("presences")
      .insert(missing);
    if (insertError) throw insertError;
  }
}

async function processStudentCardScan(cardCode, course, today) {
  const feedback = document.getElementById("live-feedback-container");
  const studentCard = document.getElementById("student-display-card");
  feedback.innerHTML = "";
  studentCard.classList.add("hidden");

  try {
    const normalizedCardCode = String(cardCode).replace(/\s/g, "");
    const { data: students, error } = await _supabase
      .from("utilisateurs")
      .select(
        "id, role, nom, postnom, prenom, matricule, faculte, annee_etude, email, photo_profil, card_code",
      )
      .eq("role", "etudiant")
      .eq("card_code", normalizedCardCode);
    if (error || !students?.length) {
      showNotRegisteredError(feedback);
      return;
    }

    const student = students[0];
    const { data: enrollmentCheck, error: enrollmentError } = await _supabase
      .from("inscriptions")
      .select("etudiant_id, etudiant_email")
      .eq("code_cours", course.code_cours)
      .or(`etudiant_id.eq.${student.id},etudiant_email.eq.${student.email}`);
    if (enrollmentError) throw enrollmentError;
    if (!enrollmentCheck?.length) {
      showNotRegisteredError(feedback);
      return;
    }

    const { data: existingAttendance, error: attendanceLookupError } =
      await _supabase
        .from("presences")
        .select("id, statut")
        .eq("code_cours", course.code_cours)
        .eq("date", today)
        .or(`etudiant_id.eq.${student.id},email.eq.${student.email}`);
    if (attendanceLookupError) throw attendanceLookupError;

    if (
      existingAttendance?.some(
        (attendance) =>
          attendance.statut === "Présent" || attendance.statut === "present",
      )
    ) {
      feedback.innerHTML =
        '<div class="bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 p-4 rounded-2xl text-center text-lg font-bold shadow-lg">Présence déjà enregistrée pour cet étudiant.</div>';
      showStudentPhoto(student, "Présent", studentCard);
      return;
    }

    const existingRecord = existingAttendance?.[0];
    const attendanceData = {
      statut: "Présent",
      etudiant_id: student.id,
      email: student.email || null,
    };
    const request = existingRecord
      ? _supabase
          .from("presences")
          .update(attendanceData)
          .eq("id", existingRecord.id)
      : _supabase
          .from("presences")
          .insert([
            { ...attendanceData, code_cours: course.code_cours, date: today },
          ]);
    const { error: attendanceError } = await request;
    if (attendanceError) throw attendanceError;

    feedback.innerHTML =
      '<div class="bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 p-4 rounded-2xl text-center text-lg font-bold shadow-lg animate-pulse">Présence enregistrée avec succès.</div>';
    showStudentFullDetails(student, studentCard);
  } catch (error) {
    console.error("Erreur lors du scan de la carte :", error);
    showNotRegisteredError(feedback);
  }
}

function showStudentPhoto(student, status, container) {
  const photo = student.photo_profil;
  const initials =
    `${student.prenom?.[0] || ""}${student.nom?.[0] || ""}`.toUpperCase();
  container.innerHTML = `
        <div class="flex flex-col items-center gap-6">
            <div class="w-72 h-96 md:w-96 md:h-[32rem] rounded-2xl overflow-hidden bg-zinc-800 border-2 border-zinc-700 shadow-2xl flex items-center justify-center">
                ${photo ? `<img src="${escapeAttendanceText(photo)}" alt="Photo de l'étudiant" class="w-full h-full object-cover">` : `<span class="text-brand font-bold text-6xl">${initials}</span>`}
            </div>
            <p class="text-lg font-bold text-emerald-400">Statut : ${status}</p>
        </div>`;
  container.classList.remove("hidden");
}

function showStudentFullDetails(student, container) {
  const photo = student.photo_profil;
  const initials =
    `${student.prenom?.[0] || ""}${student.nom?.[0] || ""}`.toUpperCase();
  const fullName =
    `${student.nom || ""} ${student.postnom || ""} ${student.prenom || ""}`
      .trim()
      .toUpperCase();
  const details = [
    ["Matricule", student.matricule],
    ["Département", student.faculte],
    ["Année d'étude", student.annee_etude],
    ["Code de carte", student.card_code],
    ["E-mail", student.email],
  ]
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<div class="flex justify-between gap-6 border-b border-zinc-800 py-2 text-sm"><span class="text-zinc-400">${label}</span><span class="text-gray-200 text-right break-all">${escapeAttendanceText(value)}</span></div>`,
    )
    .join("");
  container.innerHTML = `
        <div class="flex flex-col xl:flex-row gap-8 items-center xl:items-start">
            <div class="w-72 h-96 md:w-96 md:h-[32rem] rounded-2xl overflow-hidden bg-zinc-800 border-2 border-zinc-700 shadow-2xl flex items-center justify-center shrink-0">
                ${photo ? `<img src="${escapeAttendanceText(photo)}" alt="Photo de l'étudiant" class="w-full h-full object-cover">` : `<span class="text-brand font-bold text-6xl">${initials}</span>`}
            </div>
            <div class="flex-1 w-full bg-[#191919] border border-zinc-800 rounded-2xl p-6">
                <div class="border-b border-zinc-800 pb-4 mb-2"><h3 class="text-2xl font-black text-emerald-400 uppercase">${escapeAttendanceText(fullName)}</h3></div>
                ${details}
                <div class="flex justify-between gap-6 py-2 text-sm"><span class="text-zinc-400">Statut</span><span class="text-emerald-400 font-bold">Présent</span></div>
            </div>
        </div>`;
  container.classList.remove("hidden");
}

function showNotRegisteredError(container) {
  container.innerHTML =
    '<div class="bg-red-950/60 border border-red-500/50 text-red-400 p-6 rounded-2xl text-center text-lg md:text-xl font-bold shadow-xl leading-snug">Ce compte n\'est pas enregistré à ce cours, veuillez vous enregistrer et réessayer.</div>';
}

function getTodayDate() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function formatAttendanceDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function escapeAttendanceText(value) {
  const element = document.createElement("div");
  element.textContent = value ?? "";
  return element.innerHTML;
}

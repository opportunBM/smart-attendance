(() => {
  const idleLimitMs = 60 * 60 * 1000;
  const activityThrottleMs = 5000;
  const activityKey = "smart-attendance-last-activity";
  const expiredKey = "smart-attendance-session-expired";
  const validRoles = ["administrateur", "professeur", "chef_departement", "etudiant"];
  const loginUrl = new URL("../login.html", window.location.href);
  let timeoutId;
  let lastActivityAt;
  let lastActivityWriteAt = 0;
  let expired = false;

  let user;
  try {
    user = JSON.parse(localStorage.getItem("currentUser") || "null");
  } catch (error) {
    console.warn("Impossible de vérifier la session pour le délai d’inactivité.", error);
    return;
  }

  const hasValidUser = Boolean(
    user &&
      typeof user === "object" &&
      validRoles.includes(user.role) &&
      (user.id || user.user_id || user.email),
  );
  const alreadyExpired = Boolean(localStorage.getItem(expiredKey));

  if (!hasValidUser && !alreadyExpired) {
    return;
  }

  function getUserName() {
    return [user?.prenom, user?.nom].filter(Boolean).join(" ") || "Bonjour";
  }

  function showExpiredSession() {
    if (expired) return;
    expired = true;
    window.clearTimeout(timeoutId);
    localStorage.removeItem("currentUser");
    localStorage.removeItem(activityKey);

    const overlay = document.createElement("div");
    overlay.className =
      "fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm";
    overlay.setAttribute("role", "alertdialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "session-expired-title");
    overlay.innerHTML = `
      <section class="w-full max-w-md rounded-2xl border border-brand/30 bg-[#202020] p-6 text-center shadow-2xl shadow-brand/40 sm:p-8">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 text-brand">
          <i class="fa-solid fa-hourglass-end text-xl" aria-hidden="true"></i>
        </div>
        <h2 id="session-expired-title" class="mt-5 text-xl font-bold text-white">Votre session a expiré</h2>
        <p class="mt-3 text-sm leading-relaxed text-zinc-300"></p>
        <button type="button" class="mt-6 w-full rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 focus:ring-offset-[#202020]">
          <i class="fa-solid fa-right-to-bracket mr-2" aria-hidden="true"></i>Se reconnecter
        </button>
      </section>`;

    const message = overlay.querySelector("p");
    message.textContent =
      `${getUserName()}, votre session Smart Attendance s’est terminée après une heure d’inactivité. ` +
      "Pour protéger vos informations, vous avez été déconnecté. Reconnectez-vous pour reprendre votre activité.";

    overlay.querySelector("button").addEventListener("click", () => {
      localStorage.removeItem("currentUser");
      localStorage.removeItem(activityKey);
      window.location.assign(`${loginUrl.href}?session=expired`);
    });

    document.body.appendChild(overlay);
    overlay.querySelector("button").focus();
  }

  function scheduleExpiration() {
    window.clearTimeout(timeoutId);
    const elapsed = Date.now() - lastActivityAt;
    if (elapsed >= idleLimitMs) {
      localStorage.setItem(expiredKey, String(Date.now()));
      showExpiredSession();
      return;
    }

    timeoutId = window.setTimeout(scheduleExpiration, idleLimitMs - elapsed);
  }

  function recordActivity() {
    if (expired) return;

    lastActivityAt = Date.now();
    scheduleExpiration();

    if (lastActivityAt - lastActivityWriteAt >= activityThrottleMs) {
      localStorage.setItem(activityKey, String(lastActivityAt));
      lastActivityWriteAt = lastActivityAt;
    }
  }

  if (alreadyExpired) {
    showExpiredSession();
    return;
  }

  const storedActivity = Number(localStorage.getItem(activityKey));
  lastActivityAt =
    Number.isFinite(storedActivity) && storedActivity > 0
      ? storedActivity
      : Date.now();
  lastActivityWriteAt = lastActivityAt;
  scheduleExpiration();

  ["pointerdown", "keydown", "scroll", "touchstart", "click"].forEach((eventName) => {
    document.addEventListener(eventName, recordActivity, { passive: true });
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) scheduleExpiration();
  });

  window.addEventListener("storage", (event) => {
    if (event.key === expiredKey && event.newValue) {
      showExpiredSession();
      return;
    }

    if (event.key === activityKey && event.newValue) {
      const nextActivityAt = Number(event.newValue);
      if (Number.isFinite(nextActivityAt) && nextActivityAt > lastActivityAt) {
        lastActivityAt = nextActivityAt;
        scheduleExpiration();
      }
    }
  });

})();

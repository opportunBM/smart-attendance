function showNotification(message, type = "success") {
  let notifContainer = document.getElementById("toast-notification-container");
  if (!notifContainer) {
    notifContainer = document.createElement("div");
    notifContainer.id = "toast-notification-container";
    notifContainer.className =
      "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none w-[min(92vw,28rem)]";
    document.body.appendChild(notifContainer);
  }

  function safeErrorMessage(fallback = "Une erreur est survenue. Veuillez réessayer.") {
    return fallback;
  }

  const notif = document.createElement("div");
  notif.className = `pointer-events-auto relative overflow-hidden px-4 py-3 pb-4 rounded-xl border text-xs font-bold shadow-lg transition-all transform translate-y-2 opacity-0 flex items-center gap-2.5 ${
    type === "success"
      ? "bg-[#1a2e22] border-emerald-500/40 text-emerald-400"
      : "bg-[#2e1a1a] border-red-500/40 text-red-400"
  }`;

  notif.innerHTML = `
        <i class="fa-solid ${type === "success" ? "fa-circle-check text-emerald-400" : "fa-circle-exclamation text-red-400"} text-sm"></i>
        <span>${message}</span>
        <button type="button" class="notification-close ml-auto text-current/70 hover:text-current text-base leading-none" aria-label="Fermer">&times;</button>
      <span class="notification-progress absolute bottom-0 left-0 h-1 ${type === "success" ? "bg-emerald-400" : "bg-red-400"}"></span>
    `;

  notifContainer.appendChild(notif);
  const closeNotification = () => notif.remove();
  notif
    .querySelector(".notification-close")
    ?.addEventListener("click", closeNotification);
  notif
    .querySelector(".notification-progress")
    ?.animate([{ width: "100%" }, { width: "0%" }], {
      duration: 2000,
      easing: "linear",
    });

  setTimeout(() => notif.classList.remove("translate-y-2", "opacity-0"), 10);
  setTimeout(() => {
    notif.classList.add("translate-y-2", "opacity-0");
    setTimeout(() => notif.remove(), 300);
  }, 2000);
}

document.addEventListener("DOMContentLoaded", () => {
  const pendingMessage = sessionStorage.getItem(
    "smart-attendance-login-message",
  );
  if (!pendingMessage) return;
  sessionStorage.removeItem("smart-attendance-login-message");
  showNotification(pendingMessage, "success");
});

async function createNotification({
  userId,
  type = "info",
  title,
  message,
  link = null,
}) {
  if (!userId || !title || !message || typeof _supabase === "undefined")
    return null;

  const { data, error } = await _supabase
    .from("notifications")
    .insert([{ user_id: userId, type, title, message, link, is_read: false }])
    .select("id")
    .single();

  if (error) {
    console.warn("Notification non créée :", error.message);
    return null;
  }

  return data;
}

async function notifyUsersByRole({
  role,
  type = "info",
  title,
  message,
  link = null,
}) {
  if (!role || typeof _supabase === "undefined") return;

  const { data: users, error } = await _supabase
    .from("utilisateurs")
    .select("id")
    .eq("role", role);

  if (error) {
    console.error(
      "Erreur recherche destinataires notification :",
      error.message,
    );
    return;
  }

  await Promise.all(
    (users || []).map((user) =>
      createNotification({
        userId: user.id,
        type,
        title,
        message,
        link,
      }),
    ),
  );
}

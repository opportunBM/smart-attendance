const VALID_ROLES = [
  "professeur",
  "chef_departement",
  "etudiant",
  "administrateur",
];

function sanitizeUserSession(user) {
  if (!user || typeof user !== "object") return null;

  const role = typeof user.role === "string" ? user.role : "";
  if (!VALID_ROLES.includes(role)) return null;

  const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
  if (!email) return null;

  return {
    id: user.id ?? user.user_id ?? null,
    email,
    role,
    nom: user.nom ?? "",
    postnom: user.postnom ?? "",
    prenom: user.prenom ?? "",
    matricule: user.matricule ?? user.numero_etudiant ?? "",
    numero_etudiant: user.numero_etudiant ?? user.matricule ?? "",
    faculte: user.faculte ?? "",
    departement_id: user.departement_id ?? null,
    classe_id: user.classe_id ?? null,
    annee_etude: user.annee_etude ?? "",
    classe: user.classe ?? "",
    card_code: user.card_code ?? "",
    code_departement: user.code_departement ?? "",
    photo_profil: user.photo_profil ?? user.avatar_url ?? "",
  };
}

function showNotification(message, type = "success") {
  let container = document.getElementById("toast-notification-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-notification-container";
    container.className =
      "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none w-[min(92vw,28rem)]";
    document.body.appendChild(container);
  }
  const notification = document.createElement("div");
  notification.className = `pointer-events-auto relative overflow-hidden px-4 py-3 pb-4 rounded-xl border text-xs font-bold shadow-lg transition-all ${type === "success" ? "bg-[#1a2e22] border-emerald-500/40 text-emerald-400" : "bg-[#2e1a1a] border-red-500/40 text-red-400"}`;
  notification.innerHTML = `<i class="fa-solid ${type === "success" ? "fa-circle-check" : "fa-circle-exclamation"} mr-2"></i><span>${message}</span><button type="button" class="notification-close ml-auto text-current/70 hover:text-current text-base leading-none" aria-label="Fermer">&times;</button><span class="notification-progress absolute bottom-0 left-0 h-1 ${type === "success" ? "bg-emerald-400" : "bg-red-400"}"></span>`;
  container.appendChild(notification);
  notification
    .querySelector(".notification-close")
    ?.addEventListener("click", () => notification.remove());
  notification
    .querySelector(".notification-progress")
    ?.animate([{ width: "100%" }, { width: "0%" }], {
      duration: 2000,
      easing: "linear",
    });
  setTimeout(() => notification.remove(), 2000);
}

// --- Fonction pour afficher/masquer le mot de passe avec l'œil ---
function togglePassword() {
  const passwordInput = document.getElementById("password");
  const icon = document.getElementById("eye-icon");

  if (!passwordInput || !icon) return;

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    icon.innerHTML = '<i class="fa-regular fa-eye-slash" id="eye-closed"></i>';
  } else {
    passwordInput.type = "password";
    icon.innerHTML = '<i class="fa-regular fa-eye" id="eye-open"></i>';
  }
}

// ================= GESTION DE LA CONNEXION =================
document.addEventListener("DOMContentLoaded", () => {
  if (new URLSearchParams(window.location.search).get("session") === "expired") {
    showNotification(
      "Votre session Smart Attendance a expiré après une heure d’inactivité. Connectez-vous à nouveau pour continuer.",
      "error",
    );
  }

  const form = document.querySelector("form");

  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const email = document.getElementById("input-email").value.trim().toLowerCase();
      const mot_de_passe = document.getElementById("password").value;
      const btnSubmit = document.getElementById("btn-submit");

      if (!email || !mot_de_passe) {
        showNotification(
          "Veuillez remplir tous les champs de connexion.",
          "error",
        );
        return;
      }

      // --- ANIMATION DE CHARGEMENT SUR LE BOUTON ---
      const originalBtnText = btnSubmit.innerHTML;
      btnSubmit.disabled = true;
      btnSubmit.className =
        "w-full bg-brand/75 cursor-not-allowed text-white py-3 rounded-xl font-medium text-sm shadow-lg transition-all mt-2 flex items-center justify-center gap-2";
      btnSubmit.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Connexion en cours...`;

      const { data: users, error } = await _supabase
        .from("utilisateurs")
        .select("*")
        .eq("email", email)
        .limit(2);

      if (error) {
        console.error("Détail de l'erreur Supabase :", error);
        btnSubmit.disabled = false;
        btnSubmit.className =
          "w-full bg-brand hover:bg-brand-hover text-white py-3 rounded-xl font-medium text-sm shadow-lg transition-all mt-2 cursor-pointer";
        btnSubmit.innerHTML = originalBtnText;
        showNotification(
          "Impossible de vérifier les identifiants auprès de la base de données. Réessayez.",
          "error",
        );
        return;
      }

      const user = Array.isArray(users) && users.length === 1 ? users[0] : null;
      const storedPassword = typeof user?.mot_de_passe === "string" ? user.mot_de_passe : "";
      const passwordsMatch = storedPassword.length > 0 && storedPassword === mot_de_passe;

      if (!user || !passwordsMatch) {
        btnSubmit.disabled = false;
        btnSubmit.className =
          "w-full bg-brand hover:bg-brand-hover text-white py-3 rounded-xl font-medium text-sm shadow-lg transition-all mt-2 cursor-pointer";
        btnSubmit.innerHTML = originalBtnText;

        showNotification(
          "Échec de la connexion : vérifiez votre adresse e-mail et votre mot de passe.",
          "error",
        );
        return;
      }

      const safeUser = sanitizeUserSession(user);
      if (!safeUser) {
        btnSubmit.disabled = false;
        btnSubmit.className =
          "w-full bg-brand hover:bg-brand-hover text-white py-3 rounded-xl font-medium text-sm shadow-lg transition-all mt-2 cursor-pointer";
        btnSubmit.innerHTML = originalBtnText;

        showNotification(
          "La session reçue est invalide. Veuillez réessayer.",
          "error",
        );
        return;
      }

      localStorage.setItem("currentUser", JSON.stringify(safeUser));
      localStorage.setItem("smart-attendance-last-activity", String(Date.now()));
      localStorage.removeItem("smart-attendance-session-expired");
      sessionStorage.setItem(
        "smart-attendance-login-message",
        "Connexion réussie. Bienvenue dans votre espace.",
      );

      if (safeUser.role === "administrateur") {
        window.location.href = "admin/admin.html";
      } else if (safeUser.role === "professeur") {
        window.location.href = "admin/profDashboard.html";
      } else if (safeUser.role === "chef_departement") {
        window.location.href = "admin/chefDashboard.html";
      } else {
        window.location.href = "student/studentDashboard.html";
      }
    });
  }
});

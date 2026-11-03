// Theme global, avec sauvegarde locale et synchronisation Supabase.
(function () {
  const supabaseUrl = "https://utphktzhelqzdkbcbexb.supabase.co";
  const supabaseKey = "sb_publishable_fXEtG5jWI7KssD1iER8oqQ_JpYyMNRs";
  const storageKey = "smart-attendance-theme";
  let currentUser = null;

  try {
    const rawUser = localStorage.getItem("currentUser");
    if (rawUser) {
      const parsedUser = JSON.parse(rawUser);
      if (parsedUser && typeof parsedUser === "object" && typeof parsedUser.role === "string") {
        currentUser = parsedUser;
      } else {
        localStorage.removeItem("currentUser");
      }
    }
  } catch (error) {
    console.warn("Session utilisateur invalide pour le thème.", error);
    localStorage.removeItem("currentUser");
  }

  const validUserId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      currentUser?.id || "",
    );

  function applyTheme(theme) {
    const selectedTheme = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = selectedTheme;
    document.documentElement.classList.toggle("dark", selectedTheme === "dark");
    document.body.dataset.theme = selectedTheme;
    localStorage.setItem(storageKey, selectedTheme);

    const switcher = document.getElementById("theme-switcher");
    const icon = document.getElementById("theme-choice");
    if (switcher && icon) {
      icon.innerHTML =
        selectedTheme === "light"
          ? '<i class="fa-solid fa-sun"></i>'
          : '<i class="fa-solid fa-moon"></i>';
      switcher.setAttribute(
        "aria-label",
        selectedTheme === "light"
          ? "Activer le thème sombre"
          : "Activer le thème clair",
      );
      switcher.title = switcher.getAttribute("aria-label");
    }
  }

  async function loadSavedTheme() {
    const preferredTheme = window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
    let theme = localStorage.getItem(storageKey) || preferredTheme;
    applyTheme(theme);
    if (validUserId) {
      try {
        const response = await fetch(
          `${supabaseUrl}/rest/v1/user_themes?user_id=eq.${encodeURIComponent(currentUser.id)}&select=theme`,
          {
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
            },
          },
        );
        if (response.ok) {
          const data = await response.json();
          const savedTheme = Array.isArray(data) ? data[0]?.theme : null;
          if (savedTheme === "light" || savedTheme === "dark") theme = savedTheme;
        }
      } catch {
        // Le thème local reste la valeur de secours si Supabase est indisponible.
      }
    }
    applyTheme(theme);
  }

  loadSavedTheme();

  async function saveTheme(theme) {
    applyTheme(theme);
    if (!validUserId) return;
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/user_themes`, {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({ user_id: currentUser.id, theme }),
      });
      if (!response.ok) return;
    } catch {
      // Le changement local reste appliqué même si Supabase est indisponible.
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const switcher = document.createElement("button");
    switcher.id = "theme-switcher";
    switcher.type = "button";
    switcher.setAttribute("aria-label", "Activer le thème clair");
    switcher.innerHTML =
      '<span>Thème</span><span id="theme-choice" aria-hidden="true"><i class="fa-solid fa-moon"></i></span>';

    const dashboardCloseButton = document.querySelector(
      'body[data-theme-placement="dashboard"] .logout-button, body[data-theme-placement="dashboard"] [onclick="closeDashboard()"]',
    );
    if (dashboardCloseButton) {
      switcher.classList.add("dashboard-theme-switcher");
      dashboardCloseButton.parentElement.classList.add("theme-dashboard-actions");
      dashboardCloseButton.parentElement.insertBefore(switcher, dashboardCloseButton);
    } else {
      document.body.appendChild(switcher);
    }

    applyTheme(document.body.dataset.theme);

    if (document.body.dataset.themePlacement === "dashboard") {
      const updateDashboardThemeVisibility = () => {
        const openModal = document.querySelector('[id$="-modal"]:not(.hidden)');
        switcher.classList.toggle("dashboard-theme-hidden", Boolean(openModal));
      };

      const observer = new MutationObserver(updateDashboardThemeVisibility);
      observer.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class"],
      });
      updateDashboardThemeVisibility();
    }

    switcher.addEventListener("click", () => {
      const nextTheme = document.body.dataset.theme === "light" ? "dark" : "light";
      saveTheme(nextTheme);
    });
  });
})();

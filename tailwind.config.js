window.tailwind = window.tailwind || {};
window.tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "var(--sa-bg)",
        surface: "var(--sa-surface)",
        "surface-raised": "var(--sa-surface-raised)",
        "content-primary": "var(--sa-text)",
        "content-secondary": "var(--sa-muted)",
        brand: {
          DEFAULT: "var(--sa-accent)",
          hover: "var(--sa-accent-hover)",
          foreground: "var(--sa-accent-foreground)",
        },
        outline: "var(--sa-border)",
      },
    },
  },
};

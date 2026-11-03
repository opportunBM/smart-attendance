const loadingStyles = document.createElement("style");
loadingStyles.textContent = `
  .sa-loading {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
  }
  .sa-loading--center {
    display: flex;
    width: 100%;
  }
  .sa-loading--compact {
    gap: 0;
  }
  .sa-loading__spinner {
    display: inline-block;
    width: 0.95rem;
    height: 0.95rem;
    flex: 0 0 auto;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: sa-loading-spin 0.75s linear infinite;
  }
  .sa-loading--compact .sa-loading__spinner {
    width: 1.1rem;
    height: 1.1rem;
  }
  @keyframes sa-loading-spin {
    to { transform: rotate(360deg); }
  }
  @media (prefers-reduced-motion: reduce) {
    .sa-loading__spinner {
      animation: none;
    }
  }
`;
document.head.appendChild(loadingStyles);

function loadingMarkup(message, className = "") {
  const indicator = document.createElement("span");
  indicator.className = `sa-loading ${className}`.trim();
  indicator.setAttribute("role", "status");
  indicator.setAttribute("aria-live", "polite");

  const spinner = document.createElement("span");
  spinner.className = "sa-loading__spinner";
  spinner.setAttribute("aria-hidden", "true");
  indicator.append(spinner);

  if (message) {
    const label = document.createElement("span");
    label.textContent = message;
    indicator.append(label);
  } else {
    indicator.setAttribute("aria-label", "Chargement en cours");
  }

  return indicator.outerHTML;
}

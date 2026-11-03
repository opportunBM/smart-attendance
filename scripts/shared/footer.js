// Ajoute le footer commun à toutes les pages de l'application.
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('[data-site-footer]')) return;

    const isNestedPage = window.location.pathname.includes('/admin/') ||
        window.location.pathname.includes('/student/');
    const pagePrefix = isNestedPage ? '../' : '';
    const isDashboard = document.body.dataset.themePlacement === 'dashboard';
    const footerLinks = `
        <nav class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs" aria-label="Pied de page">
            ${isDashboard ? '' : `
                <a href="${pagePrefix}home.html" class="transition-colors hover:text-white">Accueil</a>
                <a href="${pagePrefix}more.html" class="transition-colors hover:text-white">À propos</a>
                <a href="${pagePrefix}login.html" class="transition-colors hover:text-white">Connexion</a>
            `}
            <a href="${pagePrefix}guide.html" class="footer-guide-link">Guide d’utilisation</a>
        </nav>`;
    const footer = document.createElement('footer');

    footer.dataset.siteFooter = 'true';
    footer.className = 'w-full mt-auto border-t border-zinc-800 bg-[#171717] px-5 py-7 text-zinc-400';
    footer.innerHTML = `
        <div class="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <a href="${pagePrefix}home.html" class="inline-flex items-center gap-2 text-sm font-bold text-zinc-100 transition-colors hover:text-brand">
                    <img src="${pagePrefix}assets/favicon/android-chrome-512x512.png" alt="" aria-hidden="true" class="h-8 w-8 rounded-lg object-contain shrink-0">
                    Smart Attendance
                </a>
                <p class="mt-2 text-xs text-zinc-500">Gestion simple et fiable des présences académiques.</p>
            </div>
            ${footerLinks}
        </div>
        <div class="mx-auto mt-5 max-w-6xl border-t border-zinc-800/80 pt-4 text-[11px] text-zinc-600 sm:flex sm:justify-between">
            <span>&copy; ${new Date().getFullYear()} Smart Attendance. Tous droits réservés.</span>
            <span class="mt-1 sm:mt-0">Développé par GreeCode</span>
        </div>
    `;

    document.body.classList.add('flex-col');
    document.body.appendChild(footer);
});
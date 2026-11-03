function switchTab(tabName) {
    const contentCours = document.getElementById('content-cours');
    const contentEleves = document.getElementById('content-eleves');
    const contentSecu = document.getElementById('content-secu');
    const dashboardButton = document.getElementById('btn-cours');
    const securityButton = document.getElementById('btn-secu');
    const sidebar = document.getElementById('chef-sidebar');
    const menuToggle = document.getElementById('chef-sidebar-toggle');

    if (contentCours) contentCours.classList.add('hidden');
    if (contentEleves) contentEleves.classList.add('hidden');
    if (contentSecu) contentSecu.classList.add('hidden');

    const statButtons = document.querySelectorAll('#chef-dashboard-submenu [data-stat-filter]');
    statButtons.forEach((button) => button.removeAttribute('aria-current'));

    if (tabName === 'cours') {
        contentCours?.classList.remove('hidden');
        dashboardButton?.setAttribute('aria-current', 'page');
        securityButton?.removeAttribute('aria-current');
        setActiveDashboardStat('all');
        document.querySelector('#chef-dashboard-submenu [data-stat-filter="all"]')?.setAttribute('aria-current', 'page');
    } else if (tabName === 'eleves') {
        contentEleves?.classList.remove('hidden');
        dashboardButton?.setAttribute('aria-current', 'page');
        securityButton?.removeAttribute('aria-current');
        setActiveDashboardStat('eleves');
        document.querySelector('#chef-dashboard-submenu [data-stat-filter="eleves"]')?.setAttribute('aria-current', 'page');
    } else if (tabName === 'secu') {
        contentSecu?.classList.remove('hidden');
        dashboardButton?.removeAttribute('aria-current');
        securityButton?.setAttribute('aria-current', 'page');
        setActiveDashboardStat('__none__');
    } else {
        return;
    }

    if (window.matchMedia('(max-width: 767px)').matches && sidebar?.classList.contains('is-open')) {
        sidebar.classList.remove('is-open');
        menuToggle?.setAttribute('aria-expanded', 'false');
    }
}

function toggleChefDashboardMenu() {
    const submenu = document.getElementById('chef-dashboard-submenu');
    const button = document.getElementById('btn-cours');
    const chevron = document.getElementById('chef-dashboard-chevron');
    if (!submenu || !button) return;

    const willExpand = submenu.classList.contains('hidden');
    submenu.classList.toggle('hidden', !willExpand);
    button.setAttribute('aria-expanded', String(willExpand));
    chevron?.classList.toggle('rotate-180', !willExpand);
}

function initializeChefSidebar() {
    const shell = document.querySelector('.chef-shell');
    const sidebar = document.getElementById('chef-sidebar');
    const toggle = document.getElementById('chef-sidebar-toggle');
    if (!shell || !sidebar || !toggle) return;

    const setMenuState = (isOpen) => {
        if (window.matchMedia('(max-width: 767px)').matches) {
            sidebar.classList.toggle('is-open', isOpen);
        } else {
            shell.classList.toggle('sidebar-collapsed', !isOpen);
        }
        toggle.setAttribute('aria-expanded', String(isOpen));
        toggle.setAttribute('aria-label', isOpen ? 'Fermer le menu du chef de département' : 'Ouvrir le menu du chef de département');
    };

    setMenuState(window.matchMedia('(min-width: 768px)').matches);

    toggle.addEventListener('click', () => {
        const isOpen = window.matchMedia('(max-width: 767px)').matches
            ? sidebar.classList.contains('is-open')
            : !shell.classList.contains('sidebar-collapsed');
        setMenuState(!isOpen);
    });

    document.addEventListener('pointerdown', (event) => {
        if (
            !window.matchMedia('(max-width: 767px)').matches ||
            !sidebar.classList.contains('is-open') ||
            !(event.target instanceof Node) ||
            sidebar.contains(event.target) ||
            toggle.contains(event.target)
        ) return;
        setMenuState(false);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && sidebar.classList.contains('is-open')) {
            setMenuState(false);
            toggle.focus();
        }
    });

    window.matchMedia('(min-width: 768px)').addEventListener('change', (event) => {
        sidebar.classList.remove('is-open');
        shell.classList.toggle('sidebar-collapsed', !event.matches);
        toggle.setAttribute('aria-expanded', String(event.matches));
        toggle.setAttribute('aria-label', event.matches ? 'Fermer le menu du chef de département' : 'Ouvrir le menu du chef de département');
    });
}

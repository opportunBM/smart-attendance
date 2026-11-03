function switchTab(tabName) {
    const contentCours = document.getElementById('content-cours');
    const contentSecu = document.getElementById('content-secu');
    const btnCours = document.getElementById('btn-cours');
    const btnSecu = document.getElementById('btn-secu');

    const showCourses = tabName === 'cours';
    const showProfile = tabName === 'secu';
    if (!showCourses && !showProfile) return;

    contentCours?.classList.toggle('hidden', !showCourses);
    contentSecu?.classList.toggle('hidden', !showProfile);
    btnCours?.toggleAttribute('aria-current', showCourses);
    btnSecu?.toggleAttribute('aria-current', showProfile);
    if (showCourses) btnCours?.setAttribute('aria-current', 'page');
    if (showProfile) btnSecu?.setAttribute('aria-current', 'page');
    closeStudentSidebar();
}
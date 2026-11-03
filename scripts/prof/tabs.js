function switchTab(tab) {
    const contentCours = document.getElementById('content-cours');
    const contentSecu = document.getElementById('content-secu');
    const btnCours = document.getElementById('btn-cours');
    const btnSecu = document.getElementById('btn-secu');
    if (!contentCours || !contentSecu || !btnCours || !btnSecu) return;

    if (tab === 'cours') {
        contentCours.classList.remove('hidden');
        contentCours.classList.add('block');
        contentSecu.classList.remove('block');
        contentSecu.classList.add('hidden');
        btnCours.setAttribute('aria-current', 'page');
        btnSecu.removeAttribute('aria-current');
    } else if (tab === 'secu') {
        contentSecu.classList.remove('hidden');
        contentSecu.classList.add('block');
        contentCours.classList.remove('block');
        contentCours.classList.add('hidden');
        btnSecu.setAttribute('aria-current', 'page');
        btnCours.removeAttribute('aria-current');
        closeProfessorSidebar();
    }
}

// Ferme la modale secondaire conservee dans le HTML du dashboard professeur.
function toggleCourseDetailsModal(show) {
    const modal = document.getElementById('course-details-modal');
    if (modal) modal.classList.toggle('hidden', !show);
}

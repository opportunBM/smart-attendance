// Vérifie si un cours correspond au filtre de statut (actif, terminé, à venir)
function courseMatchesStatus(course, status) {
    if (!course || status === 'all') return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = course.date_debut ? new Date(course.date_debut) : null;
    const end = course.date_fin ? new Date(course.date_fin) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(0, 0, 0, 0);

    if (status === 'upcoming') return start && start > today;
    if (status === 'completed') return end && end < today;
    return (!start || start <= today) && (!end || end >= today);
}

// Compte les cours actifs, terminés et à venir pour les statistiques du dashboard
function countCourseStats(courses) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const active = courses.filter(c => {
        const start = c.date_debut ? new Date(c.date_debut) : null;
        const end = c.date_fin ? new Date(c.date_fin) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(0, 0, 0, 0);
        return (!start || start <= today) && (!end || end >= today);
    }).length;

    const completed = courses.filter(c => {
        if (!c.date_fin) return false;
        const end = new Date(c.date_fin);
        end.setHours(0, 0, 0, 0);
        return end < today;
    }).length;

    const upcoming = courses.filter(c => {
        if (!c.date_debut) return false;
        const start = new Date(c.date_debut);
        start.setHours(0, 0, 0, 0);
        return start > today;
    }).length;

    return { active, completed, upcoming };
}

// Badge coloré selon l'état du cours (en cours, fini, bientôt)
function getCourseStatusBadge(course) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = course.date_debut ? new Date(course.date_debut) : null;
    const endDate = course.date_fin ? new Date(course.date_fin) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(0, 0, 0, 0);

    if (startDate && startDate > today) {
        return `<span class="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 font-medium">commence bientot</span>`;
    }
    if (endDate && endDate < today) {
        return `<span class="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20 font-medium">fini</span>`;
    }
    return `<span class="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium">en cours</span>`;
}

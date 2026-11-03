// Gère la carte statistique active sur les dashboards.
function setActiveDashboardStat(filter) {
    const colorClasses = {
        brand: ['ring-brand/70', 'border-brand'],
        emerald: ['ring-emerald-500/70', 'border-emerald-500'],
        red: ['ring-red-500/70', 'border-red-500'],
        blue: ['ring-blue-500/70', 'border-blue-500']
    };
    document.querySelectorAll('[data-stat-filter]').forEach(card => {
        const isActive = card.dataset.statFilter === filter;
        const color = card.dataset.statColor || 'brand';
        card.classList.toggle('ring-2', isActive);
        Object.values(colorClasses).flat().forEach(className => {
            card.classList.remove(className);
        });
        if (isActive) {
            const activeClasses = colorClasses[color] || colorClasses.brand;
            activeClasses.forEach(className => card.classList.add(className));
        }
        card.classList.toggle('shadow-lg', isActive);
    });
}

document.addEventListener('DOMContentLoaded', () => setActiveDashboardStat('all'));
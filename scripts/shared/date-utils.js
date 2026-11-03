// Génère la liste de toutes les dates entre deux dates (incluses)
function getDatesBetween(startDateStr, endDateStr) {
    const dates = [];
    if (!startDateStr || !endDateStr) return dates;

    const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);

    let curr = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);

    while (curr <= end) {
        dates.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
    }
    return dates;
}

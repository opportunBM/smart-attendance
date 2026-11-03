// Contexte partagé pour l'export Excel/PDF du registre d'appel
let attendanceExportContext = {};

function exportAttendanceExcel(courseCode, courseName) {
    const table = document.getElementById('attendance-table-element');
    if (!table) {
        showNotification("Aucune donnée à exporter.", "error");
        return;
    }

    const exportData = buildAttendanceExportData(table, courseCode, courseName);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" +
        exportData.rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';')).join("\r\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Registre_Appel_${courseCode || 'Cours'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification("Exportation Excel (CSV) réussie !");
}

function exportAttendancePDF() {
    const table = document.getElementById('attendance-table-element');
    if (!table) {
        showNotification("Aucune donnée à exporter.", "error");
        return;
    }

    const exportData = buildAttendanceExportData(table);
    const printWindow = document.createElement('div');
    printWindow.id = 'attendance-print-view';
    printWindow.innerHTML = `<style>
        #attendance-print-view{background:#fff;color:#111;padding:24px;font-family:Arial,sans-serif}#attendance-print-view h1{font-size:20px;margin:0 0 8px}#attendance-print-view p{margin:4px 0;font-size:12px}#attendance-print-view table{width:100%;border-collapse:collapse;margin-top:18px;font-size:11px}#attendance-print-view th,#attendance-print-view td{border:1px solid #bbb;padding:7px;text-align:center}#attendance-print-view th{background:#eee}.attendance-present{color:#008f39;font-weight:700}.attendance-absent{color:#d00000;font-weight:700}.attendance-unrecorded{color:#111;font-weight:700}@media print{body>*:not(#attendance-print-view){display:none!important}}
    </style><h1>${escapeExportText(exportData.title)}</h1><p>Professeur : ${escapeExportText(exportData.professorName)}</p><p>E-mail : ${escapeExportText(exportData.professorEmail)}</p><table><thead><tr>${exportData.headers.map(header => `<th>${escapeExportText(header)}</th>`).join('')}</tr></thead><tbody>${exportData.htmlRows}</tbody></table>`;
    document.body.appendChild(printWindow);
    window.addEventListener('afterprint', () => printWindow.remove(), { once: true });
    window.print();
}

function buildAttendanceExportData(table, courseCode, courseName) {
    const headers = Array.from(table.querySelectorAll('thead th')).map(header => header.innerText.trim());
    const nameIndex = headers.findIndex(header => header.toLowerCase().includes('nom complet'));
    const matriculeIndex = headers.findIndex(header => header.toLowerCase().includes('matricule'));
    const rateIndex = headers.findIndex(header => header.toLowerCase().includes('taux'));
    const cardCodeIndex = headers.findIndex(header => header.toLowerCase().includes('code carte'));
    const dayHeaders = headers.slice(rateIndex + 1, cardCodeIndex >= 0 ? cardCodeIndex : headers.length).map((_, index) => `Jour ${index + 1}`);
    const exportHeaders = ['Nom complet', 'Matricule', ...dayHeaders, ...(cardCodeIndex >= 0 ? ['Code carte'] : [])];
    const rows = [
        ['Cours', attendanceExportContext.courseName || courseName || courseCode || 'Cours'],
        ['Professeur', attendanceExportContext.professorName || 'Professeur'],
        ['E-mail', attendanceExportContext.professorEmail || 'Adresse e-mail non renseignée'],
        [],
        exportHeaders
    ];
    const htmlRows = [];

    Array.from(table.querySelectorAll('tbody tr')).forEach(row => {
        const cells = Array.from(row.cells);
        const values = [cells[nameIndex]?.innerText.trim() || '', cells[matriculeIndex]?.innerText.trim() || ''];
        const htmlValues = [escapeExportText(values[0]), escapeExportText(values[1])];

        for (let index = rateIndex + 1; index < (cardCodeIndex >= 0 ? cardCodeIndex : cells.length); index++) {
            const text = cells[index].innerText.trim();
            const status = text.toLowerCase().includes('présent') ? '✓' : text.toLowerCase().includes('absent') ? '✗' : '—';
            values.push(status);
            const icon = status === '✓'
                ? '<i class="fa-solid fa-check attendance-present" aria-label="Présent"></i>'
                : status === '✗'
                    ? '<i class="fa-solid fa-xmark attendance-absent" aria-label="Absent"></i>'
                    : '<span class="attendance-unrecorded" aria-label="Non pris">—</span>';
            htmlValues.push(icon);
        }
        if (cardCodeIndex >= 0) {
            const cardCode = cells[cardCodeIndex]?.innerText.trim() || '';
            values.push(cardCode);
            htmlValues.push(escapeExportText(cardCode));
        }
        rows.push(values);
        htmlRows.push(`<tr><td>${htmlValues.join('</td><td>')}</td></tr>`);
    });

    return {
        title: attendanceExportContext.courseName || courseName || courseCode || 'Registre d\'appel',
        professorName: attendanceExportContext.professorName || 'Professeur',
        professorEmail: attendanceExportContext.professorEmail || 'Adresse e-mail non renseignée',
        headers: exportHeaders,
        rows,
        htmlRows
    };
}

function escapeExportText(value) {
    return String(value).replace(/[&<>"']/g, character =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]
    );
}

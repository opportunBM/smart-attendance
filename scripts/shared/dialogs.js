// Dialogues de confirmation cohérents avec le thème de l'application.
window.showConfirmDialog = function (message, options = {}) {
    return new Promise(resolve => {
        const dialog = document.createElement('div');
        dialog.className = 'fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4';
        const danger = options.danger !== false;
        dialog.innerHTML = `<div class="w-full max-w-sm rounded-2xl border border-zinc-700 bg-[#202020] p-6 shadow-2xl"><div class="flex h-11 w-11 items-center justify-center rounded-xl ${danger ? 'bg-red-500/10 text-red-400' : 'bg-brand/10 text-brand'}"><i class="fa-solid ${danger ? 'fa-triangle-exclamation' : 'fa-circle-question'}"></i></div><h3 class="mt-4 text-lg font-bold text-gray-100">${options.title || 'Confirmation'}</h3><p class="mt-2 text-sm text-zinc-400">${message}</p><div class="mt-6 flex justify-end gap-2"><button type="button" data-dialog-cancel class="rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-hover">Annuler</button><button type="button" data-dialog-ok class="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-700">${options.confirmLabel || 'Confirmer'}</button></div></div>`;
        document.body.appendChild(dialog);
        const close = value => { dialog.remove(); resolve(value); };
        dialog.querySelector('[data-dialog-cancel]').onclick = () => close(false);
        dialog.querySelector('[data-dialog-ok]').onclick = () => close(true);
    });
};

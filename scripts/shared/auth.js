function getSafeCurrentUser() {
    try {
        const rawUser = localStorage.getItem('currentUser');
        if (!rawUser) return null;

        const parsedUser = JSON.parse(rawUser);
        if (!parsedUser || typeof parsedUser !== 'object') {
            localStorage.removeItem('currentUser');
            return null;
        }

        const validRoles = ['administrateur', 'professeur', 'chef_departement', 'etudiant'];
        const hasIdentity = parsedUser.id || parsedUser.user_id || parsedUser.email;

        if (!hasIdentity || typeof parsedUser.role !== 'string' || !validRoles.includes(parsedUser.role)) {
            localStorage.removeItem('currentUser');
            return null;
        }

        return parsedUser;
    } catch (error) {
        console.warn('Session invalide : stockage local corrompu.', error);
        localStorage.removeItem('currentUser');
        return null;
    }
}

// Session utilisateur stockée dans le navigateur après connexion
let currentUser = getSafeCurrentUser();

// Vérifie le rôle et redirige vers la page de connexion si accès refusé
function guardRole(requiredRole, loginPath, errorMessage) {
    if (localStorage.getItem('smart-attendance-session-expired')) return false;

    const user = getSafeCurrentUser();
    if (!user || user.role !== requiredRole) {
        localStorage.removeItem('currentUser');
        if (typeof showNotification === 'function') {
            showNotification(errorMessage, 'error');
        }
        setTimeout(() => { window.location.href = loginPath; }, 1200);
        return false;
    }

    currentUser = user;
    return true;
}

async function logout(loginPath = '../login.html') {
    if (!(await showConfirmDialog("Voulez-vous vraiment vous déconnecter ?", { title: 'Déconnexion', danger: false, confirmLabel: 'Se déconnecter' }))) return;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('smart-attendance-last-activity');
    localStorage.removeItem('smart-attendance-session-expired');
    sessionStorage.removeItem('smart-attendance-login-message');
    window.location.href = loginPath;
}

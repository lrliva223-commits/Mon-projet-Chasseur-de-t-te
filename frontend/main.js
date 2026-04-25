// ══════════════════════════════════════════════════
// HeadHunter — main.js  (JS vanilla partagé)
// ══════════════════════════════════════════════════

const API_BASE = 'http://localhost:5000';
const API = `${API_BASE}/api/v1`;

/* ─── Token helpers ─────────────────────────────── */
const auth = {
  getToken:   ()      => localStorage.getItem('accessToken'),
  getUser:    ()      => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } },
  setSession: (data)  => { localStorage.setItem('accessToken', data.accessToken); localStorage.setItem('refreshToken', data.refreshToken); localStorage.setItem('user', JSON.stringify(data.user)); },
  clear:      ()      => { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); localStorage.removeItem('user'); },
  isLogged:   ()      => !!localStorage.getItem('accessToken'),
};

/* ─── Fetch wrapper avec auth ───────────────────── */
async function apiFetch(path, options = {}) {
  const token = auth.getToken();
  const isFormData = options.body && (options.body instanceof FormData || options.body.constructor.name === 'FormData');
  
  const headers = isFormData 
    ? { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
    : { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
  
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  });
  if (res.status === 401) { 
    console.warn('Session expirée ou invalide (401). Déconnexion automatique.');
    auth.clear(); window.location.href = 'login.html'; return; 
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

/* ─── Toast notifications ───────────────────────── */
const Toast = (() => {
  let container;
  const init = () => {
    if (!container) { container = document.createElement('div'); container.className = 'toast-container'; document.body.appendChild(container); }
  };
  const show = (msg, type = 'info', duration = 3500) => {
    init();
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), duration);
  };
  return { success: m => show(m, 'success'), error: m => show(m, 'error'), info: m => show(m, 'info') };
})();

/* ─── Hamburger menu ────────────────────────────── */
const ham = document.getElementById('hamburger');
const nav = document.getElementById('navLinks');
ham?.addEventListener('click', () => nav?.classList.toggle('open'));

/* ─── Navbar : afficher user connecté ───────────── */
(function updateNavbar() {
  const navAuth = document.getElementById('navAuth');
  if (!navAuth) return;
  const user = auth.getUser();
  if (user) {
    const dashMap = { candidat: 'dashboard-candidat.html', recruteur: 'dashboard-recruteur.html', entreprise: 'dashboard-entreprise.html', admin: 'dashboard-admin.html' };
    navAuth.innerHTML = `
      <a href="${dashMap[user.role] || '#'}" class="btn btn-outline">Mon espace</a>
      <button onclick="logout()" class="btn btn-outline">Déconnexion</button>`;
  }
})();

function logout() {
  auth.clear();
  window.location.href = 'index.html';
}

/* ─── Validation helpers ────────────────────────── */
const validate = {
  required: (v) => v?.trim() ? null : 'Ce champ est requis.',
  email:    (v) => /^\S+@\S+\.\S+$/.test(v) ? null : 'Email invalide.',
  minLen:   (v, n) => v?.length >= n ? null : `Minimum ${n} caractères.`,
  match:    (a, b) => a === b ? null : 'Les mots de passe ne correspondent pas.',
};

function showError(fieldId, msg) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.classList.add('error');
  let err = el.nextElementSibling;
  if (!err || !err.classList.contains('form-error')) {
    err = document.createElement('p'); err.className = 'form-error'; el.parentNode.insertBefore(err, el.nextSibling);
  }
  err.textContent = msg;
}
function clearErrors() {
  document.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));
  document.querySelectorAll('.form-error').forEach(el => el.remove());
}

/* ─── Format date ───────────────────────────────── */
function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 3600000)  return 'Il y a moins d\'une heure';
  if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
  if (diff < 604800000)return `Il y a ${Math.floor(diff / 86400000)}j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ─── Statut badge ──────────────────────────────── */
function statutBadge(statut) {
  return `<span class="statut statut-${statut}">${{ envoyee:'Envoyée', vue:'Vue', shortlistee:'Shortlistée', entretien:'Entretien', acceptee:'Acceptée', refusee:'Refusée' }[statut] || statut}</span>`;
}

/* ─── File URL helper ───────────────────────────── */
function fileUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

/* ─── Redirect si pas connecté ──────────────────── */
function requireAuth(role) {
  if (!auth.isLogged()) { window.location.href = 'login.html'; return false; }
  const user = auth.getUser();
  if (role && user?.role !== role && user?.role !== 'admin') { window.location.href = 'index.html'; return false; }
  return true;
}

/* ─── Export global ─────────────────────────────── */
window.HH = { api: apiFetch, auth, Toast, validate, showError, clearErrors, formatDate, statutBadge, requireAuth, API_BASE };
window.logout = logout;

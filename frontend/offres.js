// ── offres.js ──────────────────────────────────────
let currentPage = 1;
const LIMIT = 10;
let currentFilters = {};

// Check URL parameters for company filtering
function getUrlFilters() {
  const urlParams = new URLSearchParams(window.location.search);
  const entrepriseId = urlParams.get('entreprise_id');
  if (entrepriseId) {
    return { entreprise_id: entrepriseId };
  }
  return {};
}

// Load company info for header
async function loadCompanyInfo(entrepriseId) {
  try {
    const data = await HH.api(`/entreprises/${entrepriseId}`);
    const header = document.getElementById('companyHeader');
    const logo = document.getElementById('companyLogo');
    const name = document.getElementById('companyName');
    const sector = document.getElementById('companySector');
    
    header.style.display = 'block';
    name.textContent = data.nom || 'Entreprise';
    sector.textContent = data.secteur || 'Secteur non précisé';
    
    if (data.logo_url) {
      logo.innerHTML = `<img src="${data.logo_url}" alt="Logo ${data.nom}" style="width:100%;height:100%;object-fit:cover">`;
    } else {
      logo.innerHTML = `<span style="font-size:16px;font-weight:700;color:var(--gray-700)">${(data.nom || '??').slice(0,2).toUpperCase()}</span>`;
    }
  } catch (err) {
    console.error('Erreur chargement entreprise:', err);
  }
}

async function loadOffres(page = 1, filters = {}) {
  const urlFilters = getUrlFilters();
  const allFilters = { ...filters, ...urlFilters };
  const params = new URLSearchParams({ page, limit: LIMIT, ...allFilters });
  const list   = document.getElementById('offresList');
  list.innerHTML = '<p class="empty-state">Chargement…</p>';

  let myApplications = [];
  if (HH.auth.isLogged()) {
    try {
      const appData = await HH.api('/candidatures/mes');
      myApplications = appData.candidatures || [];
    } catch (e) { console.error('Erreur chargement mes candidatures:', e); }
  }

  try {
    const data = await HH.api(`/offres?${params}`);
    currentPage = page;

    const total = data.total;
    const urlParams = new URLSearchParams(window.location.search);
    const entrepriseId = urlParams.get('entreprise_id');
    
    let countText = total === 1 ? '1 offre trouvée' : `${total} offres trouvées`;
    if (entrepriseId) {
      countText += ' pour cette entreprise';
    }
    document.getElementById('countLabel').textContent = countText;

    if (!data.offres.length) {
      list.innerHTML = '<p class="empty-state">Aucune offre ne correspond à vos critères.</p>';
      renderPagination(0);
      return;
    }

    list.innerHTML = data.offres.map(o => `
      <div class="job-card-modern">
        <div class="job-card-top">
          <div>
            <h3 class="job-card-title">${o.titre}</h3>
            <div class="job-card-company">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-7h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              <span>${o.entreprise_nom || (o.recruteur_prenom + ' ' + o.recruteur_nom) || '—'}</span>
              ${o.localisation ? `<span>·</span> <span>${o.localisation}</span>` : ''}
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <span class="job-card-tag">${o.type_contrat}</span>
            ${isNew(o.date_publication) ? '<span class="job-card-tag new">Nouveau</span>' : ''}
          </div>
        </div>
        <p class="job-card-desc">${truncate(o.description, 200)}</p>
        <div class="job-card-footer">
          <div class="job-card-salary">
            ${o.salaire_min ? o.salaire_min + (o.salaire_max ? ' – ' + o.salaire_max : '+') + ' MGA / an' : 'Salaire non précisé'}
          </div>
          <div style="display:flex;gap:12px;align-items:center">
            <span class="text-xs text-muted">Publiée ${HH.formatDate(o.date_publication)}</span>
            ${HH.auth.isLogged()
              ? (myApplications.some(app => app.offre_id === o.id)
                  ? `<button class="btn btn-outline btn-sm" disabled>Déjà postulé ✓</button>`
                  : `<button class="btn btn-primary btn-sm" onclick="postuler('${o.id}', this)">Postuler maintenant</button>`)
              : `<a href="login.html" class="btn btn-primary btn-sm">Connectez-vous pour postuler</a>`
            }
          </div>
        </div>
      </div>
    `).join('');

    renderPagination(data.total);
  } catch (err) {
    list.innerHTML = '<p class="empty-state">Impossible de charger les offres.</p>';
    HH.Toast.error('Erreur lors du chargement.');
  }
}

function renderPagination(total) {
  const pages = Math.ceil(total / LIMIT);
  const el    = document.getElementById('pagination');
  if (pages <= 1) { el.innerHTML = ''; return; }
  let html = `<button class="page-btn" onclick="loadOffres(${currentPage - 1}, currentFilters)" ${currentPage === 1 ? 'disabled' : ''}>←</button>`;
  for (let i = 1; i <= pages; i++) {
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="loadOffres(${i}, currentFilters)">${i}</button>`;
  }
  html += `<button class="page-btn" onclick="loadOffres(${currentPage + 1}, currentFilters)" ${currentPage === pages ? 'disabled' : ''}>→</button>`;
  el.innerHTML = html;
}

async function postuler(offre_id, btn) {
  // Afficher le modal de postulation
  showApplicationModal(offre_id, btn);
}

function showApplicationModal(offre_id, btn) {
  const modalId = 'applicationModal_' + offre_id;
  let modal = document.getElementById(modalId);
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-overlay" onclick="closeApplicationModal('${offre_id}')"></div>
      <div class="modal-content" style="width: 600px; max-height: 90vh; overflow-y: auto; padding: 32px;">
        <div class="modal-header" style="margin-bottom: 24px;">
          <h2 style="font-size: 24px; font-weight: 800;">Postuler à cette offre</h2>
          <button class="modal-close" onclick="closeApplicationModal('${offre_id}')">✕</button>
        </div>
        <form id="applicationForm_${offre_id}" class="modal-body">
          <p class="text-muted mb-4" style="font-size: 14px;">Veuillez fournir les documents nécessaires pour votre candidature.</p>
          
          <div class="form-group mb-4">
            <label class="form-label">Curriculum Vitae (CV) *</label>
            <div class="file-upload-modern">
              <input type="file" id="cv_${offre_id}" name="cv" accept=".pdf,.doc,.docx" required hidden />
              <label for="cv_${offre_id}" class="file-drop-area">
                <div class="icon-circle">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div class="file-info">
                  <span class="file-main-text">Choisir votre CV</span>
                  <span class="file-sub-text" id="cv_name_${offre_id}">PDF, DOC, DOCX (Max 10Mo)</span>
                </div>
              </label>
            </div>
          </div>

          <div class="form-group mb-4">
            <label class="form-label">Lettre de Motivation (LM) *</label>
            <div class="file-upload-modern">
              <input type="file" id="lm_${offre_id}" name="lm" accept=".pdf,.doc,.docx" required hidden />
              <label for="lm_${offre_id}" class="file-drop-area">
                <div class="icon-circle">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                </div>
                <div class="file-info">
                  <span class="file-main-text">Choisir votre LM</span>
                  <span class="file-sub-text" id="lm_name_${offre_id}">PDF, DOC, DOCX (Max 10Mo)</span>
                </div>
              </label>
            </div>
          </div>

          <div class="form-group mb-4">
            <label class="form-label">Demande d'emploi / Autre document</label>
            <div class="file-upload-modern">
              <input type="file" id="demande_${offre_id}" name="demande" accept=".pdf,.doc,.docx" hidden />
              <label for="demande_${offre_id}" class="file-drop-area">
                <div class="icon-circle">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                </div>
                <div class="file-info">
                  <span class="file-main-text">Choisir une demande</span>
                  <span class="file-sub-text" id="demande_name_${offre_id}">Optionnel (PDF, DOC, DOCX)</span>
                </div>
              </label>
            </div>
          </div>

          <div class="modal-footer" style="margin-top: 32px; border-top: 1px solid var(--gray-100); padding-top: 24px;">
            <button type="button" class="btn btn-outline" onclick="closeApplicationModal('${offre_id}')" style="flex:1">Annuler</button>
            <button type="submit" class="btn btn-primary" style="flex:2">Envoyer ma candidature</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    // Gestion de l'affichage du nom des fichiers
    ['cv', 'lm', 'demande'].forEach(field => {
      const input = document.getElementById(`${field}_${offre_id}`);
      input.addEventListener('change', function() {
        const fileName = this.files[0]?.name || (field === 'demande' ? 'Optionnel' : 'Format requis');
        document.getElementById(`${field}_name_${offre_id}`).textContent = fileName;
        if (this.files[0]) {
           this.closest('.file-upload-modern').classList.add('has-file');
        }
      });
    });

    // Gestion de la soumission du formulaire
    const form = document.getElementById('applicationForm_' + offre_id);
    form.addEventListener('submit', (e) => submitApplication(e, offre_id, btn));
  }

  modal.style.display = 'flex';
}

async function submitApplication(e, offre_id, btn) {
  e.preventDefault();
  
  const cvInput = document.getElementById('cv_' + offre_id);
  const lmInput = document.getElementById('lm_' + offre_id);
  const demandeInput = document.getElementById('demande_' + offre_id);

  if (!cvInput.files.length) {
    HH.Toast.error('Veuillez télécharger un CV');
    return;
  }
  if (!lmInput.files.length) {
    HH.Toast.error('Veuillez télécharger une lettre de motivation');
    return;
  }

  const formData = new FormData();
  formData.append('offre_id', offre_id);
  formData.append('cv', cvInput.files[0]);
  formData.append('lm', lmInput.files[0]);
  if (demandeInput.files.length) {
    formData.append('demande', demandeInput.files[0]);
  }

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = 'Envoi…';

  // Double check to prevent multiple submissions
  if (btn.dataset.submitting === 'true') return;
  btn.dataset.submitting = 'true';

  try {
    await HH.api('/candidatures', { 
      method: 'POST', 
      body: formData,
      headers: {} // Laisser le navigateur définir Content-Type
    });
    HH.Toast.success('Candidature envoyée avec succès !');
    btn.textContent = 'Postulé ✓';
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-outline');
    closeApplicationModal(offre_id);
  } catch (err) {
    HH.Toast.error(err.message);
    btn.disabled = false;
    btn.textContent = originalText;
    delete btn.dataset.submitting;
  }
}

function closeApplicationModal(offre_id) {
  const modal = document.getElementById('applicationModal_' + offre_id);
  if (modal) {
    modal.style.display = 'none';
  }
}

function isNew(date) { return Date.now() - new Date(date).getTime() < 86400000 * 3; }
function truncate(str, n) { return str?.length > n ? str.slice(0, n) + '…' : (str || ''); }

// Filtres
function getFilters() {
  return {
    search:       document.getElementById('searchInput').value || undefined,
    skills:       document.getElementById('skillsInput').value || undefined,
    localisation: document.getElementById('locInput').value    || undefined,
    type_contrat: document.getElementById('typeInput').value   || undefined,
    salaire_min:  document.getElementById('salInput').value    || undefined,
  };
}

function lancerRecherche() {
  const userFilters = getFilters();
  const urlFilters = getUrlFilters();
  const allFilters = { ...userFilters, ...urlFilters };

  // Nettoyage des filtres pour ne pas envoyer de valeurs vides à l'API
  const cleanFilters = {};
  Object.keys(allFilters).forEach(key => {
    const val = allFilters[key];
    if (val !== undefined && val !== '' && val !== null) {
      cleanFilters[key] = val;
    }
  });

  loadOffres(1, cleanFilters);
}

document.getElementById('filterBtn').addEventListener('click', lancerRecherche);

document.getElementById('resetBtn').addEventListener('click', () => {
  ['searchInput','skillsInput','locInput','typeInput','salInput'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.querySelectorAll('.pill').forEach(p => p.classList.toggle('active', p.dataset.type === ''));
  const urlFilters = getUrlFilters();
  currentFilters = urlFilters;
  loadOffres(1, urlFilters);
});

let rechercheTimer;
['searchInput', 'skillsInput', 'locInput', 'salInput'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  
  // Recherche instantanée pendant la saisie (debounce 500ms)
  el.addEventListener('input', () => {
    clearTimeout(rechercheTimer);
    rechercheTimer = setTimeout(lancerRecherche, 500);
  });

  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      clearTimeout(rechercheTimer);
      lancerRecherche();
    }
  });
});

// Synchronisation Pill -> Dropdown
document.getElementById('typePills').addEventListener('click', (e) => {
  const pill = e.target.closest('.pill');
  if (!pill) return;
  
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  pill.classList.add('active');
  
  const typeValue = pill.dataset.type;
  document.getElementById('typeInput').value = typeValue;
  
  lancerRecherche();
});

// Synchronisation Dropdown -> Pill
document.getElementById('typeInput').addEventListener('change', (e) => {
  const selectedType = e.target.value;
  document.querySelectorAll('.pill').forEach(p => {
    p.classList.toggle('active', p.dataset.type === selectedType);
  });
  lancerRecherche();
});

// Init
const urlFilters = getUrlFilters();
currentFilters = urlFilters;
if (urlFilters.entreprise_id) {
  loadCompanyInfo(urlFilters.entreprise_id);
}
loadOffres(1, urlFilters);

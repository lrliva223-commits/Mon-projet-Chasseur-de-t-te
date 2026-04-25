// ── dashboard-recruteur.js ─────────────────────────
HH.requireAuth('recruteur');
const user = HH.auth.getUser();
document.getElementById('welcomeTitle').textContent = `Bonjour, ${user?.prenom || ''} !`;

let allOffres = [];
const COLS = [
  { key: 'envoyee',     label: 'Reçues' },
  { key: 'shortlistee', label: 'Shortlisté' },
  { key: 'entretien',   label: 'Entretien' },
  { key: 'acceptee',    label: 'Proposition' },
];

// ─── Navigation sections ──────────────────────────
function showSection(id) {
  ['offresSection','newOffreSection','pipelineSection'].forEach(s => {
    const el = document.getElementById(s);
    if (el) el.style.display = s === id ? 'block' : 'none';
  });
}

// ─── Charger les offres ───────────────────────────
async function loadOffres() {
  try {
    const data = await HH.api('/offres/mes');
    allOffres = data.offres || [];

    const actives = allOffres.filter(o => o.statut === 'active').length;
    const total   = allOffres.reduce((s, o) => s + (o.nb_candidatures || 0), 0);
    const now     = new Date();
    const cemois  = allOffres.filter(o => { const d = new Date(o.date_publication); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;
    document.getElementById('sOffres').textContent      = actives;
    document.getElementById('sCandidatures').textContent= total;
    document.getElementById('sTotal').textContent       = allOffres.length;
    document.getElementById('sMois').textContent        = cemois;

    // Select pipeline
    const sel = document.getElementById('offreSelect');
    sel.innerHTML = '<option value="">Choisir une offre…</option>' +
      allOffres.map(o => `<option value="${o.id}">${o.titre} (${o.nb_candidatures || 0})</option>`).join('');

    if (!allOffres.length) {
      document.getElementById('offresList').innerHTML = '<p class="empty-state">Aucune offre publiée. <button class="btn btn-primary btn-sm mt-2" onclick="showSection(\'newOffreSection\')">Créer une offre</button></p>';
      return;
    }
    document.getElementById('offresList').innerHTML = allOffres.map(o => `
      <div class="flex justify-between items-center" style="padding:12px 0;border-bottom:1px solid var(--gray-100)">
        <div>
          <p class="font-medium text-sm">${o.titre}</p>
          <p class="text-xs text-muted">${o.localisation || '—'} · ${o.type_contrat} · ${HH.formatDate(o.date_publication)} · ${o.nb_candidatures || 0} candidature(s)</p>
        </div>
        <div class="flex gap-2 items-center">
          <span class="tag ${o.statut === 'active' ? 'tag-green' : 'tag-gray'}">${o.statut}</span>
          <button class="btn btn-outline btn-sm" onclick="openPipeline('${o.id}')">Pipeline</button>
          <button class="btn btn-danger btn-sm" onclick="supprimerOffre('${o.id}')">Supprimer</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    HH.Toast.error('Erreur lors du chargement des offres.');
  }
}

function openPipeline(offreId) {
  document.getElementById('offreSelect').value = offreId;
  showSection('pipelineSection');
  loadPipeline(offreId);
}

async function supprimerOffre(id) {
  if (!confirm('Supprimer cette offre ?')) return;
  try {
    await HH.api(`/offres/${id}`, { method: 'DELETE' });
    HH.Toast.success('Offre supprimée.');
    loadOffres();
  } catch (err) { HH.Toast.error(err.message); }
}

// ─── Pipeline Kanban ──────────────────────────────
let draggedId = null;

async function loadPipeline(offreId) {
  if (!offreId) return;
  const kanban = document.getElementById('kanban');
  kanban.innerHTML = '<p class="empty-state" style="grid-column:1/-1">Chargement…</p>';
  try {
    const data = await HH.api(`/candidatures/offre/${offreId}`);
    const candidatures = data.candidatures || [];
    renderKanban(candidatures);
  } catch (err) { HH.Toast.error('Erreur chargement pipeline.'); }
}

function renderKanban(candidatures) {
  const kanban = document.getElementById('kanban');
  kanban.innerHTML = COLS.map(col => {
    const cards = candidatures.filter(c => c.statut === col.key);
    return `
      <div class="kanban-col" data-col="${col.key}" 
           ondragover="dragOver(event)" ondrop="drop(event, '${col.key}')">
        <div class="kanban-col-title">
          ${col.label} <span class="tag tag-gray">${cards.length}</span>
        </div>
        ${cards.map(c => `
          <div class="kanban-card" draggable="true" data-id="${c.id}"
               ondragstart="dragStart(event, '${c.id}')">
            <p class="k-name">${c.prenom} ${c.nom}</p>
            <p class="k-sub">${c.titre_poste || '—'}${c.salaire_min ? ' · ' + c.salaire_min + 'MGA' : ''}</p>
            <div class="flex items-center justify-between mt-3">
              <div class="flex gap-2">
                ${c.cv_url ? `<a href="${c.cv_url}" target="_blank" class="tag tag-blue" style="text-decoration:none">CV</a>` : ''}
                ${c.lm_url ? `<a href="${c.lm_url}" target="_blank" class="tag tag-purple" style="text-decoration:none; background:#f3e8ff; color:#7c3aed">LM</a>` : ''}
                ${c.demande_url ? `<a href="${c.demande_url}" target="_blank" class="tag tag-amber" style="text-decoration:none">DEM</a>` : ''}
              </div>
              <button class="btn-icon" onclick="openMessageModal('${c.candidat_id}', '${c.prenom} ${c.nom}')" title="Envoyer un message">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              </button>
            </div>
          </div>
        `).join('') || `<div style="border:2px dashed var(--gray-200);border-radius:6px;padding:16px;text-align:center;color:var(--gray-400);font-size:12px">Déposer ici</div>`}
      </div>
    `;
  }).join('');
}

function dragStart(e, id) {
  draggedId = id;
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => e.target.classList.add('dragging'), 0);
}
function dragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}
async function drop(e, newStatut) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  document.querySelectorAll('.kanban-card').forEach(c => c.classList.remove('dragging'));
  if (!draggedId) return;
  try {
    await HH.api(`/candidatures/${draggedId}/statut`, { method: 'PATCH', body: JSON.stringify({ statut: newStatut }) });
    HH.Toast.success('Candidat déplacé.');
    const offreId = document.getElementById('offreSelect').value;
    if (offreId) loadPipeline(offreId);
  } catch (err) { HH.Toast.error(err.message); }
  draggedId = null;
}

// ─── Créer offre ──────────────────────────────────
document.getElementById('newOffreForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const titre = document.getElementById('of-titre').value;
  const desc  = document.getElementById('of-desc').value;
  if (!titre.trim()) { HH.Toast.error('Le titre est requis.'); return; }
  if (!desc.trim())  { HH.Toast.error('La description est requise.'); return; }
  const btn = document.getElementById('offreSaveBtn');
  btn.disabled = true; btn.textContent = 'Publication…';
  try {
    await HH.api('/offres', {
      method: 'POST',
      body: JSON.stringify({
        titre,
        description: desc,
        localisation:  document.getElementById('of-loc').value || undefined,
        type_contrat:  document.getElementById('of-type').value,
        salaire_min:   parseInt(document.getElementById('of-salmin').value) || undefined,
        salaire_max:   parseInt(document.getElementById('of-salmax').value) || undefined,
      }),
    });
    HH.Toast.success('Offre publiée !');
    document.getElementById('newOffreForm').reset();
    showSection('offresSection');
    loadOffres();
  } catch (err) { HH.Toast.error(err.message); }
  finally { btn.disabled = false; btn.textContent = 'Publier'; }
});

// ─── Messagerie ───────────────────────────────────
let selectedCandidatId = null;

function openMessageModal(candidatId, name) {
  selectedCandidatId = candidatId;
  const destName = document.getElementById('messageDestName');
  if (destName) destName.textContent = `Destinataire : ${name}`;
  const textInput = document.getElementById('messageText');
  if (textInput) textInput.value = '';
  const modal = document.getElementById('messageModal');
  if (modal) modal.style.display = 'flex';
}

function closeMessageModal() {
  const modal = document.getElementById('messageModal');
  if (modal) modal.style.display = 'none';
  selectedCandidatId = null;
}

async function confirmSendMessage() {
  const textInput = document.getElementById('messageText');
  const text = textInput ? textInput.value.trim() : '';
  if (!text) return HH.Toast.error('Veuillez saisir un message.');
  
  const btn = document.getElementById('btnSendMessage');
  btn.disabled = true;
  btn.textContent = 'Envoi…';

  try {
    await HH.api('/messages', {
      method: 'POST',
      body: JSON.stringify({
        destinataire_id: selectedCandidatId,
        contenu: text
      })
    });
    HH.Toast.success('Message envoyé avec succès !');
    closeMessageModal();
  } catch (err) {
    HH.Toast.error(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Envoyer';
  }
}

// Init
loadOffres();

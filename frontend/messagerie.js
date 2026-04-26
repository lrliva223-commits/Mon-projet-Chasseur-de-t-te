// ── messagerie.js ──────────────────────────────────
HH.requireAuth();
const me = HH.auth.getUser();
let selectedConv = null;
let pollInterval = null;
let conversationsMap = {};

async function loadConversations() {
  try {
    const data  = await HH.api('/messages/conversations');
    const convs = data.conversations || [];
    const el    = document.getElementById('convItems');

    if (!convs.length) {
      el.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:var(--gray-400)">
          <p style="font-size:13px">Aucune discussion en cours.</p>
        </div>`;
      return;
    }
    
    conversationsMap = {};
    el.innerHTML = convs.map(c => {
      conversationsMap[c.id] = c;
      const initials = (c.prenom?.[0] || '') + (c.nom?.[0] || '');
      return `
        <div class="conv-item ${selectedConv?.id === c.id ? 'active' : ''}"
             data-id="${c.id}" onclick="handleConvClick('${c.id}')">
          <div class="conv-avatar" style="background: ${getRandomColor(initials)}">${initials}</div>
          <div style="min-width:0; flex:1">
            <div class="flex justify-between items-center">
              <p class="conv-name">${c.prenom} ${c.nom}</p>
              ${c.date_envoi ? `<span style="font-size:10px; color:var(--gray-400)">${formatShortDate(c.date_envoi)}</span>` : ''}
            </div>
            <p class="conv-last">${escapeHtml(c.dernier_message || 'Pas encore de message')}</p>
          </div>
          ${(c.non_lu > 0) ? `<span class="unread-badge">${c.non_lu}</span>` : ''}
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Erreur chargement convs:', err);
  }
}

function handleConvClick(id) {
  const conv = conversationsMap[id];
  if (conv) openConv(conv);
}

async function openConv(conv) {
  selectedConv = conv;
  clearInterval(pollInterval);
  document.querySelectorAll('.conv-item').forEach(el => el.classList.toggle('active', el.dataset.id === conv.id));

  renderChatArea(conv);
  await loadMessages(conv.id);
  // Rafraîchissement automatique toutes les 3 secondes
  pollInterval = setInterval(() => loadMessages(conv.id), 3000);
}

function renderChatArea(conv) {
  const initials = (conv.prenom?.[0] || '') + (conv.nom?.[0] || '');
  document.getElementById('chatArea').innerHTML = `
    <div class="chat-header shadow-sm">
      <div class="conv-avatar" style="width:40px; height:40px; font-size:14px; background: ${getRandomColor(initials)}">${initials}</div>
      <div style="flex:1">
        <p style="font-size:15px; font-weight:700; color:var(--gray-900)">${conv.prenom} ${conv.nom}</p>
        <p style="font-size:11px; color:var(--primary); font-weight:600; text-transform:uppercase; letter-spacing:0.5px">${conv.role || 'Contact'}</p>
      </div>
    </div>
    <div class="chat-messages" id="chatMessages"></div>
    <div class="chat-input-row">
      <input class="form-input" id="msgInput" type="text" placeholder="Écrire votre message ici…" 
             style="border-radius:24px; padding:12px 20px; background:#f1f5f9; border:none"
             onkeydown="if(event.key==='Enter')sendMsg()" />
      <button class="btn btn-primary" onclick="sendMsg()" style="border-radius:50%; width:44px; height:44px; padding:0; display:flex; align-items:center; justify-content:center; flex-shrink:0">
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
      </button>
    </div>
  `;
  document.getElementById('msgInput').focus();
}

async function loadMessages(userId) {
  try {
    const data = await HH.api(`/messages/conversation/${userId}`);
    const msgs = data.messages || [];
    const el   = document.getElementById('chatMessages');
    if (!el) return;

    const oldScroll = el.scrollHeight - el.scrollTop;

    el.innerHTML = msgs.map(m => {
      const mine = m.expediteur_id === me?.id;
      return `
        <div class="msg-row ${mine ? 'mine' : ''}">
          <div style="max-width: 80%">
            <div class="msg-bubble ${mine ? 'mine' : 'theirs'}">${escapeHtml(m.contenu)}</div>
            <p class="msg-time ${mine ? 'mine' : ''}">${formatTime(m.date_envoi)}</p>
          </div>
        </div>
      `;
    }).join('') || '<div style="text-align:center; padding:40px; color:var(--gray-400); font-size:13px italic">Dites bonjour ! 👋</div>';

    // Scroll vers le bas seulement si on n'est pas en train de remonter
    if (oldScroll < 400 || el.scrollTop === 0) {
      el.scrollTop = el.scrollHeight;
    }
  } catch {}
}

async function sendMsg() {
  const input = document.getElementById('msgInput');
  const contenu = input?.value?.trim();
  if (!contenu || !selectedConv) return;
  input.value = '';
  try {
    await HH.api('/messages', {
      method: 'POST',
      body: JSON.stringify({ destinataire_id: selectedConv.id, contenu }),
    });
    await loadMessages(selectedConv.id);
    await loadConversations();
  } catch (err) { HH.Toast.error('Impossible d\'envoyer le message.'); }
}

// Utilitaires
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function formatShortDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return formatTime(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
function getRandomColor(str) {
  const colors = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2'];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// Ouvrir conversation depuis URL param
const destParam = new URLSearchParams(window.location.search).get('dest');

loadConversations().then(() => {
  if (destParam) {
    const el = document.querySelector(`[data-id="${destParam}"]`);
    if (el) el.click();
    else {
      // Cas où le contact n'est pas encore dans la liste
      HH.api(`/auth/user/${destParam}`).then(u => {
        const dummyConv = { id: u.user.id, prenom: u.user.prenom, nom: u.user.nom, role: u.user.role };
        conversationsMap[u.user.id] = dummyConv;
        openConv(dummyConv);
      }).catch(() => {});
    }
  }
});

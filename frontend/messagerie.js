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
      el.innerHTML = '<p class="empty-state" style="padding:20px;font-size:13px">Aucune conversation</p>';
      return;
    }
    
    conversationsMap = {};
    el.innerHTML = convs.map(c => {
      conversationsMap[c.id] = c;
      return `
        <div class="conv-item ${selectedConv?.id === c.id ? 'active' : ''}"
             data-id="${c.id}" onclick="handleConvClick('${c.id}')">
          <div class="conv-avatar">${(c.prenom?.[0] || '') + (c.nom?.[0] || '')}</div>
          <div style="min-width:0; flex:1">
            <p class="conv-name">${c.prenom} ${c.nom}</p>
            <p class="conv-last">${escapeHtml(c.dernier_message || '—')}</p>
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
  pollInterval = setInterval(() => loadMessages(conv.id), 4000);
}

function renderChatArea(conv) {
  document.getElementById('chatArea').innerHTML = `
    <div class="chat-header">
      <div class="conv-avatar">${(conv.prenom?.[0] || '') + (conv.nom?.[0] || '')}</div>
      <div>
        <p style="font-size:14px;font-weight:500">${conv.prenom} ${conv.nom}</p>
        <p style="font-size:12px;color:var(--gray-400)">${conv.role || ''}</p>
      </div>
    </div>
    <div class="chat-messages" id="chatMessages"></div>
    <div class="chat-input-row">
      <input class="form-input" id="msgInput" type="text" placeholder="Écrire un message…" style="flex:1"
             onkeydown="if(event.key==='Enter')sendMsg()" />
      <button class="btn btn-primary" onclick="sendMsg()">Envoyer</button>
    </div>
  `;
}

async function loadMessages(userId) {
  try {
    const data = await HH.api(`/messages/conversation/${userId}`);
    const msgs = data.messages || [];
    const el   = document.getElementById('chatMessages');
    if (!el) return;

    el.innerHTML = msgs.map(m => {
      const mine = m.expediteur_id === me?.id;
      return `
        <div class="msg-row ${mine ? 'mine' : ''}">
          <div>
            <div class="msg-bubble ${mine ? 'mine' : 'theirs'}">${escapeHtml(m.contenu)}</div>
            <p class="msg-time ${mine ? 'mine' : ''}">${HH.formatDate(m.date_envoi)}</p>
          </div>
        </div>
      `;
    }).join('') || '<p style="text-align:center;color:var(--gray-400);font-size:13px;padding:24px">Commencez la conversation</p>';

    el.scrollTop = el.scrollHeight;
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

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Ouvrir conversation depuis URL param
const destParam = new URLSearchParams(window.location.search).get('dest');

loadConversations().then(() => {
  if (destParam) {
    // Chercher dans la liste ou créer une conversation vide
    const el = document.querySelector(`[data-id="${destParam}"]`);
    if (el) el.click();
  }
});

// ─── CHATS ────────────────────────────────────────────────
// Create, load, save, delete chat sessions from localStorage.

let chats = {};
let currentChatId = null;

function loadChats() {
  const saved = localStorage.getItem('nexus_chats');
  if (saved) chats = JSON.parse(saved);
}

function saveChats() {
  localStorage.setItem('nexus_chats', JSON.stringify(chats));
}

function newChat() {
  const id = 'chat_' + Date.now();
  chats[id] = { id, title: 'New Chat', messages: [], created: Date.now() };
  currentChatId = id;
  saveChats();
  renderChatList();
  renderMessages();
  document.getElementById('msg-input').focus();
  uploadedImage = null;
}

function selectChat(id) {
  currentChatId = id;
  renderChatList();
  renderMessages();
  closeArtifactPanel();
}

function deleteChat(id) {
  delete chats[id];
  if (currentChatId === id) {
    const remaining = Object.keys(chats);
    currentChatId = remaining.length ? remaining[remaining.length - 1] : null;
  }
  saveChats();
  renderChatList();
  renderMessages();
}

function getCurrentChat() {
  return currentChatId ? chats[currentChatId] : null;
}

function updateChatTitle(id, title) {
  if (!chats[id]) return;
  chats[id].title = title.slice(0, 60);
  saveChats();
  renderChatList();
}

function clearMessages() {
  const chat = getCurrentChat();
  if (!chat) return;
  chat.messages = [];
  saveChats();
  renderMessages();
}

// ─── EXPORT / IMPORT ──────────────────────────────────────

function generateExportCode() {
  const chat = getCurrentChat();
  if (!chat) { showToast('No active chat'); return; }
  const code = btoa(unescape(encodeURIComponent(JSON.stringify({ version: 1, chat }))));
  document.getElementById('export-code').textContent = code;
  showToast('Export code generated — click to copy');
}

function copyExportCode() {
  const code = document.getElementById('export-code').textContent;
  if (code.startsWith('Click')) return;
  navigator.clipboard.writeText(code).then(() => showToast('Copied to clipboard ✓'));
}

function exportAllChats() {
  const code = btoa(unescape(encodeURIComponent(JSON.stringify({ version: 1, allChats: chats }))));
  const blob = new Blob([code], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = 'nexus-chats-' + Date.now() + '.txt';
  a.click();
  URL.revokeObjectURL(url);
  showToast('All chats exported ✓');
}

function importChat() {
  const code = document.getElementById('import-code').value.trim();
  if (!code) { showToast('Paste export code first'); return; }
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(code))));
    if (data.allChats) {
      Object.assign(chats, data.allChats);
      saveChats();
      renderChatList();
      showToast(`Imported ${Object.keys(data.allChats).length} chats ✓`);
    } else if (data.chat) {
      const id = data.chat.id || 'chat_' + Date.now();
      chats[id] = data.chat;
      currentChatId = id;
      saveChats();
      renderChatList();
      renderMessages();
      showToast('Chat imported ✓');
    }
    document.getElementById('import-code').value = '';
    closeModal('export-modal');
  } catch {
    showToast('Invalid export code');
  }
}
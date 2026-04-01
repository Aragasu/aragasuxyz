// ─── MAIN ─────────────────────────────────────────────────
// App entry point and sendMessage orchestration.

function init() {
  loadConfig();
  loadChats();
  renderChatList();
  updateProviderBadge();
  document.getElementById('msg-input').focus();

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); newChat(); }
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    }
  });
}

async function sendMessage() {
  if (isStreaming) return;

  const input = document.getElementById('msg-input');
  const text  = input.value.trim();
  if (!text && !uploadedImage) return;

  // Ensure active chat
  if (!currentChatId) newChat();
  const chat = getCurrentChat();

  // Build user message
  const userMsg = uploadedImage
    ? { role: 'user', content: [
        { type: 'image_url', image_url: { url: uploadedImage } },
        { type: 'text', text: text || 'What is in this image?' }
      ]}
    : { role: 'user', content: text };

  chat.messages.push(userMsg);
  if (chat.messages.length === 1) updateChatTitle(chat.id, text.slice(0, 50) || 'Image');
  saveChats();
  renderMessages();

  input.value       = '';
  input.style.height = 'auto';
  input.placeholder  = 'Message Nexus...';
  uploadedImage      = null;

  // Validate API key
  const model    = document.getElementById('model-select').value;
  const provider = getProvider(model);
  const apiKey   = getApiKey(provider);

  if (!apiKey) {
    showToast('⚠ No API key set — open Settings');
    chat.messages.push({ role: 'assistant', content: '**No API key configured.** Go to Settings (sidebar) to add your key.' });
    saveChats();
    renderMessages();
    return;
  }

  await streamResponse(chat, model, provider, apiKey);
}

function sendSuggestion(text) {
  document.getElementById('msg-input').value = text;
  sendMessage();
}

// ─── START ────────────────────────────────────────────────
init();
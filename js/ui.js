// ─── UI ───────────────────────────────────────────────────
// Generic UI helpers: modals, toast, sidebar, input handling.

let uploadedImage = null;

// ── Modals ─────────────────────────────────────────────────

function openModal(id) {
  if (id === 'export-modal') {
    document.getElementById('export-code').textContent = 'Click "Generate" to create export code.';
  }
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Close on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ── Toast ──────────────────────────────────────────────────

function showToast(msg, duration = 2500) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ── Sidebar ────────────────────────────────────────────────

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

// ── Topbar ─────────────────────────────────────────────────

function updateProviderBadge() {
  const model = document.getElementById('model-select').value;
  document.getElementById('provider-badge').textContent = getProvider(model);
}

function onModelChange() {
  updateProviderBadge();
  if (document.getElementById('model-select').value === 'custom') {
    openModal('settings-modal');
  }
}

// ── Input ──────────────────────────────────────────────────

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 240) + 'px';
}

function onKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function triggerImageUpload() {
  document.getElementById('img-upload').click();
}

function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader  = new FileReader();
  reader.onload = evt => {
    uploadedImage = evt.target.result;
    showToast('Image attached ✓');
    document.getElementById('msg-input').placeholder = 'Image attached. Add a message…';
    document.getElementById('msg-input').focus();
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}
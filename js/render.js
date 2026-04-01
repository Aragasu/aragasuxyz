// ─── RENDER ───────────────────────────────────────────────
// Markdown parsing, message rendering, chat list rendering.

window._pendingArtifacts = {};

function renderChatList() {
  const list   = document.getElementById('chat-list');
  const sorted = Object.values(chats).sort((a, b) => b.created - a.created);
  list.innerHTML = sorted.map(c => `
    <div class="chat-item ${c.id === currentChatId ? 'active' : ''}" onclick="selectChat('${c.id}')">
      <span class="chat-item-title">${escHtml(c.title)}</span>
      <button class="chat-item-del" onclick="event.stopPropagation(); deleteChat('${c.id}')" title="Delete">✕</button>
    </div>
  `).join('');
}

function renderMessages() {
  const chat      = getCurrentChat();
  const emptyEl   = document.getElementById('empty-state');
  const msgsEl    = document.getElementById('messages');

  if (!chat || chat.messages.length === 0) {
    emptyEl.style.display = 'flex';
    msgsEl.style.display  = 'none';
    msgsEl.innerHTML      = '';
    return;
  }

  emptyEl.style.display = 'none';
  msgsEl.style.display  = 'flex';
  msgsEl.innerHTML      = chat.messages.map(renderMessageHTML).join('');
  processCodeBlocks();
  scrollToBottom();
}

function renderMessageHTML(msg) {
  const isUser = msg.role === 'user';
  const avatar = isUser ? 'U' : '✦';
  const sender = isUser ? 'You' : 'Assistant';

  let contentHTML = '';
  if (typeof msg.content === 'string') {
    contentHTML = parseMarkdown(msg.content);
  } else if (Array.isArray(msg.content)) {
    for (const part of msg.content) {
      if (part.type === 'text')      contentHTML += parseMarkdown(part.text);
      if (part.type === 'image_url') contentHTML += `<img src="${part.image_url.url}" style="max-width:100%;border-radius:8px;margin-top:8px;">`;
    }
  }

  return `
    <div class="msg ${msg.role}">
      <div class="msg-avatar">${avatar}</div>
      <div class="msg-body">
        <div class="msg-sender">${sender}</div>
        <div class="msg-content">${contentHTML}</div>
      </div>
    </div>`;
}

// ─── MARKDOWN ─────────────────────────────────────────────

function parseMarkdown(text) {
  if (!text) return '';
  let html = text;

  // Detect artifact code blocks (html, react, jsx, svg) → card
  html = html.replace(/```(html|react|jsx|svg)([\s\S]*?)```/gi, (_, type, code) => {
    const artifact = {
      type:  type.toLowerCase(),
      code:  code.trim(),
      title: type.toUpperCase() + ' Artifact',
      id:    'art_' + Math.random().toString(36).slice(2)
    };
    const key = `__ARTIFACT_${artifact.id}__`;
    window._pendingArtifacts[key] = artifact;
    return `\n${key}\n`;
  });

  // Generic code blocks
  html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<pre data-lang="${lang || ''}"><code>${escHtml(code.trim())}</code></pre>`
  );

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold / italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g,     '<em>$1</em>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm,  '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm,   '<h1>$1</h1>');

  // Lists
  html = html.replace(/^[-•] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li data-ol>$1</li>');

  // Wrap consecutive <li> runs
  html = html.replace(/(<li(?:\s[^>]*)?>[\s\S]*?<\/li>(\n|$))+/g, (block) => {
    const tag = block.includes('data-ol') ? 'ol' : 'ul';
    return `<${tag}>${block}</${tag}>`;
  });
  html = html.replace(/ data-ol/g, '');

  // Wrap bare lines in <p>
  const lines = html.split('\n');
  const out   = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t)                                      { out.push(''); continue; }
    if (/^<(h[123]|ul|ol|pre|div|__ARTIFACT)/.test(t)) { out.push(t); continue; }
    out.push(`<p>${t}</p>`);
  }
  html = out.join('\n').replace(/<p><\/p>/g, '');

  // Inject artifact cards
  for (const [key, artifact] of Object.entries(window._pendingArtifacts)) {
    const icon       = getArtifactIcon(artifact.type);
    const safeData   = JSON.stringify(artifact).replace(/"/g, '&quot;');
    const cardHTML   = `
      <div class="artifact-card" onclick="openArtifact(${safeData})">
        <div class="artifact-card-header">
          <span class="artifact-card-icon">${icon}</span>
          <div class="artifact-card-info">
            <div class="artifact-card-title">${escHtml(artifact.title)}</div>
            <div class="artifact-card-type">${artifact.type} artifact</div>
          </div>
          <span class="artifact-card-open">Open →</span>
        </div>
      </div>`;
    html = html.replace(new RegExp(key.replace(/[_]/g, '_'), 'g'), cardHTML);
  }
  window._pendingArtifacts = {};

  return html;
}

function processCodeBlocks() {
  document.querySelectorAll('#messages pre').forEach(pre => {
    if (pre.querySelector('.code-copy-btn')) return;
    const btn    = document.createElement('button');
    btn.className = 'code-copy-btn';
    btn.textContent = 'Copy';
    btn.onclick = () => {
      navigator.clipboard.writeText(pre.querySelector('code').textContent);
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 2000);
    };
    pre.appendChild(btn);
  });
}

function getArtifactIcon(type) {
  const icons = { html: '🌐', react: '⚛', jsx: '⚛', svg: '◈', python: '🐍', javascript: '⚡', js: '⚡', css: '🎨' };
  return icons[type] || '📄';
}

function scrollToBottom() {
  const area = document.getElementById('chat-area');
  area.scrollTop = area.scrollHeight;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
// ─── API ──────────────────────────────────────────────────
// Streaming requests to Anthropic and OpenAI-compatible APIs.

let isStreaming = false;

async function streamResponse(chat, model, provider, apiKey) {
  isStreaming = true;
  document.getElementById('send-btn').disabled = true;

  // Show message container
  document.getElementById('empty-state').style.display = 'none';
  const msgsEl = document.getElementById('messages');
  msgsEl.style.display = 'flex';

  // Typing indicator
  const typingId = 'typing_' + Date.now();
  const typingEl = document.createElement('div');
  typingEl.id        = typingId;
  typingEl.className = 'msg assistant';
  typingEl.innerHTML = `
    <div class="msg-avatar">✦</div>
    <div class="msg-body">
      <div class="msg-sender">Assistant</div>
      <div class="msg-content">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    </div>`;
  msgsEl.appendChild(typingEl);
  scrollToBottom();

  let fullText = '';

  const onUpdate = (text) => {
    fullText = text;
    const el = document.getElementById(typingId);
    if (!el) return;
    const contentEl = el.querySelector('.msg-content');
    contentEl.innerHTML = parseMarkdown(text);
    contentEl.classList.add('streaming-cursor');
    processCodeBlocks();
    scrollToBottom();
  };

  try {
    if (provider === 'anthropic') {
      await _streamAnthropic(chat, model, apiKey, onUpdate);
    } else {
      await _streamOpenAI(chat, model, apiKey, provider, onUpdate);
    }
  } catch (err) {
    fullText = `**Error:** ${err.message}`;
    onUpdate(fullText);
  }

  // Remove streaming cursor
  document.getElementById(typingId)?.querySelector('.msg-content')?.classList.remove('streaming-cursor');

  // Persist
  chat.messages.push({ role: 'assistant', content: fullText });
  saveChats();
  renderMessages();

  isStreaming = false;
  document.getElementById('send-btn').disabled = false;
  document.getElementById('msg-input').focus();
}

// ─── ANTHROPIC ────────────────────────────────────────────

async function _streamAnthropic(chat, model, apiKey, onUpdate) {
  const messages = _buildMessages(chat, 'anthropic');
  const body     = {
    model,
    max_tokens: config.maxTokens,
    stream:     true,
    messages,
    temperature: config.temperature
  };
  if (config.systemPrompt) body.system = config.systemPrompt;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'Content-Type':    'application/json',
      'x-api-key':       apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }

  let accumulated = '';
  for await (const line of _readLines(res.body)) {
    if (!line.startsWith('data: ')) continue;
    const data = line.slice(6).trim();
    if (data === '[DONE]') continue;
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
        accumulated += parsed.delta.text;
        onUpdate(accumulated);
      }
    } catch {}
  }
}

// ─── OPENAI-COMPATIBLE ────────────────────────────────────

async function _streamOpenAI(chat, model, apiKey, provider, onUpdate) {
  const messages = _buildMessages(chat, 'openai');
  if (config.systemPrompt) messages.unshift({ role: 'system', content: config.systemPrompt });

  const baseUrl = provider === 'custom'
    ? (config.customUrl || 'https://api.openai.com/v1')
    : 'https://api.openai.com/v1';

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      max_tokens:  config.maxTokens,
      temperature: config.temperature,
      stream:      true,
      messages
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }

  let accumulated = '';
  for await (const line of _readLines(res.body)) {
    if (!line.startsWith('data: ')) continue;
    const data = line.slice(6).trim();
    if (data === '[DONE]') continue;
    try {
      const delta = JSON.parse(data).choices?.[0]?.delta?.content;
      if (delta) { accumulated += delta; onUpdate(accumulated); }
    } catch {}
  }
}

// ─── HELPERS ──────────────────────────────────────────────

async function* _readLines(body) {
  const reader  = body.getReader();
  const decoder = new TextDecoder();
  let buffer    = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete line
    for (const line of lines) yield line;
  }
  if (buffer) yield buffer;
}

function _buildMessages(chat, provider) {
  return chat.messages.map(m => {
    if (typeof m.content === 'string') return { role: m.role, content: m.content };

    if (Array.isArray(m.content)) {
      if (provider !== 'anthropic') return { role: m.role, content: m.content };

      // Convert image_url → Anthropic base64 format
      return {
        role:    m.role,
        content: m.content.map(p => {
          if (p.type === 'text') return { type: 'text', text: p.text };
          if (p.type === 'image_url') {
            const [header, data] = p.image_url.url.split(',');
            const mediaType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
            return { type: 'image', source: { type: 'base64', media_type: mediaType, data } };
          }
          return p;
        })
      };
    }

    return m;
  });
}
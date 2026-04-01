// ─── CONFIG ───────────────────────────────────────────────
// Handles loading/saving settings and API keys to localStorage.

const config = {
  anthropicKey: '',
  openaiKey:    '',
  customUrl:    '',
  customKey:    '',
  maxTokens:    4096,
  temperature:  0.7,
  systemPrompt: ''
};

function loadConfig() {
  const saved = localStorage.getItem('nexus_config');
  if (saved) Object.assign(config, JSON.parse(saved));

  document.getElementById('key-anthropic').value  = config.anthropicKey || '';
  document.getElementById('key-openai').value      = config.openaiKey    || '';
  document.getElementById('key-custom-url').value  = config.customUrl    || '';
  document.getElementById('key-custom').value      = config.customKey    || '';
  document.getElementById('max-tokens').value      = config.maxTokens    ?? 4096;
  document.getElementById('temperature').value     = config.temperature  ?? 0.7;
  document.getElementById('system-prompt').value   = config.systemPrompt || '';
}

function saveKeys() {
  config.anthropicKey = document.getElementById('key-anthropic').value;
  config.openaiKey    = document.getElementById('key-openai').value;
  config.customUrl    = document.getElementById('key-custom-url').value;
  config.customKey    = document.getElementById('key-custom').value;
  config.maxTokens    = parseInt(document.getElementById('max-tokens').value) || 4096;
  config.temperature  = parseFloat(document.getElementById('temperature').value) ?? 0.7;
  _persistConfig();
}

function saveSystemPrompt() {
  config.systemPrompt = document.getElementById('system-prompt').value;
  _persistConfig();
  closeModal('system-modal');
  showToast('System prompt saved ✓');
}

function _persistConfig() {
  localStorage.setItem('nexus_config', JSON.stringify(config));
}

// Provider helpers
function getProvider(model) {
  if (model.startsWith('claude'))                          return 'anthropic';
  if (model.startsWith('gpt') || /^o[13]/.test(model))    return 'openai';
  return 'custom';
}

function getApiKey(provider) {
  if (provider === 'anthropic') return config.anthropicKey;
  if (provider === 'openai')    return config.openaiKey;
  return config.customKey;
}
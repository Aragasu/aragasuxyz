// ─── ARTIFACT ─────────────────────────────────────────────
// Handles opening, rendering, and closing the artifact side panel.

let currentArtifact = null;

function openArtifact(artifact) {
  if (typeof artifact === 'string') {
    try { artifact = JSON.parse(artifact); } catch { return; }
  }
  currentArtifact = artifact;

  document.getElementById('artifact-panel-title').textContent = artifact.title || 'Artifact';
  document.getElementById('artifact-panel').classList.add('open');
  document.getElementById('artifact-code-view').textContent = artifact.code;

  switchArtifactTab('preview');
  _renderArtifactPreview(artifact);
}

function closeArtifactPanel() {
  document.getElementById('artifact-panel').classList.remove('open');
  document.getElementById('artifact-preview').srcdoc = '';
  currentArtifact = null;
}

function switchArtifactTab(tab) {
  document.getElementById('artifact-preview').style.display  = tab === 'preview' ? 'block' : 'none';
  document.getElementById('artifact-code-view').style.display = tab === 'code'    ? 'block' : 'none';
  document.getElementById('tab-preview').classList.toggle('active', tab === 'preview');
  document.getElementById('tab-code').classList.toggle('active', tab === 'code');
}

function _renderArtifactPreview(artifact) {
  const iframe = document.getElementById('artifact-preview');
  let   html   = artifact.code;

  const type = artifact.type?.toLowerCase();

  if (type === 'react' || type === 'jsx') {
    html = _wrapReact(artifact.code);
  } else if (type === 'svg') {
    html = `<!DOCTYPE html><html><body style="margin:0;background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh">${artifact.code}</body></html>`;
  } else if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
    html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:system-ui,sans-serif;padding:16px;}</style></head><body>${html}</body></html>`;
  }

  iframe.srcdoc = html;
}

function _wrapReact(code) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
<style>body{font-family:system-ui,sans-serif;margin:0;padding:16px;}</style>
</head><body>
<div id="root"></div>
<script type="text/babel">
${code}

try {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  const Comp = typeof App !== 'undefined' ? App
    : Object.values(window).find(v => typeof v === 'function');
  root.render(React.createElement(Comp || (() => React.createElement('div', null, 'No component found')), null));
} catch(e) {
  document.getElementById('root').innerHTML = '<pre style="color:red">' + e.message + '</pre>';
}
<\/script>
</body></html>`;
}
const code = decodeURIComponent(
  location.pathname
    .split('/')
    .filter(Boolean)
    .pop() || ''
);

const refs = {
  code: document.getElementById('codeValue'),
  targetLink: document.getElementById('targetLink'),
  clicks: document.getElementById('clicks'),
  lastClicked: document.getElementById('lastClicked'),
  createdAt: document.getElementById('createdAt'),
  status: document.getElementById('statusText')
};

function setStatus(message, kind = 'info') {
  refs.status.textContent = message;
  refs.status.style.color = kind === 'error' ? '#dc2626' : '#475569';
}

function formatDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

async function loadStats() {
  refs.code.textContent = code || 'Unknown code';
  setStatus('Fetching latest metrics...');
  try {
    const res = await fetch(`/api/links/${encodeURIComponent(code)}`);
    if (!res.ok) {
      const kind = res.status === 404 ? 'Link not found' : 'Unable to load stats';
      setStatus(kind, 'error');
      refs.targetLink.textContent = '--';
      refs.targetLink.removeAttribute('href');
      refs.clicks.textContent = '--';
      refs.lastClicked.textContent = '--';
      refs.createdAt.textContent = '--';
      return;
    }
    const data = await res.json();
    refs.targetLink.textContent = data.target;
    refs.targetLink.href = data.target;
    refs.clicks.textContent = Number(data.clicks || 0).toLocaleString();
    refs.lastClicked.textContent = formatDate(data.last_clicked);
    refs.createdAt.textContent = formatDate(data.created_at);
    setStatus('Stats updated just now.');
  } catch (err) {
    setStatus('Network error. Please refresh.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', loadStats);

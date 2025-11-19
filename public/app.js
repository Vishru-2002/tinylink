const state = { search: '' };
let tableBody;
let statusNode;
let searchInput;
let debounceId;
const icons = {
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.25 12s3.75-6.75 9.75-6.75 9.75 6.75 9.75 6.75-3.75 6.75-9.75 6.75S2.25 12 2.25 12z"/><circle cx="12" cy="12" r="3.25"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 6.75h15"/><path d="M9.75 10.5v7.5"/><path d="M14.25 10.5v7.5"/><path d="M6.75 6.75V4.5h10.5v2.25"/><path d="M8.25 6.75h7.5l-.75 12a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1-1.5-1.5z"/></svg>'
};

function setStatus(message = '', type = '') {
  if (!statusNode) return;
  statusNode.textContent = message;
  statusNode.className = `status${type ? ` ${type}` : ''}`;
}

function formatDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function shorten(value, max = 60) {
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

async function fetchList() {
  try {
    const search = state.search.trim();
    const params = search ? `?q=${encodeURIComponent(search)}` : '';
    const res = await fetch(`/api/links${params}`);
    if (!res.ok) throw new Error('Failed to load list');
    const data = await res.json();
    renderTable(data);
  } catch (err) {
    renderTable([]);
    setStatus('Unable to load links right now.', 'error');
  }
}

function renderTable(rows) {
  if (!tableBody) return;
  tableBody.innerHTML = '';
  if (!rows.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'empty';
    td.textContent = state.search
      ? 'No links match that search.'
      : 'No links yet. Create one above to get started.';
    tr.appendChild(td);
    tableBody.appendChild(tr);
    return;
  }

  rows.forEach(link => {
    const tr = document.createElement('tr');

    const tdCode = document.createElement('td');
    const codeWrapper = document.createElement('div');
    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.textContent = link.code;
    const shortUrl = document.createElement('div');
    shortUrl.className = 'muted';
    const href = `${window.location.origin}/${link.code}`;
    const codeAnchor = document.createElement('a');
    codeAnchor.href = href;
    codeAnchor.target = '_blank';
    codeAnchor.rel = 'noopener';
    codeAnchor.textContent = href;
    shortUrl.appendChild(codeAnchor);
    codeWrapper.append(pill, shortUrl);
    tdCode.appendChild(codeWrapper);

    const tdTarget = document.createElement('td');
    const targetAnchor = document.createElement('a');
    targetAnchor.href = link.target;
    targetAnchor.target = '_blank';
    targetAnchor.rel = 'noopener';
    targetAnchor.title = link.target;
    targetAnchor.textContent = shorten(link.target);
    tdTarget.appendChild(targetAnchor);

    const tdClicks = document.createElement('td');
    tdClicks.textContent = Number(link.clicks || 0).toLocaleString();

    const tdLast = document.createElement('td');
    tdLast.textContent = formatDate(link.last_clicked);

    const tdCreated = document.createElement('td');
    tdCreated.textContent = formatDate(link.created_at);

    const tdActions = document.createElement('td');
    tdActions.className = 'table-actions';

    const viewBtn = document.createElement('button');
    viewBtn.type = 'button';
    viewBtn.className = 'ghost small icon';
    viewBtn.innerHTML = `${icons.eye}<span>View</span>`;
    viewBtn.addEventListener('click', () => openStats(link.code));
    tdActions.appendChild(viewBtn);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'ghost small icon danger';
    delBtn.innerHTML = `${icons.trash}<span>Delete</span>`;
    delBtn.addEventListener('click', () => handleDelete(link.code));
    tdActions.appendChild(delBtn);

    tr.append(tdCode, tdTarget, tdClicks, tdLast, tdCreated, tdActions);
    tableBody.appendChild(tr);
  });
}

async function createLink(event) {
  event.preventDefault();
  const targetInput = document.getElementById('target');
  const codeInput = document.getElementById('code');
  const btn = document.getElementById('createBtn');
  setStatus('');

  const payload = { target: targetInput.value.trim() };
  if (!payload.target) {
    setStatus('Destination URL is required.', 'error');
    return;
  }
  const customCode = codeInput.value.trim();
  if (customCode) payload.code = customCode;

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = 'Creating...';

  try {
    const res = await fetch('/api/links', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.status === 201) {
      targetInput.value = '';
      codeInput.value = '';
      setStatus('Link created successfully.', 'success');
      fetchList();
    } else {
      let message = `Error ${res.status}`;
      try {
        const err = await res.json();
        if (err.error) message = err.error;
      } catch (e) {
        // ignore parse errors
      }
      setStatus(message, 'error');
    }
  } catch (err) {
    setStatus('Network error. Please try again.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function handleDelete(code) {
  if (!confirm(`Delete ${code}? This will hide the link immediately.`)) return;
  try {
    const res = await fetch(`/api/links/${encodeURIComponent(code)}`, { method: 'DELETE' });
    if (res.status === 204) {
      setStatus('Link removed.', 'success');
      fetchList();
    } else {
      setStatus('Unable to delete link.', 'error');
    }
  } catch (err) {
    setStatus('Unable to delete link.', 'error');
  }
}

function openStats(code) {
  const statsUrl = `/code/${encodeURIComponent(code)}`;
  const win = window.open(statsUrl, '_blank', 'noopener');
  if (win) win.opener = null;
}

function handleSearchInput(event) {
  state.search = event.target.value;
  if (debounceId) clearTimeout(debounceId);
  debounceId = setTimeout(fetchList, 300);
}

function clearSearch() {
  state.search = '';
  if (searchInput) searchInput.value = '';
  fetchList();
}

document.addEventListener('DOMContentLoaded', () => {
  tableBody = document.getElementById('links');
  statusNode = document.getElementById('formStatus');
  searchInput = document.getElementById('search');
  document.getElementById('createForm').addEventListener('submit', createLink);
  document.getElementById('clearSearch').addEventListener('click', clearSearch);
  searchInput.addEventListener('input', handleSearchInput);
  fetchList();
});

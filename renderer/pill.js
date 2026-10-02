// Renderer da pílula "notch": anéis com socket orgânico + % embaixo,
// card balão com as faixas agrupadas por modelo (estilo Codenotch).
const pillEl = document.getElementById('pill');
const ringsEl = document.getElementById('rings');
const cardEl = document.getElementById('card');

const R = 18;
const CIRC = 2 * Math.PI * R;

let snapshot = { accounts: [], updatedAt: 0 };
let hoverIndex = -1;

function colorFor(used) {
  if (used >= 0.8) return '#ff453a';
  if (used >= 0.5) return '#ff9f0a';
  return '#34c759';
}

function fillClassFor(used) {
  if (used >= 0.8) return 'fill-high';
  if (used >= 0.5) return 'fill-mid';
  return 'fill-low';
}

function headline(account) {
  if (!account.lanes || account.lanes.length === 0) return null;
  return account.lanes.reduce((max, lane) => (lane.used > max.used ? lane : max), account.lanes[0]);
}

function pctLabel(account) {
  if (account.status === 'disabled') return 'OFF';
  if (account.status === 'error') return 'ERR';
  const head = headline(account);
  return head ? `${Math.round(head.used * 100)}%` : '—';
}

function ringSvg(account) {
  const head = headline(account);
  let stroke = '#3a3a40';
  let dash = 0;
  if (account.status === 'error') {
    stroke = '#7a1f1c';
    dash = CIRC;
  } else if (head) {
    stroke = colorFor(head.used);
    dash = CIRC * Math.min(1, Math.max(0.015, head.used));
  }
  const initial = account.short ? account.short[0].toUpperCase() : '?';
  return `
    <div class="ring-socket">
      <div class="ring-wrap" data-index="${account.index}">
        <svg width="46" height="46" viewBox="0 0 46 46">
          <circle class="ring-track" cx="23" cy="23" r="${R}" fill="none" stroke-width="4"/>
          <circle class="ring-arc" cx="23" cy="23" r="${R}" fill="none" stroke-width="4"
                  stroke="${stroke}" stroke-dasharray="${dash} ${CIRC}"/>
        </svg>
        <div class="ring-initial">${initial}</div>
      </div>
    </div>
    <div class="ring-pct">${pctLabel(account)}</div>`;
}

function renderPill() {
  ringsEl.innerHTML = snapshot.accounts
    .map((acc, i) => ringSvg({ ...acc, index: i }))
    .join('');
}

function fmtReset(iso, window) {
  if (!iso) return '';
  const d = new Date(iso);
  const opts = window === 'weekly'
    ? { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
    : { hour: '2-digit', minute: '2-digit' };
  return `reseta ${new Intl.DateTimeFormat('pt-BR', opts).format(d)}`;
}

const GROUPS = [
  { match: 'Gemini Models', label: 'Gemini' },
  { match: 'Claude', label: 'Claude / GPT' },
];

function laneLabel(lane) {
  return lane.window === 'weekly' ? 'Semana' : 'Sessão · 5h';
}

function statusChip(account) {
  if (account.status === 'disabled') return '<span class="chip dis">off</span>';
  if (account.status === 'error') return `<span class="chip err" title="${account.error ?? ''}">erro</span>`;
  return '<span class="chip ok">ok</span>';
}

function laneRow(lane) {
  return `
    <div class="lane">
      <div class="lane-top">
        <span class="lane-name">${laneLabel(lane)}</span>
        <span class="lane-reset">${fmtReset(lane.resetsAt, lane.window)}</span>
      </div>
      <div class="lane-bar"><div class="lane-fill ${fillClassFor(lane.used)}" style="width:${(lane.used * 100).toFixed(1)}%"></div></div>
      <div class="lane-used">${Math.round(lane.used * 100)}% usado</div>
    </div>`;
}

function renderCard(index) {
  const acc = snapshot.accounts[index];
  if (!acc) return;

  const groupsHtml = GROUPS.map((g) => {
    const lanes = (acc.lanes ?? []).filter((l) => l.group.startsWith(g.match));
    if (lanes.length === 0) return '';
    return `<div class="group-label">${g.label}</div>${lanes.map(laneRow).join('')}`;
  }).join('');

  const errHtml = acc.status === 'error' && acc.error
    ? `<div class="lane-reset" style="margin-top:8px">${acc.error}</div>`
    : '';

  cardEl.innerHTML = `
    <div class="card-head">
      <div class="glyph">${acc.short[0].toUpperCase()}</div>
      <span class="card-email">${acc.email}</span>
      ${statusChip(acc)}
    </div>
    ${errHtml}
    ${groupsHtml || '<div class="lane-reset" style="margin-top:8px">sem dados de quota</div>'}
    <div class="card-foot">
      <span id="updated-ago"></span>
      <button class="btn-refresh" id="btn-refresh">ATUALIZAR</button>
    </div>`;

  document.getElementById('btn-refresh').addEventListener('click', () => window.pill.refresh());
  updateAgo();
}

function updateAgo() {
  const el = document.getElementById('updated-ago');
  if (!el) return;
  const secs = Math.max(0, Math.round((Date.now() - snapshot.updatedAt) / 1000));
  el.textContent = secs < 60 ? `atualizado há ${secs}s` : `atualizado há ${Math.floor(secs / 60)}min`;
}

// ---------- interação (janela transparente com click-through) ----------
let interactive = false;
function setInteractive(v) {
  if (v !== interactive) {
    interactive = v;
    window.pill.setInteractive(v);
  }
}

window.addEventListener('mousemove', (e) => {
  const overPill = hit(pillEl, e);
  const overCard = !cardEl.classList.contains('hidden') && hit(cardEl, e);
  if (overPill || overCard) {
    setInteractive(true);
    if (overPill) {
      const wrap = e.target.closest('.ring-wrap');
      const idx = wrap ? Number(wrap.dataset.index) : -1;
      if (idx !== hoverIndex) {
        hoverIndex = idx;
        if (idx >= 0) {
          renderCard(idx);
          cardEl.classList.remove('hidden');
          alignCardTo(wrap);
        } else {
          cardEl.classList.add('hidden');
        }
      }
    }
  } else {
    setInteractive(false);
    hoverIndex = -1;
    cardEl.classList.add('hidden');
  }
});

// card acompanha a altura do anel em hover (como no Codenotch)
function alignCardTo(wrap) {
  const r = wrap.getBoundingClientRect();
  const top = Math.min(
    Math.max(8, r.top - 16),
    window.innerHeight - cardEl.offsetHeight - 8,
  );
  cardEl.style.top = `${top}px`;
}

function hit(el, e) {
  const r = el.getBoundingClientRect();
  return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
}

// minimizar: pega na base da pílula (volta pelo ícone da bandeja)
document.getElementById('btn-min').addEventListener('click', () => window.pill.hide());

setInterval(updateAgo, 1000);

// ---------- dados ----------
window.pill.onSnapshot((snap) => {
  snapshot = snap;
  renderPill();
  if (hoverIndex >= 0) {
    renderCard(hoverIndex);
  }
});
window.pill.getSnapshot().then((snap) => {
  snapshot = snap;
  renderPill();
});

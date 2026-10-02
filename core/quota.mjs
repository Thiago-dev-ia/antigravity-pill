// Consulta a API oficial de quota do Google Cloud Code e converte a
// resposta nas 4 faixas por conta (Gemini 5h/semanal, 3P 5h/semanal).
const QUOTA_URL = 'https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary';
const UA = 'antigravity/hub/2.8.0';

export async function fetchQuota(token) {
  const res = await fetch(QUOTA_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': UA,
    },
    body: '{}',
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error?.message ?? `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return parseLanes(json);
}

function clamp01(v) {
  if (typeof v !== 'number' || Number.isNaN(v)) return null;
  return Math.min(1, Math.max(0, v));
}

function remainingOf(bucket) {
  const r = bucket.remainingFraction;
  if (r && typeof r === 'object' && 'value' in r) return clamp01(r.value);
  return clamp01(r);
}

export function parseLanes(payload) {
  const groups = payload?.groups ?? payload?.quotaGroups ?? [];
  const lanes = [];
  for (const g of groups) {
    for (const b of g.buckets ?? []) {
      if (b.disabled === true) continue;
      const remaining = remainingOf(b);
      if (remaining == null) continue;
      lanes.push({
        id: b.bucketId ?? b.name ?? 'lane',
        group: g.displayName ?? 'Quota',
        window: b.window ?? (String(b.bucketId ?? '').includes('weekly') ? 'weekly' : '5h'),
        used: 1 - remaining,
        resetsAt: b.resetTime ?? null,
      });
    }
  }
  // ordem estável: Gemini primeiro, 5h antes de semanal
  lanes.sort((a, b) =>
    (a.group === 'Gemini Models' ? 0 : 1) - (b.group === 'Gemini Models' ? 0 : 1) ||
    (a.window === '5h' ? 0 : 1) - (b.window === '5h' ? 0 : 1),
  );
  return lanes;
}

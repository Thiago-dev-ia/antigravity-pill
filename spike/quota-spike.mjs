// Spike: valida se o access_token de uma sessão do CLIProxyAPI
// funciona nas APIs de quota do Google Cloud Code (as mesmas que o
// Codenotch usa para contas Antigravity nativas).
// Uso: node spike-quota.mjs [email-da-conta]
// Sem argumento, usa a primeira sessão encontrada.

import { readdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

const AUTH_DIR = path.join(homedir(), '.cli-proxy-api');
const UA = 'antigravity/hub/2.8.0';

async function pickSession(wantedEmail) {
  const files = (await readdir(AUTH_DIR)).filter(f => f.startsWith('antigravity-') && f.endsWith('.json'));
  if (files.length === 0) throw new Error(`Nenhuma sessão antigravity-*.json em ${AUTH_DIR}`);
  if (!wantedEmail) return { file: files[0] };
  const match = files.find(f => f.includes(wantedEmail));
  if (!match) throw new Error(`Conta ${wantedEmail} não encontrada. Sessões: ${files.join(', ')}`);
  return { file: match };
}

async function callGoogle(endpoint, token, body = {}) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': UA,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* resposta não-JSON */ }
  return { status: res.status, json, text };
}

function summarizeQuota(json) {
  // O parser do Codenotch aceita groups/buckets em várias chaves; espelha isso.
  const root = json ?? {};
  const groups =
    root.groups ?? root.quotaGroups ?? root.response?.groups ?? root.summary?.groups ??
    (root.buckets ? [{ displayName: 'Todas', buckets: root.buckets }] : null);
  if (!groups) return '(formato inesperado — ver JSON bruto)';

  const lines = [];
  for (const g of groups) {
    lines.push(`Grupo: ${g.displayName ?? '(sem nome)'}`);
    for (const b of g.buckets ?? []) {
      const remaining = b.remainingFraction?.case === 'remainingFraction'
        ? b.remainingFraction.value
        : (typeof b.remainingFraction === 'number' ? b.remainingFraction : null);
      const used = typeof b.used === 'number' && typeof b.limit === 'number' && b.limit > 0
        ? b.used / b.limit
        : null;
      const usedPct = remaining != null ? (1 - remaining) * 100 : used != null ? used * 100 : null;
      const pct = usedPct != null ? `${usedPct.toFixed(1)}% usado` : 'fração indisponível';
      lines.push(`  - ${b.displayName ?? b.bucketId ?? b.modelId ?? '?'}: ${pct} | reset: ${b.resetTime ?? '?'} | disabled: ${b.disabled ?? false}`);
    }
  }
  return lines.join('\n');
}

const { file } = await pickSession(process.argv[2]);
const session = JSON.parse(await readFile(path.join(AUTH_DIR, file), 'utf-8'));
console.log(`Conta: ${session.email} (${file})`);
console.log(`Token expira em: ${session.expired} | disabled: ${session.disabled}`);
console.log('---');

console.log('>> POST loadCodeAssist (tier da conta)...');
const tier = await callGoogle(
  'https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist',
  session.access_token,
  { metadata: { pluginType: 'GEMINI' } },
);
console.log(`status: ${tier.status}`);
console.log(JSON.stringify(tier.json, null, 2)?.slice(0, 800) ?? tier.text.slice(0, 800));
console.log('---');

console.log('>> POST retrieveUserQuotaSummary (quota real)...');
const quota = await callGoogle(
  'https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary',
  session.access_token,
  {},
);
console.log(`status: ${quota.status}`);
if (quota.status === 200) {
  console.log(summarizeQuota(quota.json));
  console.log('--- JSON bruto (primeiros 2000 chars) ---');
  console.log(JSON.stringify(quota.json, null, 2).slice(0, 2000));
} else {
  console.log(quota.text.slice(0, 1000));
  process.exitCode = 1;
}

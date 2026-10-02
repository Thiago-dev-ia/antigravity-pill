// Valida o token renovado na API de quota (fecha o ciclo: sessão → refresh → quota)
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const TMP = path.join(homedir(), 'AppData', 'Local', 'Temp');
const token = readFileSync(path.join(TMP, 'ag_fresh_token.txt'), 'utf-8').trim();

const res = await fetch('https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'antigravity/hub/2.8.0',
  },
  body: '{}',
});
console.log('status:', res.status);
const j = await res.json();
if (res.status === 200) {
  for (const g of j.groups ?? []) {
    console.log(`\n${g.displayName}:`);
    for (const b of g.buckets ?? []) {
      const used = (1 - b.remainingFraction) * 100;
      console.log(`  ${b.bucketId}: ${used.toFixed(1)}% usado | reset ${b.resetTime}`);
    }
  }
} else {
  console.log(JSON.stringify(j).slice(0, 400));
  process.exitCode = 1;
}

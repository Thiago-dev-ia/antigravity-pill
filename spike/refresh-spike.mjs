// Testa o fluxo OAuth refresh_token usando as credenciais públicas do cliente Antigravity
// (as mesmas que o CLIProxyAPI embute), para renovar tokens expirados das sessões.
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const TMP = path.join(homedir(), 'AppData', 'Local', 'Temp');
const AUTH_DIR = path.join(homedir(), '.cli-proxy-api');
const CLIENT_ID = '1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com';

const secret = readFileSync(path.join(TMP, 'ag_secret.txt'), 'utf-8').trim();
const sessionFile = process.argv[2] ?? 'antigravity-sample@gmail.com.json';
const session = JSON.parse(readFileSync(path.join(AUTH_DIR, sessionFile), 'utf-8'));

console.log(`Conta: ${session.email} | token antigo expira: ${session.expired}`);

const body = new URLSearchParams({
  client_id: CLIENT_ID,
  client_secret: secret,
  refresh_token: session.refresh_token,
  grant_type: 'refresh_token',
});

const res = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body,
});
const j = await res.json();
console.log('status:', res.status);
if (j.access_token) {
  console.log(`access_token novo: ya29...${j.access_token.slice(-12)}`);
  console.log(`expires_in: ${j.expires_in}s`);
  writeFileSync(path.join(TMP, 'ag_fresh_token.txt'), j.access_token);
  console.log('token salvo em AppData/Local/Temp/ag_fresh_token.txt para o próximo teste');
} else {
  console.log('ERRO:', JSON.stringify(j).slice(0, 500));
  process.exitCode = 1;
}

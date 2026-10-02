// Lê as sessões OAuth2 que o CLIProxyAPI guarda em ~/.cli-proxy-api.
// Somente leitura — a pílula nunca escreve nesses arquivos (o proxy
// gerencia o próprio ciclo de refresh e metadados).
import { readdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

const AUTH_DIR = path.join(homedir(), '.cli-proxy-api');

export async function listSessions() {
  let files = [];
  try {
    files = (await readdir(AUTH_DIR))
      .filter(f => f.startsWith('antigravity-') && f.endsWith('.json'))
      .sort();
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
  const sessions = [];
  for (const file of files) {
    try {
      const raw = JSON.parse(await readFile(path.join(AUTH_DIR, file), 'utf-8'));
      sessions.push({
        file,
        email: raw.email ?? file,
        accessToken: raw.access_token ?? null,
        refreshToken: raw.refresh_token ?? null,
        expiredAt: raw.expired ? new Date(raw.expired).getTime() : null,
        disabled: raw.disabled === true,
        projectId: raw.project_id ?? null,
      });
    } catch (err) {
      sessions.push({ file, email: file, error: `sessão ilegível: ${err.message}` });
    }
  }
  return sessions;
}

export function maskEmail(email) {
  const [user, domain] = String(email).split('@');
  if (!domain) return email;
  const head = user.slice(0, Math.min(6, user.length));
  return `${head}…@${domain.split('.')[0]}`;
}

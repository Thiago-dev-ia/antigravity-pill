// Fluxo OAuth refresh_token usando as credenciais públicas do cliente
// Antigravity (as mesmas que o CLIProxyAPI e o CLI oficial embutem).
//
// O client_secret NÃO vai versionado: este módulo carrega
// `core/secret.local.mjs` (gitignored) ou a variável de ambiente
// AG_CLIENT_SECRET. Veja core/secret.example.mjs.
import { CLIENT_SECRET } from './secret.loader.mjs';

const CLIENT_ID = '1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

// cache em memória: email -> { token, expiresAt }
const cache = new Map();

export async function getAccessToken(session) {
  const now = Date.now();
  const cached = cache.get(session.email);
  if (cached && cached.expiresAt > now + 60_000) {
    return { token: cached.token, refreshed: false };
  }
  if (session.accessToken && session.expiredAt && session.expiredAt > now + 60_000) {
    return { token: session.accessToken, refreshed: false };
  }
  if (!session.refreshToken) {
    throw new Error('sem refresh_token na sessão');
  }
  if (!CLIENT_SECRET) {
    throw new Error('client secret ausente — crie core/secret.local.mjs (veja secret.example.mjs)');
  }
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: session.refreshToken,
    grant_type: 'refresh_token',
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(`refresh falhou (${res.status}): ${json.error ?? 'resposta inválida'}`);
  }
  const ttl = (json.expires_in ?? 3599) * 1000;
  cache.set(session.email, { token: json.access_token, expiresAt: now + ttl });
  return { token: json.access_token, refreshed: true };
}

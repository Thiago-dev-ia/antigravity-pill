// Orquestra o snapshot de todas as contas: sessão → token (cache/refresh) → quota.
import { listSessions, maskEmail } from './sessions.mjs';
import { getAccessToken } from './oauth.mjs';
import { fetchQuota } from './quota.mjs';

export async function buildSnapshot() {
  const sessions = await listSessions();
  const accounts = await Promise.all(
    sessions.map(async (session) => {
      const base = { email: session.email, short: maskEmail(session.email) };
      if (session.error) {
        return { ...base, status: 'error', error: session.error, lanes: null, fetchedAt: Date.now() };
      }
      if (session.disabled) {
        return { ...base, status: 'disabled', lanes: null, fetchedAt: Date.now() };
      }
      try {
        const { token, refreshed } = await getAccessToken(session);
        const lanes = await fetchQuota(token);
        return {
          ...base,
          status: refreshed ? 'refreshed' : 'ok',
          lanes,
          fetchedAt: Date.now(),
        };
      } catch (err) {
        return { ...base, status: 'error', error: err.message, lanes: null, fetchedAt: Date.now() };
      }
    }),
  );
  return { accounts, updatedAt: Date.now() };
}

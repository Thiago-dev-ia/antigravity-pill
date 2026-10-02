// Carrega o client secret do arquivo local (gitignored) ou da env.
// Este arquivo VAI pro GitHub — nunca coloque o secret real aqui.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

function fromLocalFile() {
  try {
    const mod = readFileSync(join(here, 'secret.local.mjs'), 'utf-8');
    const m = mod.match(/CLIENT_SECRET\s*=\s*['"]([^'"]+)['"]/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export const CLIENT_SECRET = fromLocalFile() ?? process.env.AG_CLIENT_SECRET ?? null;

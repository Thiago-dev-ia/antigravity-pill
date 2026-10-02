// COPIE este arquivo para `secret.local.mjs` (mesma pasta) e cole o
// client secret do cliente OAuth público do Antigravity CLI.
//
// Esse secret é o mesmo embutido no CLI oficial e no CLIProxyAPI
// (open-source): github.com/router-for-me/CLIProxyAPI — arquivo
// internal/auth/antigravity/constants.go. Não é um segredo de usuário;
// fica fora do git apenas por boas práticas (push protection do GitHub).
// Formato: começa com "GOCSPX-" (Google Cloud secret prefix).
export const CLIENT_SECRET = 'COLE_AQUI_O_SECRETO_DO_CLIENTE_ANTIGRAVITY';

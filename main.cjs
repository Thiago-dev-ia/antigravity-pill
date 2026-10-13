// Antigravity Pill — pílula de quota na borda da tela (Electron).
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const POLL_MS = 5 * 60 * 1000; // mesmo TTL de 5 min do Codenotch
const WIN_W = 500;
const WIN_H = 620;
const POS_FILE = path.join(__dirname, 'data', 'position.json');

let win = null;
let tray = null;
let buildSnapshot = null; // carregado via import dinâmico (módulos ESM)
let snapshot = { accounts: [], updatedAt: 0 };
let polling = false;
let saveTimer = null;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (!win.isVisible()) win.show();
      win.focus();
      if (!savedPositionOnScreen()) positionWindow();
    }
  });
}

function sendSnapshot() {
  if (win && !win.isDestroyed()) {
    win.webContents.send('pill:snapshot', snapshot);
  }
}

async function refreshNow() {
  if (polling || !buildSnapshot) return;
  polling = true;
  try {
    snapshot = await buildSnapshot();
    sendSnapshot();
    updateTrayTitle();
  } catch (err) {
    console.error('refresh falhou:', err.message);
  } finally {
    polling = false;
  }
}

function updateTrayTitle() {
  if (!tray) return;
  const ok = snapshot.accounts.filter(a => a.status === 'ok' || a.status === 'refreshed').length;
  tray.setToolTip(`Antigravity Pill — ${ok}/${snapshot.accounts.length} contas OK`);
}

function positionWindow() {
  // pílula "notch": pendurada no topo, canto direito
  const wa = screen.getPrimaryDisplay().workArea;
  win.setPosition(wa.x + wa.width - WIN_W - 2, wa.y);
}

// ---------- posição persistida (a pílula é arrastável) ----------
function savePosition() {
  if (!win || win.isDestroyed()) return;
  try {
    const [x, y] = win.getPosition();
    fs.mkdirSync(path.dirname(POS_FILE), { recursive: true });
    fs.writeFileSync(POS_FILE, JSON.stringify({ x, y }));
  } catch { /* falha silenciosa: posição é conveniência, não estado crítico */ }
}

function savedPositionOnScreen() {
  try {
    const { x, y } = JSON.parse(fs.readFileSync(POS_FILE, 'utf-8'));
    // válida só se algum monitor ainda contém a janela
    const onScreen = screen.getAllDisplays().some(d => {
      const wa = d.workArea;
      return x + WIN_W > wa.x && x < wa.x + wa.width && y + WIN_H > wa.y && y < wa.y + wa.height;
    });
    return onScreen ? { x, y } : null;
  } catch {
    return null;
  }
}

function restorePosition() {
  const saved = savedPositionOnScreen();
  if (saved) win.setPosition(saved.x, saved.y);
  else positionWindow();
}

function createWindow() {
  const debugOpaque = process.env.PILL_DEBUG_OPAQUE === '1';
  win = new BrowserWindow({
    width: WIN_W,
    height: WIN_H,
    frame: false,
    transparent: !debugOpaque,
    backgroundColor: debugOpaque ? '#0A192F' : undefined,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => {
    restorePosition();
    win.show();
    win.setIgnoreMouseEvents(true, { forward: true });
  });
  // arrastou? guarda a posição (debounce)
  win.on('move', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(savePosition, 400);
  });
  // monitor mudou/desligou: se a janela ficou fora da tela, volta pra borda direita
  const reclamp = () => {
    if (!savedPositionOnScreen()) positionWindow();
  };
  screen.on('display-metrics-changed', reclamp);
  screen.on('display-removed', reclamp);
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png'));
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  const toggleVisible = () => {
    if (win.isVisible()) win.hide();
    else {
      win.show();
      if (!savedPositionOnScreen()) positionWindow();
    }
  };
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Atualizar agora', click: refreshNow },
    { label: 'Mostrar/ocultar pílula', click: toggleVisible },
    { label: 'Reposicionar na borda direita', click: () => { positionWindow(); savePosition(); } },
    { type: 'separator' },
    { label: 'Sair', click: () => app.quit() },
  ]));
  tray.on('click', toggleVisible);
  updateTrayTitle();
}

ipcMain.handle('pill:get-snapshot', () => snapshot);
ipcMain.handle('pill:refresh', () => refreshNow());
ipcMain.on('pill:hide', () => win && !win.isDestroyed() && win.hide());
ipcMain.on('pill:set-interactive', (_e, interactive) => {
  if (win && !win.isDestroyed()) {
    if (interactive) win.setIgnoreMouseEvents(false);
    else win.setIgnoreMouseEvents(true, { forward: true });
  }
});

app.whenReady().then(async () => {
  ({ buildSnapshot } = await import('./core/poller.mjs'));
  createWindow();
  createTray();
  refreshNow();
  setInterval(refreshNow, POLL_MS);
});

app.on('before-quit', savePosition);

app.on('window-all-closed', () => {
  // pílula vive na bandeja; só sai pelo menu
});

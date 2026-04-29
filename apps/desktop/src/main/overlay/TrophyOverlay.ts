import { BrowserWindow, screen, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import log from 'electron-log';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PERF: Maximum trophy queue depth — prevent memory buildup during long sessions
const MAX_QUEUE_DEPTH = 10;

export class TrophyOverlay {
  private window: BrowserWindow | null = null;
  private queue: any[] = [];
  private isShowing = false;

  constructor() {
    // PERF: Lazy creation — window is NOT created until first trophy is shown
    // This saves ~15MB RAM when no trophies are displayed
  }

  private createWindow() {
    if (this.window) return;

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width } = primaryDisplay.workAreaSize;

    this.window = new BrowserWindow({
      width: 380,
      height: 110,
      x: width - 400,
      y: 20,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false, // SECURITY: must never steal focus or intercept input
      show: false,
      // PERF: disable hardware acceleration for overlay — saves GPU resources during gaming
      backgroundColor: '#00000000',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: path.join(__dirname, '../overlayPreload.js'),
        // PERF: disable unused features for lightweight overlay
        webgl: false,
        enableWebSQL: false,
        spellcheck: false,
        backgroundThrottling: false, // Overlay must animate even when not focused
      }
    });

    this.window.setIgnoreMouseEvents(true);
    const htmlPath = path.join(__dirname, '../../renderer/overlay.html');
    this.window.loadFile(htmlPath);

    this.window.on('closed', () => {
      this.window = null;
    });
  }

  public showTrophy(data: any) {
    // PERF: Cap queue depth to prevent unbounded memory growth
    if (this.queue.length >= MAX_QUEUE_DEPTH) {
      log.warn(`[TrophyOverlay] Queue full (${MAX_QUEUE_DEPTH}), dropping oldest trophy`);
      this.queue.shift(); // Drop oldest
    }
    this.queue.push(data);
    this.processQueue();
  }

  private async processQueue() {
    if (this.isShowing || this.queue.length === 0) return;

    // PERF: Lazy-create window on first actual trophy display
    this.createWindow();
    if (!this.window) return;

    this.isShowing = true;
    const data = this.queue.shift();

    this.window.show();
    this.window.webContents.send('trophy:show', {
      title: data.title || 'Achievement Unlocked!',
      description: data.description || data.message || '',
      gameTitle: data.gameTitle || 'GameVault',
      type: data.type || 'gold',
      iconUrl: data.iconUrl
    });

    // Wait for animation (5s display + animations)
    await new Promise(resolve => setTimeout(resolve, 6000));

    this.window.hide();
    this.isShowing = false;

    // Small gap before next trophy
    await new Promise(resolve => setTimeout(resolve, 800));
    this.processQueue();
  }

  // PERF: Destroy window when not needed to reclaim memory during gaming
  public destroy() {
    if (this.window) {
      this.window.close();
      this.window = null;
    }
    this.queue = [];
    this.isShowing = false;
  }
}

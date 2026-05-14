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
  private isProcessing = false;

  constructor() {
    // PERF: Lazy creation — window is NOT created until first trophy is shown
    // This saves ~15MB RAM when no trophies are displayed
  }

  private async createWindow() {
    if (this.window) return;
    log.info(`[TrophyOverlay] Creating BrowserWindow for trophies...`);

    const cursorPoint = screen.getCursorScreenPoint();
    const activeDisplay = screen.getDisplayNearestPoint(cursorPoint);
    const { width, x, y } = activeDisplay.workArea;
    log.info(`[TrophyOverlay] Active display bounds: x=${x}, y=${y}, width=${width}`);
    log.info(`[TrophyOverlay] Window target position: x=${x + width - 440}, y=${y + 20}`);

    this.window = new BrowserWindow({
      width: 420,
      height: 120,
      x: x + width - 440,
      y: y + 20,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false, // SECURITY: must never steal focus or intercept input
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: path.join(__dirname, '../overlayPreload.cjs'),
        // PERF: disable unused features for lightweight overlay
        webgl: false,
        enableWebSQL: false,
        spellcheck: false,
        backgroundThrottling: false, // Overlay must animate even when not focused
      }
    });

    this.window.setIgnoreMouseEvents(true);
    this.window.setAlwaysOnTop(true, 'screen-saver');
    const htmlPath = path.join(__dirname, '../../renderer/overlay.html');
    this.window.loadFile(htmlPath);

    this.window.on('closed', () => {
      this.window = null;
    });

    // Wait for file to load to prevent race conditions
    await new Promise(resolve => (this.window?.webContents as any).once('did-finish-load', resolve));
  }

  public showTrophy(data: any) {
    log.info(`[TrophyOverlay] Queueing trophy: ${data.title}`);
    // PERF: Cap queue depth to prevent unbounded memory growth
    if (this.queue.length >= MAX_QUEUE_DEPTH) {
      log.warn(`[TrophyOverlay] Queue full (${MAX_QUEUE_DEPTH}), dropping oldest trophy`);
      this.queue.shift(); // Drop oldest
    }
    this.queue.push(data);
    this.processQueue();
  }

  private getMainWindow(): BrowserWindow | null {
    const windows = BrowserWindow.getAllWindows();
    return windows.find(w => w !== this.window && !w.isDestroyed() && w.isFocusable()) || null;
  }

  private async processQueue() {
    if (this.isProcessing || this.isShowing || this.queue.length === 0) return;
    this.isProcessing = true;

    try {
      // PERF: Lazy-create window on first actual trophy display
      await this.createWindow();
      if (!this.window) return;

      this.isShowing = true;
      const data = this.queue.shift();
      log.info(`[TrophyOverlay] Showing trophy: ${data.title}`);

      // Position and size the window
      // ALWAYS use full screen bounds so animations can be free-flowing and unconfined
      const cursorPoint = screen.getCursorScreenPoint();
      const activeDisplay = screen.getDisplayNearestPoint(cursorPoint);
      const { width, height, x, y } = activeDisplay.workArea;
      
      this.window.setBounds({ x, y, width, height });
      this.window.setAlwaysOnTop(true, 'screen-saver');

      this.window.showInactive();
      this.window.webContents.send('trophy:show', {
        title: data.title || 'Achievement Unlocked!',
        description: data.description || data.message || '',
        gameTitle: data.gameTitle || 'GameVault',
        type: data.type || 'gold',
        iconUrl: data.iconUrl,
        globalPercent: data.globalPercent,
        earnedAt: data.earnedAt,
        source: data.source
      });

      // Wait for animation (5s display + animations)
      await new Promise(resolve => setTimeout(resolve, 6000));

      this.window.hide();
      this.isShowing = false;

      // Small gap before next trophy
      await new Promise(resolve => setTimeout(resolve, 800));
    } finally {
      this.isProcessing = false;
      this.processQueue();
    }
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

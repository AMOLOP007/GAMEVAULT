import fs from 'fs';
import path from 'path';
import chokidar, { FSWatcher } from 'chokidar';
import log from 'electron-log';

export class AchievementWatcher {
  private watcher: FSWatcher | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private fallbackTimer: NodeJS.Timeout | null = null;
  private lastMtime: number = 0;
  private unlinked: boolean = false;
  private lastChangeTime: number = 0;
  private onChangeCallback: (() => void) | null = null;

  start(filePath: string, onChange: () => void): void {
    this.onChangeCallback = onChange;
    
    if (!fs.existsSync(filePath)) {
      log.warn(`[AchWatcher] File does not exist yet: ${filePath}. Watching directory instead.`);
    }

    const dirToWatch = path.dirname(filePath);
    const filename = path.basename(filePath);

    log.info(`[AchWatcher] Starting watcher for ${filePath}`);

    try {
      // Primary Watcher: Chokidar
      this.watcher = chokidar.watch(filePath, {
        persistent: true,
        usePolling: false,
        awaitWriteFinish: {
          stabilityThreshold: 500,
          pollInterval: 100
        },
        ignoreInitial: true,
      });

      const handleChange = () => {
        this.triggerChange();
      };

      this.watcher.on('change', handleChange);
      this.watcher.on('add', handleChange);
      
      // Atomic write detection
      this.watcher.on('unlink', () => {
        log.info(`[AchWatcher] Detected unlink (possible atomic write) for ${filename}`);
        this.unlinked = true;
      });

      this.watcher.on('add', () => {
        if (this.unlinked) {
          log.info(`[AchWatcher] File reappeared after unlink, triggering change.`);
          this.unlinked = false;
          handleChange();
        }
      });

      this.watcher.on('error', (err: any) => {
        log.error(`[AchWatcher] Chokidar error: ${err.message}`);
      });

      // 10-second fallback trigger
      this.fallbackTimer = setTimeout(() => {
        log.warn(`[AchWatcher] No events received from chokidar in 10s for ${filename}. Switching to polling.`);
        this.startPolling(filePath);
      }, 10000);

      // Clear fallback timer on first event
      const clearFallback = () => {
        if (this.fallbackTimer) {
          clearTimeout(this.fallbackTimer);
          this.fallbackTimer = null;
          log.info(`[AchWatcher] Chokidar active, cleared fallback timer for ${filename}`);
        }
      };

      this.watcher.on('change', clearFallback);
      this.watcher.on('add', clearFallback);

    } catch (err: any) {
      log.error(`[AchWatcher] Failed to start chokidar: ${err.message}. Falling back to polling immediately.`);
      this.startPolling(filePath);
    }
  }

  private startPolling(filePath: string) {
    if (this.pollTimer) return;

    try {
      if (fs.existsSync(filePath)) {
        this.lastMtime = fs.statSync(filePath).mtimeMs;
      }
    } catch (err) {
      this.lastMtime = 0;
    }

    log.info(`[AchWatcher] Started polling for ${filePath}`);
    
    this.pollTimer = setInterval(() => {
      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          if (stats.mtimeMs > this.lastMtime) {
            log.info(`[AchWatcher] Polling detected change in ${filePath}`);
            this.lastMtime = stats.mtimeMs;
            this.triggerChange();
          }
        }
      } catch (err: any) {
        log.warn(`[AchWatcher] Polling read error: ${err.message}`);
      }
    }, 1000);
  }

  private triggerChange() {
    const now = Date.now();
    // Debounce: 400ms
    if (now - this.lastChangeTime > 400) {
      this.lastChangeTime = now;
      if (this.onChangeCallback) {
        this.onChangeCallback();
      }
    } else {
      log.info(`[AchWatcher] Change ignored due to debounce.`);
    }
  }

  stop(): void {
    log.info(`[AchWatcher] Stopping watcher`);
    
    if (this.watcher) {
      this.watcher.close().catch(() => {});
      this.watcher = null;
    }
    
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    
    this.onChangeCallback = null;
  }
}

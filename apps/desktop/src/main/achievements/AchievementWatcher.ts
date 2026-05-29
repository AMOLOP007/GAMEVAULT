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
          stabilityThreshold: 400,
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

      // Also watch the parent directory explicitly — catches lazy file creation
      // by emulators that don't create the achievements file until the first unlock.
      const parentDir = path.dirname(filePath);
      if (parentDir !== filePath) {
        try {
          const dirWatcher = chokidar.watch(parentDir, {
            persistent: true,
            usePolling: false,
            ignoreInitial: true,
            depth: 0,
          });
          dirWatcher.on('add', (addedPath: string) => {
            if (path.basename(addedPath).toLowerCase() === path.basename(filePath).toLowerCase()) {
              log.info(`[AchWatcher] Target file created in parent dir: ${addedPath}`);
              this.triggerChange();
            }
          });
          // Store reference so we can close it on stop
          (this as any)._dirWatcher = dirWatcher;
        } catch (dirErr: any) {
          log.warn(`[AchWatcher] Failed to watch parent dir ${parentDir}: ${dirErr.message}`);
        }
      }

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

  private debounceTimer: NodeJS.Timeout | null = null;

  private triggerChange() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Aggressive debounce: wait 800ms after the LAST change event before firing
    this.debounceTimer = setTimeout(() => {
      log.info(`[AchWatcher] Firing debounced change event.`);
      if (this.onChangeCallback) {
        this.onChangeCallback();
      }
    }, 800);
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
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    // Close parent directory watcher if it exists
    if ((this as any)._dirWatcher) {
      (this as any)._dirWatcher.close().catch(() => {});
      (this as any)._dirWatcher = null;
    }
    
    this.onChangeCallback = null;
  }
}

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import log from 'electron-log';
import vdf from 'vdf-parser';

export interface SteamManifest {
  appId: number;
  name: string;
  installDir: string;
  fullInstallPath: string;
  stateFlags: number;
  isFullyInstalled: boolean;
}

export class SteamService {
  private steamPath: string | null = null;
  private watchers: Map<number, fs.FSWatcher> = new Map();

  constructor() {
    this.steamPath = this.resolveSteamPath();
  }

  private resolveSteamPath(): string | null {
    if (process.platform !== 'win32') return null;
    try {
      const result = execSync(
        'reg query "HKCU\\SOFTWARE\\Valve\\Steam" /v "SteamPath"',
        { stdio: 'pipe' }
      ).toString();
      const match = result.match(/SteamPath\s+REG_SZ\s+(.+)/);
      if (match) return path.normalize(match[1].trim());
    } catch (e) {
      log.warn('[SteamService] Could not find Steam path in registry');
    }
    return null;
  }

  public getPath(): string | null {
    return this.steamPath;
  }

  public getAllLibraryPaths(): string[] {
    if (!this.steamPath) return [];
    
    const libraries: string[] = [path.join(this.steamPath, 'steamapps')];
    const vdfPath = path.join(this.steamPath, 'steamapps', 'libraryfolders.vdf');
    
    if (fs.existsSync(vdfPath)) {
      try {
        const content = fs.readFileSync(vdfPath, 'utf8');
        const parsed: any = vdf.parse(content);
        const folders = parsed?.libraryfolders || {};
        
        for (const key of Object.keys(folders)) {
          const folderPath = folders[key]?.path;
          if (folderPath) {
            const appsPath = path.join(folderPath, 'steamapps');
            if (fs.existsSync(appsPath) && !libraries.includes(appsPath)) {
              libraries.push(appsPath);
            }
          }
        }
      } catch (e) {
        log.error('[SteamService] Failed to parse libraryfolders.vdf');
      }
    }
    
    return libraries;
  }

  public getManifest(appId: number): SteamManifest | null {
    const libraries = this.getAllLibraryPaths();
    for (const lib of libraries) {
      const acfPath = path.join(lib, `appmanifest_${appId}.acf`);
      if (fs.existsSync(acfPath)) {
        try {
          const content = fs.readFileSync(acfPath, 'utf8');
          const parsed: any = (vdf.parse(content) as any)?.AppState;
          if (parsed) {
            const stateFlags = parseInt(parsed.StateFlags || '0');
            return {
              appId: parseInt(parsed.appid),
              name: parsed.name,
              installDir: parsed.installdir,
              fullInstallPath: path.join(lib, 'common', parsed.installdir),
              stateFlags,
              isFullyInstalled: (stateFlags & 4) !== 0
            };
          }
        } catch (e) {
          continue;
        }
      }
    }
    return null;
  }

  /**
   * Watches Steam's registry.vdf for RunningAppID changes.
   * This is much more efficient than process polling.
   */
  public watchRunningApp(expectedAppId: number, onStart: () => void, onEnd: () => void) {
    if (!this.steamPath) return;
    
    const registryVdf = path.join(this.steamPath, 'registry.vdf');
    if (!fs.existsSync(registryVdf)) return;

    let isRunning = false;

    const checkState = () => {
      try {
        const content = fs.readFileSync(registryVdf, 'utf8');
        const match = content.match(/"RunningAppID"\s+"(\d+)"/i);
        const runningId = match ? parseInt(match[1]) : 0;

        if (!isRunning && runningId === expectedAppId) {
          isRunning = true;
          onStart();
        } else if (isRunning && runningId !== expectedAppId) {
          isRunning = false;
          onEnd();
        }
      } catch (e) {
        // File might be locked
      }
    };

    // Initial check
    checkState();

    const watcher = fs.watch(registryVdf, (event) => {
      if (event === 'change') {
        checkState();
      }
    });

    this.watchers.set(expectedAppId, watcher);
    return () => {
      watcher.close();
      this.watchers.delete(expectedAppId);
    };
  }

  public stopWatching(appId: number) {
    const watcher = this.watchers.get(appId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(appId);
    }
  }

  /**
   * Checks if Steam is in Offline Mode
   */
  public isOffline(): boolean {
    if (!this.steamPath) return false;
    const configPath = path.join(this.steamPath, 'config', 'config.vdf');
    if (!fs.existsSync(configPath)) return false;

    try {
      const content = fs.readFileSync(configPath, 'utf8');
      // ConnectToFriends "0" usually means offline/invisible
      return /"ConnectToFriends"\s+"0"/i.test(content);
    } catch (e) {
      return false;
    }
  }
}

export const steamService = new SteamService();

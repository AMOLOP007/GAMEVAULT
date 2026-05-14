import { shell } from 'electron'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import log from 'electron-log'

export type LaunchMethod = 'steam' | 'epic' | 'gog' | 'exe' | 'uri' | 'stove'

export interface LaunchConfig {
  gameId: string
  title: string
  method: LaunchMethod
  steamAppId?: number
  epicAppId?: string
  gogAppId?: number | string
  exePath?: string
  launchUri?: string
  workingDirectory?: string
}

export interface LaunchResult {
  success: boolean
  error?: string
  method?: LaunchMethod
  processHandle?: any
}

export class GameLauncher {
  private async isGOGInstalled(): Promise<boolean> {
    if (process.platform !== 'win32') return false
    try {
      const { execSync } = await import('child_process')
      execSync('reg query "HKLM\\SOFTWARE\\GOG.com\\GalaxyClient" /v "clientExecutable"', { stdio: 'pipe' })
      return true
    } catch {
      try {
        const { execSync } = await import('child_process')
        execSync('reg query "HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\GalaxyClient" /v "clientExecutable"', { stdio: 'pipe' })
        return true
      } catch {
        return false
      }
    }
  }

  private async isSteamInstalled(): Promise<boolean> {
    if (process.platform !== 'win32') return false
    try {
      const { execSync } = await import('child_process')
      execSync('reg query "HKCU\\SOFTWARE\\Valve\\Steam" /v "SteamExe"', { stdio: 'pipe' })
      return true
    } catch {
      return false
    }
  }

  private async launchViaSteam(appId: number, exePath?: string): Promise<void> {
    const { steamService } = await import('../services/steamService.js');
    const manifest = steamService.getManifest(appId);

    if (manifest && manifest.isFullyInstalled) {
      const uri = `steam://rungameid/${appId}`;
      await shell.openExternal(uri);
      log.info(`[Launcher] Steam launch triggered for ${appId} (Local Manifest Verified)`);
    } else if (exePath) {
      log.warn(`[Launcher] Steam manifest not found or incomplete. Falling back to direct exe: ${exePath}`);
      await this.launchViaExe(exePath);
    } else {
      // Last resort: try the protocol anyway
      const uri = `steam://rungameid/${appId}`;
      await shell.openExternal(uri);
      log.info(`[Launcher] Steam launch triggered via protocol (No local manifest fallback)`);
    }
  }

  private async launchViaEpic(appId: string, launchUri?: string): Promise<void> {
    // Prefer a stored launch URI (contains correct AppName) over constructing from epicAppId
    // epicAppId stores the CatalogNamespace (sandbox ID for achievement API) which is different
    // from the AppName used in the launcher protocol
    const uri = launchUri || `com.epicgames.launcher://apps/${appId}?action=launch&silent=true`
    await shell.openExternal(uri)
    log.info(`[Launcher] Epic Games launch triggered (uri: ${uri})`)
  }

  private async launchViaGOG(gogAppId: number | string, exePath?: string): Promise<void> {
    const gogInstalled = await this.isGOGInstalled()
    
    if (gogInstalled) {
      const uri = `goggalaxy://openGame/${gogAppId}`
      await shell.openExternal(uri)
      log.info(`[Launcher] GOG Galaxy launch triggered for ${gogAppId}`)
    } else if (exePath) {
      log.warn(`[Launcher] GOG Galaxy not installed. Falling back to exe: ${exePath}`)
      await this.launchViaExe(exePath)
    } else {
      throw new Error('GOG Galaxy is not installed and no executable path is set for this game.')
    }
  }

  private async launchViaExe(exePath: string, workingDir?: string): Promise<any> {
    // SECURITY: Require absolute paths only
    if (!path.isAbsolute(exePath)) {
      throw new Error(`Executable path must be absolute: ${exePath}`)
    }

    // SECURITY: Block directory traversal
    const normalized = path.normalize(exePath)
    if (normalized.includes('..')) {
      throw new Error('Path traversal detected in executable path')
    }

    // SECURITY: Block system directories
    const blockedDirs = [
      'C:\\Windows', 'C:\\Windows\\System32', 'C:\\Windows\\SysWOW64',
      'C:\\Program Files\\Windows', 'C:\\ProgramData\\Microsoft'
    ]
    const lowerPath = normalized.toLowerCase()
    for (const dir of blockedDirs) {
      if (lowerPath.startsWith(dir.toLowerCase())) {
        throw new Error(`Cannot launch executables from system directory: ${dir}`)
      }
    }

    if (!fs.existsSync(normalized)) {
      throw new Error(`Executable not found at path: ${normalized}. Please check if the game is still installed or update the path in settings.`)
    }
    
    const cwd = workingDir || path.dirname(normalized)
    log.info(`[Launcher] Attempting to launch: ${normalized} in ${cwd}`)

    // If it's a shortcut (.lnk), use shell.openPath so Windows handles it properly (like double-clicking)
    if (normalized.toLowerCase().endsWith('.lnk')) {
      log.info(`[Launcher] Detected shortcut (.lnk), using shell.openPath for Explorer behavior`);
      const error = await shell.openPath(normalized);
      if (error) {
        throw new Error(`Failed to open shortcut: ${error}`);
      }
      return null; // Return null so it falls back to fuzzy matching in index.ts
    }

    try {
      const child = spawn(normalized, [], {
        detached: true, // Allow it to live beyond GameVault if needed, but we still track it
        stdio: 'ignore',
        cwd,
        windowsHide: false,
        shell: true, // Support .bat and .cmd files on Windows
        env: { ...process.env }
      })
      
      child.on('error', (err) => {
        log.error(`[Launcher] Process spawn error: ${err.message}`)
      })

      child.unref()
      log.info(`[Launcher] Successfully spawned process: ${child.pid}`)
      return child // Return the handle for the tracker
    } catch (err: any) {
      log.error(`[Launcher] Failed to spawn process: ${err.message}`)
      throw new Error(`Failed to launch executable: ${err.message}. Try running GameVault as administrator if this continues.`)
    }
  }

  private async launchViaUri(uri: string): Promise<void> {
    await shell.openExternal(uri)
  }

  async launch(config: LaunchConfig): Promise<LaunchResult> {
    let childHandle: any = null;
    try {
      log.info(`[Launcher] Launching ${config.title} (Method: ${config.method}, EXE: ${config.exePath})`)
      
      // 1. Manual EXE Priority: If user explicitly provided an EXE, use it.
      // We assume if method is 'exe', it's already prioritized.
      
      switch (config.method) {
        case 'steam': 
          await this.launchViaSteam(config.steamAppId!, config.exePath)
          break
        case 'epic':  
          await this.launchViaEpic(config.epicAppId!, config.launchUri)
          break
        case 'gog':   
          await this.launchViaGOG(config.gogAppId!, config.exePath)
          break
        case 'exe':   
          childHandle = await this.launchViaExe(config.exePath!, config.workingDirectory)
          break
        case 'uri':   
          await this.launchViaUri(config.launchUri!)
          break
        case 'stove': 
          if (config.launchUri) {
            await this.launchViaUri(config.launchUri)
          } else if (config.exePath) {
            childHandle = await this.launchViaExe(config.exePath)
          } else {
            throw new Error('No URI or EXE path provided for Stove game')
          }
          break
        default:
          throw new Error(`Unknown launch method: ${config.method}`)
      }
      
      return { success: true, method: config.method, processHandle: childHandle }
    } catch (err: any) {
      log.error(`[Launcher] Failed to launch ${config.title}:`, err)
      
      // Fallback: If platform launch failed, try direct EXE if available
      if (config.exePath && config.method !== 'exe') {
        log.warn(`[Launcher] Platform launch failed for ${config.title}. Falling back to direct EXE...`)
        try {
          const handle = await this.launchViaExe(config.exePath)
          return { success: true, method: 'exe', processHandle: handle }
        } catch (fallbackErr: any) {
          log.error(`[Launcher] Fallback EXE launch also failed: ${fallbackErr.message}`)
        }
      }
      
      return { success: false, error: err.message, method: config.method }
    }
  }
}

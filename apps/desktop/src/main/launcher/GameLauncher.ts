import { shell } from 'electron'
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import log from 'electron-log'

export type LaunchMethod = 'steam' | 'epic' | 'gog' | 'exe' | 'uri'

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

  private async launchViaEpic(appId: string): Promise<void> {
    const uri = `com.epicgames.launcher://apps/${appId}?action=launch&silent=true`
    await shell.openExternal(uri)
    log.info(`[Launcher] Epic Games launch triggered for ${appId}`)
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

  private async launchViaExe(exePath: string, workingDir?: string): Promise<void> {
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

    try {
      const child = spawn(normalized, [], {
        detached: false, // SECURITY: do not detach — track the child process
        stdio: 'ignore',
        cwd,
        windowsHide: false,
        env: { ...process.env }
      })
      
      child.on('error', (err) => {
        log.error(`[Launcher] Process spawn error: ${err.message}`)
      })

      child.unref()
      log.info(`[Launcher] Successfully spawned process: ${child.pid}`)
    } catch (err: any) {
      log.error(`[Launcher] Failed to spawn process: ${err.message}`)
      throw new Error(`Failed to launch executable: ${err.message}. Try running GameVault as administrator if this continues.`)
    }
  }

  private async launchViaUri(uri: string): Promise<void> {
    await shell.openExternal(uri)
  }

  async launch(config: LaunchConfig): Promise<LaunchResult> {
    try {
      log.info(`[Launcher] Launching ${config.title} via ${config.method}`)
      
      switch (config.method) {
        case 'steam': await this.launchViaSteam(config.steamAppId!, config.exePath)
          break
        case 'epic':  await this.launchViaEpic(config.epicAppId!)
          break
        case 'gog':   await this.launchViaGOG(config.gogAppId!, config.exePath)
          break
        case 'exe':   await this.launchViaExe(config.exePath!, config.workingDirectory)
          break
        case 'uri':   await this.launchViaUri(config.launchUri!)
          break
        default:
          throw new Error(`Unknown launch method: ${config.method}`)
      }
      
      return { success: true, method: config.method }
    } catch (err: any) {
      log.error(`[Launcher] Failed to launch ${config.title}:`, err)
      return { success: false, error: err.message, method: config.method }
    }
  }
}

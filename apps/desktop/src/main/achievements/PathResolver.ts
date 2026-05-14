import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import { execSync } from 'child_process';
import log from 'electron-log';

function findSteamAppIdInDir(dir: string): string | null {
  let currentDir = dir;
  for (let i = 0; i < 8; i++) {
    const filePath = path.join(currentDir, 'steam_appid.txt');
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8').trim();
        if (content && /^\d+$/.test(content)) {
          return content;
        }
      } catch (err) {
        // Ignore read errors
      }
    }
    const parent = path.dirname(currentDir);
    if (parent === currentDir) break;
    currentDir = parent;
  }
  return null;
}

export interface ResolvedPath {
  filePath: string;
  format: 'json' | 'ini';
  emulator: string;
  fileMissing?: boolean;
}

export async function resolveAchievementPath(steamAppId: number | null, installDir: string): Promise<ResolvedPath | null> {
  let appIdStr = steamAppId ? String(steamAppId) : null;

  // Helper to check for steam_appid.txt in dir or parents
  if (!appIdStr) {
    appIdStr = findSteamAppIdInDir(installDir);
    if (appIdStr) {
      log.info(`[PathResolver] Found AppID from steam_appid.txt: ${appIdStr}`);
    }
  }

  if (!appIdStr) {
    log.info(`[PathResolver] No AppID provided or found for ${installDir}`);
    return null;
  }

  // ── LAYER 1: Scan Install Directory and Parents ────────────────────────────
  log.info(`[PathResolver] Layer 1: Scanning install dir and parents: ${installDir}`);
  
  const patterns = [
    'steam_settings/achievements.json',
    'steam_emu.ini',
    'SmartSteamAch.bin',
    'SteamEmu.ini',
    'ALI213.ini',
    'valve.ini',
    'Engine/Binaries/ThirdParty/Steamworks/Steamv*/Win64/steam_settings/achievements.json'
  ];

  let currentDir = installDir;
  for (let i = 0; i < 8; i++) { // Scan up to 8 levels
    if (currentDir.endsWith(':\\') || currentDir.endsWith(':/')) break; // Prevent scanning entire drive
    
    // Hardcoded check for specific paths to avoid glob failures
    const specificPath = path.join(currentDir, 'Engine/Binaries/ThirdParty/Steamworks/Steamv151/Win64/steam_settings/achievements.json');
    if (fs.existsSync(specificPath)) {
      log.info(`[PathResolver] Found hardcoded achievement path: ${specificPath}`);
      return { filePath: specificPath, format: 'json', emulator: 'goldberg' };
    }

    try {
      const files = await fg(patterns, { cwd: currentDir, absolute: true, caseSensitiveMatch: false });
      
      let foundAchievements = false;
      for (const file of files) {
        const filename = path.basename(file).toLowerCase();
        
        if (filename === 'achievements.json') {
          return { filePath: file, format: 'json', emulator: 'goldberg_or_creamapi' };
        }
        
        if (filename.endsWith('.ini')) {
          const savePath = extractSavePathFromIni(file);
          if (savePath && fs.existsSync(savePath)) {
            const format = detectEmulatorFormat(savePath);
            return { filePath: savePath, format: format !== 'unknown' ? format : 'ini', emulator: 'custom_via_ini' };
          }
          return { filePath: file, format: 'ini', emulator: 'generic_ini' };
        }
        
        if (filename.endsWith('.bin')) {
          return { filePath: file, format: 'ini', emulator: 'smartsteam' };
        }
      }

      // If we didn't find achievements.json, check if the folder exists (missing file case)
      const steamSettingsDir = path.join(currentDir, 'steam_settings');
      if (fs.existsSync(steamSettingsDir) && !fs.existsSync(path.join(steamSettingsDir, 'achievements.json'))) {
        return { filePath: path.join(steamSettingsDir, 'achievements.json'), format: 'json', emulator: 'goldberg', fileMissing: true };
      }

      // Check Unreal Engine specific path missing file
      const ueDirs = await fg('Engine/Binaries/ThirdParty/Steamworks/Steamv*/Win64/steam_settings', { cwd: currentDir, absolute: true, onlyDirectories: true });
      if (ueDirs.length > 0) {
        const ueDir = ueDirs[0];
        if (!fs.existsSync(path.join(ueDir, 'achievements.json'))) {
          return { filePath: path.join(ueDir, 'achievements.json'), format: 'json', emulator: 'goldberg', fileMissing: true };
        }
      }

    } catch (err: any) {
      log.warn(`[PathResolver] Layer 1 scan failed at ${currentDir}: ${err.message}`);
    }
    
    const parent = path.dirname(currentDir);
    if (parent === currentDir || currentDir.endsWith(':\\') || currentDir.endsWith(':/')) break; // Reached root or drive root
    currentDir = parent;
  }

  // ── LAYER 2: Check Environment Variable Paths ──────────────────────────────
  log.info(`[PathResolver] Layer 2: Checking standard environment paths`);
  
  const appdata = process.env.APPDATA || '';
  const programData = process.env.PROGRAMDATA || 'C:\\ProgramData';
  const publicDocs = path.join(process.env.PUBLIC || 'C:\\Users\\Public', 'Documents');

  const layer2Paths: { path: string; format: 'json' | 'ini'; emulator: string }[] = [
    {
      path: path.join(publicDocs, 'Steam', 'TENOKE', appIdStr, 'achievements.ini'),
      format: 'ini',
      emulator: 'tenoke'
    },
    {
      path: path.join(appdata, 'Goldberg SteamEmu Saves', appIdStr, 'achievements.json'),
      format: 'json',
      emulator: 'goldberg'
    },
    {
      path: path.join(programData, 'CODEX', appIdStr, 'achievements.ini'),
      format: 'ini',
      emulator: 'codex'
    },
    {
      path: path.join(appdata, 'EMPRESS', appIdStr, 'achiev.json'),
      format: 'json',
      emulator: 'empress'
    },
    {
      path: path.join(programData, 'RLD!', appIdStr, 'achievements.ini'),
      format: 'ini',
      emulator: 'rld'
    }
  ];

  for (const p of layer2Paths) {
    if (fs.existsSync(p.path)) {
      return { filePath: p.path, format: p.format, emulator: p.emulator };
    }
  }

  // ── LAYER 3: Registry Scan (Windows Only) ──────────────────────────────────
  if (process.platform === 'win32') {
    log.info(`[PathResolver] Layer 3: Checking registry`);
    
    const regChecks = [
      { key: 'HKCU\\Software\\Goldberg SteamEmu Saves', value: 'SavePath', emulator: 'goldberg' },
      { key: 'HKCU\\Software\\EMPRESS', value: 'SavePath', emulator: 'empress' }
    ];

    for (const check of regChecks) {
      try {
        const output = execSync(`reg query "${check.key}" /v "${check.value}"`, { stdio: 'pipe' }).toString();
        const match = output.match(/REG_SZ\s+(.+)/);
        if (match && match[1]) {
          const basePath = match[1].trim();
          const fullPath = path.join(basePath, appIdStr, check.emulator === 'goldberg' ? 'achievements.json' : 'achiev.json');
          if (fs.existsSync(fullPath)) {
            return { filePath: fullPath, format: check.emulator === 'goldberg' ? 'json' : 'json', emulator: check.emulator };
          }
        }
      } catch (err: any) {
        // Ignore errors if key not found
      }
    }
  }

  return null;
}

function extractSavePathFromIni(iniPath: string): string | null {
  try {
    const content = fs.readFileSync(iniPath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*(SavePath|achievements_save_path)\s*=\s*(.+)$/i);
      if (match && match[2]) {
        return match[2].trim();
      }
    }
  } catch (err: any) {
    log.warn(`[PathResolver] Failed to read INI ${iniPath}: ${err.message}`);
  }
  return null;
}

export function detectEmulatorFormat(filePath: string): 'json' | 'ini' | 'unknown' {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.json') return 'json';
  if (ext === '.ini') return 'ini';
  
  // Sniff first 2 bytes
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(2);
    fs.readSync(fd, buffer, 0, 2, 0);
    fs.closeSync(fd);
    
    const hex = buffer.toString('hex');
    if (hex === '7b0a' || hex === '7b22') return 'json'; // '{' followed by newline or '"'
    if (buffer[0] === 0x5B) return 'ini'; // '['
  } catch (err) {
    // Ignore read errors
  }
  
  return 'unknown';
}

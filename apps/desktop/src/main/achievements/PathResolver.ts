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

export async function resolveAllAchievementPaths(steamAppId: number | null, installDir: string): Promise<ResolvedPath[]> {
  const results: ResolvedPath[] = [];
  const seenPaths = new Set<string>();

  const addResult = (pathStr: string, format: 'json' | 'ini', emulator: string, fileMissing = false) => {
    const normalized = path.normalize(pathStr).toLowerCase();
    if (!seenPaths.has(normalized)) {
      seenPaths.add(normalized);
      results.push({ filePath: pathStr, format, emulator, fileMissing });
    }
  };

  let appIdStr = steamAppId ? String(steamAppId) : null;

  // Helper to check for steam_appid.txt in dir or parents
  if (!appIdStr) {
    appIdStr = findSteamAppIdInDir(installDir);
    if (appIdStr) {
      log.info(`[PathResolver] Found AppID from steam_appid.txt: ${appIdStr}`);
    }
  }

  // ── LAYER 1: Check Environment Variable Paths (Global Saves) ──────────────────────────────
  log.info(`[PathResolver] Layer 1: Checking standard environment paths`);
  
  const appdata = process.env.APPDATA || '';
  const localAppdata = process.env.LOCALAPPDATA || '';
  const programData = process.env.PROGRAMDATA || 'C:\\ProgramData';
  const publicDocs = path.join(process.env.PUBLIC || 'C:\\Users\\Public', 'Documents');

  if (appIdStr) {
    // 1. Static Paths
    const staticPaths = [
      { path: path.join(appdata, 'CreamAPI', appIdStr, 'achievements.json'), format: 'json', emulator: 'creamapi' },
      { path: path.join(localAppdata, 'EMPRESS', appIdStr, 'achievements.json'), format: 'json', emulator: 'empress' },
      // EMPRESS v2+ writes to achiev.json (shortened filename)
      { path: path.join(localAppdata, 'EMPRESS', appIdStr, 'achiev.json'), format: 'json', emulator: 'empress_v2' },
      { path: path.join(appdata, 'OnlineFix', appIdStr, 'achievements.json'), format: 'json', emulator: 'onlinefix' },
      { path: path.join(appdata, '3DM', appIdStr, 'achievements.json'), format: 'json', emulator: '3dm' },
      { path: path.join(publicDocs, 'Steam', 'TENOKE', appIdStr, 'achievements.ini'), format: 'ini', emulator: 'tenoke' },
      { path: path.join(publicDocs, 'Steam', 'CODEX', appIdStr, 'achievements.ini'), format: 'ini', emulator: 'codex' },
      { path: path.join(publicDocs, 'Steam', 'RUNE', appIdStr, 'achievements.ini'), format: 'ini', emulator: 'rune' },
      { path: path.join(publicDocs, 'Steam', 'SKIDROW', appIdStr, 'achievements.ini'), format: 'ini', emulator: 'skidrow' },
      { path: path.join(publicDocs, 'Steam', 'FLT', appIdStr, 'achievements.ini'), format: 'ini', emulator: 'flt' },
    ];

    for (const p of staticPaths) {
      if (fs.existsSync(p.path)) {
        log.info(`[PathResolver] Found global progress file: ${p.path}`);
        addResult(p.path, p.format as any, p.emulator);
      }
    }

    // 2. Wildcard paths for Goldberg GSE
    const gseBase = path.join(appdata, 'GSE Saves');
    if (fs.existsSync(gseBase)) {
      try {
        const dirs = fs.readdirSync(gseBase);
        for (const dir of dirs) {
          const achPath = path.join(gseBase, dir, appIdStr, 'achievements.json');
          if (fs.existsSync(achPath)) addResult(achPath, 'json', 'goldberg');
        }
        const directPath = path.join(gseBase, appIdStr, 'achievements.json');
        if (fs.existsSync(directPath)) addResult(directPath, 'json', 'goldberg');
      } catch (e) {}
    }

    // 3. Wildcard paths for Goldberg SteamEmu
    const gseEmuBase = path.join(appdata, 'Goldberg SteamEmu Saves');
    if (fs.existsSync(gseEmuBase)) {
      try {
        const dirs = fs.readdirSync(gseEmuBase);
        for (const dir of dirs) {
          const achPath = path.join(gseEmuBase, dir, appIdStr, 'achievements.json');
          if (fs.existsSync(achPath)) addResult(achPath, 'json', 'goldberg');
        }
        const directPath = path.join(gseEmuBase, appIdStr, 'achievements.json');
        if (fs.existsSync(directPath)) addResult(directPath, 'json', 'goldberg');
      } catch (e) {}
    }
  }

  // 4. Voices38 UE / Custom Variant — expanded for UE4 + UE5 + packaged builds
  const gameFolderName = path.basename(installDir);
  const voices38Paths = [
    // Original UE4 path
    path.join(localAppdata, gameFolderName, 'Saved', 'data.sav'),
    // UE5 variant: SaveGames subfolder
    path.join(localAppdata, gameFolderName, 'Saved', 'SaveGames', 'data.sav'),
    // UE5 packaged build: WindowsNoEditor subfolder
    path.join(localAppdata, gameFolderName, 'WindowsNoEditor', 'Saved', 'data.sav'),
    // In-tree Engine variant
    path.join(installDir, 'Engine', 'Saved', 'data.sav'),
    // Some VOICES38 cracks use achievements.json instead of data.sav
    path.join(localAppdata, gameFolderName, 'Saved', 'achievements.json'),
  ];
  for (const vp of voices38Paths) {
    if (fs.existsSync(vp)) {
      const fmt = vp.endsWith('.json') ? 'json' : 'json'; // data.sav is JSON internally
      addResult(vp, fmt, 'voices38_ue');
    }
  }

  // ── LAYER 2: Scan Install Directory and Parents ────────────────────────────
  log.info(`[PathResolver] Layer 2: Scanning install dir and parents: ${installDir}`);
  
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
  for (let i = 0; i < 8; i++) {
    if (currentDir.endsWith(':\\') || currentDir.endsWith(':/')) break;
    
    const specificPath = path.join(currentDir, 'Engine/Binaries/ThirdParty/Steamworks/Steamv151/Win64/steam_settings/achievements.json');
    if (fs.existsSync(specificPath)) {
      addResult(specificPath, 'json', 'goldberg');
    }

    try {
      const files = await fg(patterns, { cwd: currentDir, absolute: true, caseSensitiveMatch: false });
      
      for (const file of files) {
        const filename = path.basename(file).toLowerCase();
        
        if (filename === 'achievements.json') {
          addResult(file, 'json', 'goldberg_or_creamapi');
        } else if (filename.endsWith('.ini')) {
          const savePath = extractSavePathFromIni(file);
          if (savePath && fs.existsSync(savePath)) {
            const format = detectEmulatorFormat(savePath);
            addResult(savePath, format !== 'unknown' ? format : 'ini', 'custom_via_ini');
          }
          addResult(file, 'ini', 'generic_ini');
        } else if (filename.endsWith('.bin')) {
          addResult(file, 'ini', 'smartsteam');
        }
      }

      const steamSettingsDir = path.join(currentDir, 'steam_settings');
      if (fs.existsSync(steamSettingsDir) && !fs.existsSync(path.join(steamSettingsDir, 'achievements.json'))) {
        addResult(path.join(steamSettingsDir, 'achievements.json'), 'json', 'goldberg', true);
      }

      const ueDirs = await fg('Engine/Binaries/ThirdParty/Steamworks/Steamv*/Win64/steam_settings', { cwd: currentDir, absolute: true, onlyDirectories: true });
      if (ueDirs.length > 0) {
        const ueDir = ueDirs[0];
        if (!fs.existsSync(path.join(ueDir, 'achievements.json'))) {
          addResult(path.join(ueDir, 'achievements.json'), 'json', 'goldberg', true);
        }
      }

    } catch (err: any) {
      log.warn(`[PathResolver] Layer 2 scan failed at ${currentDir}: ${err.message}`);
    }
    
    const parent = path.dirname(currentDir);
    if (parent === currentDir || currentDir.endsWith(':\\') || currentDir.endsWith(':/')) break;
    currentDir = parent;
  }

  // ── LAYER 3: Registry Scan (Windows Only) ──────────────────────────────────
  if (process.platform === 'win32' && appIdStr) {
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
            addResult(fullPath, 'json', check.emulator);
          }
        }
      } catch (err: any) {}
    }
  }

  // ── LAYER 4: Deep-Scan Fallback (Future-Proof) ─────────────────────────────
  // If Layers 1-3 found nothing, scan the install directory recursively for ANY
  // file named achievements.json, achievements.ini, achiev.json, or data.sav.
  // Depth-limited to 5 levels to avoid scanning entire drives.
  if (results.length === 0) {
    log.info(`[PathResolver] Layer 4: Deep-scan fallback in ${installDir}`);
    const deepPatterns = [
      '**/achievements.json',
      '**/achievements.ini',
      '**/achiev.json',
      '**/data.sav',
    ];
    try {
      const deepFiles = await fg(deepPatterns, {
        cwd: installDir,
        absolute: true,
        caseSensitiveMatch: false,
        deep: 5,
        suppressErrors: true,
        followSymbolicLinks: false,
      });
      for (const file of deepFiles) {
        const filename = path.basename(file).toLowerCase();
        const format = filename.endsWith('.json') || filename === 'data.sav' ? 'json' : 'ini';
        addResult(file, format, 'unknown_deep_scan');
      }
      if (deepFiles.length > 0) {
        log.info(`[PathResolver] Layer 4 found ${deepFiles.length} achievement files via deep scan`);
      }
    } catch (err: any) {
      log.warn(`[PathResolver] Layer 4 deep scan failed: ${err.message}`);
    }
  }

  return results;
}

export async function resolveAchievementPath(steamAppId: number | null, installDir: string): Promise<ResolvedPath | null> {
  const paths = await resolveAllAchievementPaths(steamAppId, installDir);
  return paths.length > 0 ? paths[0] : null;
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

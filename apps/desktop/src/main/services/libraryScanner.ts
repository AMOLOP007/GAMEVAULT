import { exec } from 'child_process';
import { inspectExecutable } from '../utils/peInspector.js';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import log from 'electron-log';
import vdf from 'vdf-parser';

const execAsync = promisify(exec);

export interface DiscoveredGame {
  name: string;
  exePath: string;
  source: 'steam' | 'epic' | 'gog' | 'registry' | 'folder_scan';
  launchUri?: string;       // steam://run/123 or com.epicgames.launcher://...
  steamAppId?: number;
  epicAppId?: string;
  gogAppId?: number;
  installPath: string;
  platform: string;
  playtime?: number;
}

// ── SOURCE 1: Steam Library via .vdf manifest files ──────────────────────────

export async function discoverSteamGames(): Promise<DiscoveredGame[]> {
  try {
    const regPath = await getRegistryValue(
      'HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam', 'InstallPath'
    ) ?? await getRegistryValue(
      'HKCU\\SOFTWARE\\Valve\\Steam', 'SteamPath'
    );

    const commonPaths = [
      regPath,
      'C:\\Program Files (x86)\\Steam',
      'C:\\Program Files\\Steam',
      'D:\\SteamLibrary',
      'E:\\SteamLibrary',
    ].filter(p => !!p);

    let steamPath = '';
    for (const p of commonPaths as string[]) {
      if (fs.existsSync(path.join(p, 'steamapps', 'libraryfolders.vdf'))) {
        steamPath = p;
        break;
      }
    }

    if (!steamPath) return [];
    log.info(`[LibraryScanner] Found Steam at: ${steamPath}`);

    const vdfPath = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');
    const parsed: any = vdf.parse(fs.readFileSync(vdfPath, 'utf8'));
    const libraryPaths: string[] = [];

    const folders = parsed?.libraryfolders ?? {};
    for (const key of Object.keys(folders)) {
      if (folders[key]?.path) libraryPaths.push(folders[key].path);
    }
    // Always include default steam path
    libraryPaths.push(steamPath);

    // 3. Get Playtime from localconfig.vdf
    const steamUserPlaytime: Record<number, number> = {};
    try {
      const userdataPath = path.join(steamPath, 'userdata');
      if (fs.existsSync(userdataPath)) {
        const users = fs.readdirSync(userdataPath);
        log.info(`[LibraryScanner] Found ${users.length} Steam users in userdata`);
        for (const user of users) {
          const localConfigPath = path.join(userdataPath, user, 'config', 'localconfig.vdf');
          if (fs.existsSync(localConfigPath)) {
            const content = fs.readFileSync(localConfigPath, 'utf8');
            const config: any = vdf.parse(content);
            // Steam VDF can be tricky with case sensitivity
            const store = config?.UserLocalConfigStore || config?.userlocalconfigstore;
            const apps = store?.Software?.Valve?.Steam?.Apps || store?.software?.valve?.steam?.apps || store?.Software?.Valve?.Steam?.apps;
            
            if (apps) {
              const appIds = Object.keys(apps);
              log.info(`[LibraryScanner] Found ${appIds.length} apps in localconfig for user ${user}`);
              for (const appId of appIds) {
                const appData = apps[appId];
                const playtime = appData?.Playtime || appData?.playtime || appData?.TotalPlaytime || appData?.totalplaytime;
                if (playtime) {
                  steamUserPlaytime[parseInt(appId)] = parseInt(playtime) * 60; // Minutes to seconds
                }
              }
            }
          }
        }
      }
    } catch (e: any) {
      log.warn('[LibraryScanner] Could not read Steam playtime:', e.message);
    }

    // 4. For each library path, find all appmanifest_*.acf files
    const discovered: DiscoveredGame[] = [];
    for (const libPath of libraryPaths) {
      const steamAppsPath = path.join(libPath, 'steamapps');
      if (!fs.existsSync(steamAppsPath)) continue;

      const manifests = await fg('appmanifest_*.acf', { cwd: steamAppsPath, absolute: true }).catch(() => []);
      for (const manifestPath of manifests) {
        try {
          const content = fs.readFileSync(manifestPath, 'utf8');
          const manifest: any = (vdf.parse(content) as any)?.AppState;
          if (!manifest) continue;
          const appId = parseInt(manifest.appid);
          const name = manifest.name;
          const installDir = manifest.installdir;
          const fullInstallPath = path.join(steamAppsPath, 'common', installDir);

          if (!name || !appId) continue;

          // Find the main .exe
          const exePath = await findMainExe(fullInstallPath);

          discovered.push({
            name,
            exePath: exePath ?? fullInstallPath,
            source: 'steam',
            launchUri: `steam://rungameid/${appId}`,
            steamAppId: appId,
            installPath: fullInstallPath,
            platform: 'Steam',
            playtime: steamUserPlaytime[appId] || 0, // Add recovered playtime
          });
        } catch { continue; }
      }
    }
    return discovered;
  } catch (err) {
    log.error('[LibraryScanner] Steam discovery failed:', err);
    return [];
  }
}

// ── SOURCE 2: Epic Games Store via .item manifest files ──────────────────────

export async function discoverEpicGames(): Promise<DiscoveredGame[]> {
  const manifestDirs = [
    path.join(process.env.PROGRAMDATA ?? 'C:\\ProgramData', 'Epic\\EpicGamesLauncher\\Data\\Manifests'),
    path.join(process.env.LOCALAPPDATA ?? '', 'EpicGamesLauncher\\Saved\\Config'),
  ];

  const discovered: DiscoveredGame[] = [];
  for (const dir of manifestDirs) {
    if (!fs.existsSync(dir)) continue;
    const itemFiles = await fg('*.item', { cwd: dir, absolute: true }).catch(() => []);
    for (const itemPath of itemFiles) {
      try {
        const manifest = JSON.parse(fs.readFileSync(itemPath, 'utf8'));
        if (!manifest.bIsApplication) continue; // skip DLC
        const name = manifest.DisplayName;
        const installPath = manifest.InstallLocation;
        const epicId = manifest.CatalogItemId;
        const launchExe = manifest.LaunchExecutable;

        discovered.push({
          name,
          exePath: path.join(installPath, launchExe),
          source: 'epic',
          launchUri: `com.epicgames.launcher://apps/${epicId}?action=launch&silent=true`,
          epicAppId: epicId,
          installPath,
          platform: 'Epic',
        });
      } catch { continue; }
    }
  }
  return discovered;
}

// ── SOURCE 3: GOG Galaxy via registry ────────────────────────────────────────

export async function discoverGogGames(): Promise<DiscoveredGame[]> {
  try {
    const { stdout } = await execAsync(
      'reg query "HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games" /s /v GAMENAME',
      { timeout: 10000 }
    );
    return parseGogRegistry(stdout);
  } catch { return []; }
}

function parseGogRegistry(regOutput: string): DiscoveredGame[] {
  const discovered: DiscoveredGame[] = [];
  const sections = regOutput.split(/\r?\nHKEY/);
  for (const section of sections) {
    const nameMatch = section.match(/GAMENAME\s+REG_SZ\s+(.+)/);
    const pathMatch = section.match(/PATH\s+REG_SZ\s+(.+)/);
    const launchMatch = section.match(/LAUNCHCOMMAND\s+REG_SZ\s+(.+)/);
    if (nameMatch && pathMatch) {
      const installPath = pathMatch[1].trim();
      const launchCommand = launchMatch?.[1].trim() ?? '';
      discovered.push({
        name: nameMatch[1].trim(),
        exePath: launchCommand || installPath,
        source: 'gog',
        installPath,
        platform: 'GOG',
      });
    }
  }
  return discovered;
}

// ── SOURCE 4: Windows Registry Uninstall Entries (Expanded) ──────────────────

export async function discoverRegistryGames(): Promise<DiscoveredGame[]> {
  const registryPaths = [
    'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    // Also check specific game related keys
    'HKCU\\Software\\Valve\\Steam\\Apps',
    'HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games',
  ];

  const discovered: DiscoveredGame[] = [];
  const skipKeywords = /driver|runtime|sdk|redist|framework|visual c|directx|nvidia|amd|intel|microsoft|adobe|chrome|firefox|update|patch|service pack|security update|vscode|visual studio|discord|slack|zoom|spotify|node.exe|electron.exe/i;

  for (const regPath of registryPaths) {
    try {
      const { stdout } = await execAsync(`reg query "${regPath}" /s /v DisplayName`, { timeout: 15000 }).catch(() => ({ stdout: '' }));
      const entries = parseUninstallRegistry(stdout);
      for (const entry of entries) {
        if (skipKeywords.test(entry.name)) continue;
        if (!entry.installPath || !fs.existsSync(entry.installPath)) continue;
        
        const mainExe = await findMainExe(entry.installPath);
        if (!mainExe) continue;

        // Perform "State-of-the-Art" Binary Inspection
        const inspection = await inspectExecutable(mainExe);
        log.info(`[LibraryScanner] Inspected ${entry.name}: Confidence ${inspection.confidence}% (${inspection.indicators.join(', ')})`);

        if (inspection.confidence < 50) {
          // If it's a known launcher folder, we still want it even if score is lower
          if (!/steam|epic|gog|rockstar|ubisoft|ea desktop/i.test(entry.installPath)) {
            continue;
          }
        }

        discovered.push({
          name: entry.name,
          exePath: mainExe,
          source: 'registry',
          installPath: entry.installPath,
          platform: 'PC',
        });
      }
    } catch { continue; }
  }
  return discovered;
}

function parseUninstallRegistry(stdout: string) {
  const entries: { name: string; installPath: string }[] = [];
  const sections = stdout.split(/\r?\nHKEY/);
  for (const section of sections) {
    const nameMatch = section.match(/DisplayName\s+REG_SZ\s+(.+)/);
    const pathMatch = section.match(/InstallLocation\s+REG_SZ\s+(.+)/) || section.match(/Path\s+REG_SZ\s+(.+)/);
    if (nameMatch && pathMatch) {
      entries.push({
        name: nameMatch[1].trim(),
        installPath: pathMatch[1].trim()
      });
    }
  }
  return entries;
}

// ── SOURCE 6: Start Menu Shortcuts ──────────────────────────────────────────

export async function discoverFromStartMenu(): Promise<DiscoveredGame[]> {
  const startMenuPaths = [
    path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'Microsoft\\Windows\\Start Menu\\Programs'),
    path.join(process.env.APPDATA || '', 'Microsoft\\Windows\\Start Menu\\Programs'),
  ];

  const results: DiscoveredGame[] = [];
  for (const menuPath of startMenuPaths) {
    if (!fs.existsSync(menuPath)) continue;
    try {
      // Find .lnk files in common game subfolders or top level
      const shortcuts = await fg('**/*.lnk', { cwd: menuPath, absolute: true, deep: 3 });
      // We'd need a shortcut parser here, but for now we'll skip or just use the name
      // and try to find the folder from the shortcut path.
    } catch { continue; }
  }
  return results;
}

// ── SOURCE 5: Common Game Folder Scan ─────────────────────────────────────────

export async function discoverFromCommonFolders(): Promise<DiscoveredGame[]> {
  const commonFolders = [
    'C:\\Games',
    'C:\\Program Files\\Games',
    'C:\\Program Files (x86)\\Games',
    'D:\\Games',
    'D:\\',
    'E:\\Games',
    'E:\\',
  ].filter(f => {
    try { fs.accessSync(f); return true; } catch { return false; }
  });

  const results: DiscoveredGame[] = [];
  for (const folder of commonFolders) {
    // Assuming folderScanner.ts exists in ../
    try {
      const { scanFolder } = await import('../folderScanner.js');
      const found = await scanFolder(folder);
      results.push(...found.map((g: any) => ({
        name: g.name,
        exePath: g.exePath,
        source: 'folder_scan' as const,
        installPath: path.dirname(g.exePath),
        platform: 'PC',
      })));
    } catch (err) {
      log.error(`[LibraryScanner] Folder scan failed for ${folder}:`, err);
    }
  }
  return results;
}

// ── MAIN DISCOVERY FUNCTION ───────────────────────────────────────────────────

export async function runFullLibraryDiscovery(): Promise<DiscoveredGame[]> {
  log.info('[LibraryScanner] Starting full discovery...');

  const [steam, epic, gog, registry, folders] = await Promise.allSettled([
    discoverSteamGames(),
    discoverEpicGames(),
    discoverGogGames(),
    discoverRegistryGames(),
    discoverFromCommonFolders(),
  ]);

  const all: DiscoveredGame[] = [
    ...(steam.status === 'fulfilled' ? steam.value : []),
    ...(epic.status === 'fulfilled' ? epic.value : []),
    ...(gog.status === 'fulfilled' ? gog.value : []),
    ...(registry.status === 'fulfilled' ? registry.value : []),
    ...(folders.status === 'fulfilled' ? folders.value : []),
  ];

  // Deduplicate by install path
  const seen = new Map<string, DiscoveredGame>();
  for (const game of all) {
    if (!game.installPath) continue;
    const key = game.installPath.toLowerCase().replace(/\\/g, '/');
    if (!seen.has(key)) {
      seen.set(key, game);
    } else {
      const existing = seen.get(key)!;
      if (game.launchUri && !existing.launchUri) seen.set(key, game);
    }
  }

  const result = Array.from(seen.values());
  log.info(`[LibraryScanner] Discovered ${result.length} games`);
  return result;
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

async function findMainExe(folderPath: string): Promise<string | null> {
  if (!fs.existsSync(folderPath)) return null;
  
  // 1. Look for exes that match the folder name (common for games)
  const folderName = path.basename(folderPath).toLowerCase();
  const directExes = await fg('*.exe', { cwd: folderPath, absolute: true, suppressErrors: true });
  const exactMatch = directExes.find(e => path.basename(e, '.exe').toLowerCase() === folderName);
  if (exactMatch) return exactMatch;

  // 2. Look for common launcher/game names
  const commonNames = ['play.exe', 'game.exe', 'launch.exe', 'start.exe'];
  const commonMatch = directExes.find(e => commonNames.includes(path.basename(e).toLowerCase()));
  if (commonMatch) return commonMatch;

  // 3. Fallback to largest exe > 1MB in the whole tree (limited depth)
  const allExes = await fg('**/*.exe', {
    cwd: folderPath,
    absolute: true,
    deep: 3,
    suppressErrors: true,
  });

  if (allExes.length === 0) return null;
  
  const exeStats = allExes.map(p => {
    try { return { p, size: fs.statSync(p).size }; }
    catch { return { p, size: 0 }; }
  }).filter(x => x.size > 1024 * 1024); // > 1MB

  // Filter out uninstallers and helper tools
  const filtered = exeStats.filter(x => !/unins|setup|helper|crash|report|vcredist|dxwebsetup|unity|epic|steam/i.test(x.p));

  return filtered.sort((a, b) => b.size - a.size)[0]?.p ?? exeStats.sort((a, b) => b.size - a.size)[0]?.p ?? null;
}

async function isGameFolder(folderPath: string): Promise<boolean> {
  const indicators = [
    'steam_api.dll', 'steam_api64.dll', 'UnityPlayer.dll', 
    'Galaxy.dll', 'EOSSDK-Win64-Shipping.dll', 'Engine/Binaries/Win64',
    'GameData', 'common/steamapps'
  ];
  
  for (const ind of indicators) {
    if (fs.existsSync(path.join(folderPath, ind))) return true;
  }
  return false;
}

async function getRegistryValue(keyPath: string, valueName: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`reg query "${keyPath}" /v "${valueName}"`, { timeout: 5000 });
    const match = stdout.match(new RegExp(`${valueName}\\s+REG_SZ\\s+(.+)`));
    return match?.[1].trim() ?? null;
  } catch { return null; }
}

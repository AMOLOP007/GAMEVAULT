import fs from 'fs';
import path from 'path';
import { inspectExecutable } from './utils/peInspector.js';

export interface ScannedGame {
  name: string;
  exePath: string;
  lastModified: Date;
}

// Known crack/emulator signature files — presence of any of these in a folder
// is treated as irrefutable proof that the folder is a cracked game.
const CRACK_SIGNATURES = [
  'steam_api.dll', 'steam_api64.dll', 'steam_emu.ini', 'steam_interfaces.txt',
  'voices38.dll', 'emp.dll', 'smartsteamemu.ini', 'smartsteamemu.exe',
  'goldberg_steam_emu.ini', 'ali213.ini', 'codex.ini', 'skidrow.ini',
  'tenoke.ini', 'rune.ini', 'flt.ini', 'razor1911.ini', '3dmgame.ini',
  'lumaemu.ini', 'cream_api.ini', 'cream_api.dll', 'galaxy64.dll',
];

// Known engine DLLs that definitively identify a game folder
const ENGINE_SIGNATURES = [
  'unityplayer.dll', 'unrealcefsubprocess.exe', 'eossdk-win64-shipping.dll',
  'bink2w64.dll', 'bink2w32.dll', 'physx3_x64.dll', 'nvtt_x64.dll',
];

const SKIP_LIST = [
  'unins', 'setup', 'redist', 'vcredist', 'update', 'unitycrashhandler',
  'crashpad', 'dxwebsetup', 'vulkan', 'physx', 'launcher', 'socialclub',
  'epicgames', 'battlenet', 'origin', 'ubisoft', 'rockstar',
  'goggalaxy', 'overlay', 'bootstrap', 'helper', 'installer', 'beservice', 'easyanticheat',
  'healthcheck', 'afterburner', 'rtss', 'nvidia', 'amd', 'intel', 'microsoft',
  'directx', 'openal', 'dotnet', 'windowsdesktop', 'netruntime',
];

/**
 * Check if a directory contains crack or engine signature files.
 * Returns the type of match found.
 */
function checkDirForSignatures(dir: string): 'crack' | 'engine' | 'none' {
  if (!fs.existsSync(dir)) return 'none';
  let files: string[];
  try {
    files = fs.readdirSync(dir).map(f => f.toLowerCase());
  } catch {
    return 'none';
  }
  if (CRACK_SIGNATURES.some(sig => files.includes(sig))) return 'crack';
  if (ENGINE_SIGNATURES.some(sig => files.includes(sig))) return 'engine';
  return 'none';
}

/**
 * Find the best EXE candidate in a folder, preferring the root-level
 * largest EXE that is not in the skip list.
 */
function findBestExe(gameFolder: string): { exePath: string; name: string } | null {
  // Walk only 1 level deep for direct EXEs first, then go deeper
  const candidates: { exePath: string; size: number; depth: number }[] = [];
  
  function collect(dir: string, depth: number) {
    if (depth > 5) return;
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }

    for (const e of entries) {
      if (e.isDirectory()) {
        // Don't recurse into clearly non-game folders
        const lower = e.name.toLowerCase();
        if (['_redist', 'redistributables', 'vcredist', 'directx', 'dotnet', 'support', 'plugins', '$recycle.bin'].includes(lower)) continue;
        collect(path.join(dir, e.name), depth + 1);
      } else if (e.name.toLowerCase().endsWith('.exe')) {
        const lower = e.name.toLowerCase();
        if (SKIP_LIST.some(s => lower.includes(s))) continue;
        const full = path.join(dir, e.name);
        try {
          const size = fs.statSync(full).size;
          // Must be at least 200KB to be meaningful
          if (size > 200 * 1024) candidates.push({ exePath: full, size, depth });
        } catch {}
      }
    }
  }

  collect(gameFolder, 0);
  if (candidates.length === 0) return null;

  // Prefer root-level largest EXE; if none at root, pick deepest largest
  const rootLevel = candidates.filter(c => c.depth === 0);
  const sorted = (rootLevel.length > 0 ? rootLevel : candidates)
    .sort((a, b) => b.size - a.size);

  const best = sorted[0];

  // Determine game name from folder hierarchy
  let name = '';
  const parts = gameFolder.replace(/\\/g, '/').split('/');
  // Walk from deepest folder upward, skipping engine/bin folders
  const skipFolders = ['binaries', 'win64', 'win32', 'x64', 'x86', 'shipping', 'bin', 'engine', 'content'];
  for (let i = parts.length - 1; i >= 0; i--) {
    if (!skipFolders.includes(parts[i].toLowerCase()) && parts[i].length > 0) {
      name = parts[i];
      break;
    }
  }
  if (!name) name = path.basename(best.exePath, '.exe');

  // Clean up name
  name = name
    .replace(/v\d+(\.\d+)*/gi, '')
    .replace(/\d+\.\d+(\.\d+)*/g, '')
    .replace(/repack|dodi|fitgirl|crack|multi\d+|incldlc/gi, '')
    .replace(/[-_.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { exePath: best.exePath, name };
}

/**
 * Scan a folder that was found to contain a game signature.
 * Since signatures were already validated by the caller (via fast-glob),
 * we trust the folder and just find the best EXE.
 * 
 * NOTE: This is the "trusted path" — called when fast-glob found a 
 * crack/engine signature in the folder. We skip PE inspection for the 
 * main EXE since the signature file IS the proof.
 */
export async function scanFolder(dirPath: string): Promise<ScannedGame[]> {
  const results: ScannedGame[] = [];

  // Check if this folder (or any parent up to 2 levels) has a crack/engine signature
  const sigCheck = checkDirForSignatures(dirPath)
    || checkDirForSignatures(path.dirname(dirPath))
    || checkDirForSignatures(path.dirname(path.dirname(dirPath)));

  if (sigCheck !== 'none') {
    // Trusted path: signature found — just find the best EXE
    const best = findBestExe(dirPath);
    if (best) {
      results.push({
        name: best.name,
        exePath: best.exePath,
        lastModified: (() => { try { return fs.statSync(best.exePath).mtime; } catch { return new Date(); } })()
      });
    }
    return results;
  }

  // Fallback: no signature found — use PE inspection heuristically
  await recursiveScan(dirPath, 0, results);
  return results;
}

async function recursiveScan(dir: string, depth: number, results: ScannedGame[]) {
  if (depth > 6) return;

  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });

    const dirFiles = files.map(f => f.name.toLowerCase());
    const hasCrackSig = CRACK_SIGNATURES.some(sig => dirFiles.includes(sig));
    const hasEngineSig = ENGINE_SIGNATURES.some(sig => dirFiles.includes(sig));
    const isTrustedFolder = hasCrackSig || hasEngineSig;

    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        await recursiveScan(fullPath, depth + 1, results);
      } else if (file.name.toLowerCase().endsWith('.exe')) {
        const stats = fs.statSync(fullPath);
        const name = file.name.toLowerCase();

        if (SKIP_LIST.some(s => name.includes(s))) continue;

        // If this is a trusted folder (has crack/engine files), accept any EXE > 200KB
        // Otherwise, require PE inspection to pass
        if (isTrustedFolder) {
          if (stats.size < 200 * 1024) continue;
        } else {
          if (stats.size < 5 * 1024 * 1024) continue;
          const inspection = await inspectExecutable(fullPath);
          if (inspection.confidence < 40) continue;
        }

        // Determine game name
        let gameName = path.basename(file.name, '.exe');
        let currentDir = dir;
        const skipFolders = ['binaries', 'win64', 'win32', 'shipping', 'bin', 'x64', 'x86', 'engine'];
        if (skipFolders.some(s => currentDir.toLowerCase().includes(`\\${s}\\`) || currentDir.toLowerCase().endsWith(`\\${s}`))) {
          while (
            currentDir.length > 3 &&
            skipFolders.some(s => path.basename(currentDir).toLowerCase() === s)
          ) {
            currentDir = path.dirname(currentDir);
          }
          gameName = path.basename(currentDir);
        } else if (depth === 0) {
          gameName = path.basename(dir);
        }

        gameName = gameName
          .replace(/v\d+(\.\d+)*/gi, '')
          .replace(/\d+\.\d+(\.\d+)*/g, '')
          .replace(/repack|dodi|fitgirl|crack|multi\d+|incldlc/gi, '')
          .replace(/[-_.]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const existing = results.find(r => r.name.toLowerCase() === gameName.toLowerCase());
        if (existing) {
          // Prefer shorter path (closer to root)
          if (fullPath.split(path.sep).length < existing.exePath.split(path.sep).length) {
            existing.exePath = fullPath;
          }
        } else {
          results.push({ name: gameName, exePath: fullPath, lastModified: stats.mtime });
        }
      }
    }
  } catch {
    // Skip unreadable folders
  }
}

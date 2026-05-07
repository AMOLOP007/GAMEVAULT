import fs from 'fs';
import path from 'path';
import { inspectExecutable } from './utils/peInspector.js';

export interface ScannedGame {
  name: string;
  exePath: string;
  lastModified: Date;
}

export async function scanFolder(dirPath: string): Promise<ScannedGame[]> {
  const results: ScannedGame[] = [];
  await recursiveScan(dirPath, 0, results);
  return results;
}

async function recursiveScan(dir: string, depth: number, results: ScannedGame[]) {
  if (depth > 6) return; // Allow deeper scans for repacks

  try {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    // Check if this folder looks like a game folder (contains crack files or game engines)
    const indicators = ['steam_api.dll', 'steam_api64.dll', 'steam_emu.ini', 'SmartSteamEmu', 'Goldberg', 'ALI213', 'UnityPlayer.dll', 'Engine/Binaries', 'voices38', 'emp.dll', 'oo2core'];
    const hasIndicator = files.some(f => indicators.some(ind => f.name.toLowerCase().includes(ind.toLowerCase())));

    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        await recursiveScan(fullPath, depth + 1, results);
      } else if (file.name.endsWith('.exe')) {
        const stats = fs.statSync(fullPath);
        
        // Lower size threshold if we found game indicators in the folder
        const minSize = hasIndicator ? 1 * 1024 * 1024 : 10 * 1024 * 1024;
        
        if (stats.size > minSize) {
          const name = file.name.toLowerCase();
          const skipList = [
            'unins', 'setup', 'redist', 'vcredist', 'update', 'unitycrashhandler', 
            'crashpad', 'dxwebsetup', 'vulkan', 'physx', 'launcher', 'socialclub',
            'epicgames', 'steam', 'battlenet', 'origin', 'ubisoft', 'rockstar', 
            'goggalaxy', 'overlay', 'bootstrap', 'helper', 'installer', 'beservice', 'easyanticheat'
          ];
          if (skipList.some(s => name.includes(s))) continue;

          // Perform "State-of-the-Art" Binary Inspection
          const inspection = await inspectExecutable(fullPath);
          
          // Special case: Small launchers in root (e.g. b1.exe for Black Myth Wukong)
          const isRootLauncher = depth === 0 && stats.size > 100 * 1024 && stats.size < 5 * 1024 * 1024;
          
          if (inspection.confidence < 40 && !isRootLauncher) continue;

          // Robust Naming: If we are in a subfolder like /Binaries/Win64, climb up until we find the actual game folder name
          let gameName = path.basename(file.name, '.exe');
          let currentDir = dir;
          
          if (dir.toLowerCase().includes('binaries') || dir.toLowerCase().includes('win64') || dir.toLowerCase().includes('shipping') || dir.toLowerCase().includes('bin')) {
            while (
              currentDir.length > 3 && 
              (['binaries', 'win64', 'win32', 'shipping', 'bin', 'x64', 'x86', 'engine'].some(s => path.basename(currentDir).toLowerCase().includes(s)))
            ) {
              currentDir = path.dirname(currentDir);
            }
            gameName = path.basename(currentDir);
          } else if (depth === 0) {
            gameName = path.basename(dir);
          }

          // Clean up name (remove version numbers, repacker names, etc.)
          gameName = gameName.replace(/v?\d+(\.\d+)*/g, '').replace(/repack|dodi|fitgirl|crack|multi\d+|incldlc/gi, '').trim();
          gameName = gameName.replace(/[\-_.]/g, ' ').replace(/\s+/g, ' ').trim();

          // Deduplication: If we already found a better candidate for this folder, or if this is a better candidate
          const existing = results.find(r => r.name.toLowerCase() === gameName.toLowerCase());
          if (existing) {
            const existingStats = fs.statSync(existing.exePath);
            // If existing is small (launcher) and current is big, or vice-versa
            // We generally prefer the root launcher (small) or the one with shorter path
            if (fullPath.split(path.sep).length < existing.exePath.split(path.sep).length) {
              existing.exePath = fullPath;
            }
          } else {
            results.push({
              name: gameName,
              exePath: fullPath,
              lastModified: stats.mtime,
            });
          }
        }
      }
    }
  } catch (err) {
    // Skip folders we can't read
  }
}

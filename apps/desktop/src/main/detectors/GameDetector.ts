import { dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import log from 'electron-log';
import psList from 'ps-list';

export interface DetectedGame {
  title: string;
  exePath: string;
  processName: string;
  coverUrl?: string;
  score?: number;
}

export class GameDetector {
  private rawgKey: string;

  constructor(rawgKey: string) {
    this.rawgKey = rawgKey;
  }

  async openFolderDialog(): Promise<string | null> {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    });
    return canceled ? null : filePaths[0];
  }

  async scanFolder(dirPath: string): Promise<DetectedGame[]> {
    const results: DetectedGame[] = [];
    await this.recursiveScan(dirPath, 0, results);
    return results;
  }

  private async recursiveScan(dir: string, depth: number, results: DetectedGame[]) {
    if (depth > 3) return;

    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        await this.recursiveScan(fullPath, depth + 1, results);
      } else if (file.name.endsWith('.exe')) {
        const stats = fs.statSync(fullPath);
        if (stats.size > 5 * 1024 * 1024) { // > 5MB
          const name = file.name.toLowerCase();
          const skipList = ['unins', 'setup', 'redist', 'vcredist', 'update', 'unitycrashhandler', 'crashpad'];
          if (skipList.some(s => name.includes(s))) continue;

          const gameInfo = await this.resolveGameName(path.basename(file.name, '.exe'));
          if (gameInfo) {
            results.push({
              title: gameInfo.name,
              exePath: fullPath,
              processName: file.name,
              coverUrl: gameInfo.background_image
            });
          }
        }
      }
    }
  }

  async resolveGameName(exeName: string): Promise<any> {
    try {
      const query = exeName.replace(/([A-Z])/g, ' $1').trim();
      const response = await axios.get(`https://api.rawg.io/api/games?search=${encodeURIComponent(query)}&key=${this.rawgKey}`);
      const game = response.data.results[0];
      if (game && game.score > 0.7) {
        return game;
      }
    } catch (error) {
      log.error('RAWG Resolution error:', error);
    }
    return null;
  }

  async getBackgroundProcesses(): Promise<DetectedGame[]> {
    const processes = await psList();
    const scored: DetectedGame[] = [];

    for (const proc of processes as any[]) {
      const score = this.scoreProcess(proc);
      if (score.score >= 60) {
        scored.push({
          title: proc.name,
          exePath: proc.bin || '',
          processName: proc.name,
          score: score.score
        });
      }
    }
    return scored;
  }

  private scoreProcess(proc: any): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // Memory usage > 500MB
    if (proc.memory > 500 * 1024 * 1024) {
      score += 30;
      reasons.push('High memory usage');
    }

    // CPU usage > 15%
    if (proc.cpu > 15) {
      score += 20;
      reasons.push('High CPU usage');
    }

    // Path heuristics
    const bin = (proc.bin || '').toLowerCase();
    const commonPaths = ['games', 'steam', 'gog', 'epic', 'ubisoft', 'ea games'];
    if (commonPaths.some(p => bin.includes(p))) {
      score += 15;
      reasons.push('Located in game directory');
    }

    // System process penalty
    const systemProcs = ['chrome.exe', 'explorer.exe', 'svchost.exe', 'msedge.exe', 'code.exe'];
    if (systemProcs.includes(proc.name.toLowerCase())) {
      score -= 50;
    }

    return { score, reasons };
  }
}

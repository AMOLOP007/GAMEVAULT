import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import log from 'electron-log';
import vdf from 'vdf-parser';
import { PrismaClient } from 'prisma-client-desktop/index.js';

const prisma = new PrismaClient();

export async function scanLocalAchievements(userId: string, gameId: string, exePath: string) {
  log.info(`[AchievementScanner] Scanning for ${gameId} at ${exePath}`);
  
  const SCAN_LOCATIONS = [
    // Steam
    path.join(process.env.APPDATA || '', '../Local/Steam/userdata/*/stats/achievements.bin'),
    
    // GOG Galaxy (will handle DB separately if possible)
    path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'GOG.com/Galaxy/Storage/*/Galaxy.db'),

    // Generic paths
    path.join(path.dirname(exePath), 'achievements.json'),
    path.join(path.dirname(exePath), 'achievements.dat'),
    path.join(process.env.APPDATA || '', '*/achievements.json'),
    path.join(process.env.LOCALAPPDATA || '', '*/achievements.json'),
    path.join(process.env.USERPROFILE || '', 'Documents/My Games/*/achievements.*'),
    path.join(process.env.USERPROFILE || '', 'Saved Games/*/achievements.*'),
  ];

  let found = 0;
  let imported = 0;

  for (const location of SCAN_LOCATIONS) {
    const files = await fg(location.replace(/\\/g, '/'), { absolute: true, suppressErrors: true });
    for (const file of files) {
      try {
        const results = await parseAchievementFile(file);
        for (const ach of results) {
          found++;
          await (prisma as any).gameAchievement.upsert({
            where: {
              userId_gameId_key: {
                userId,
                gameId,
                key: ach.key
              }
            },
            update: {
              isEarned: ach.earned,
              earnedAt: ach.earnedAt,
              name: ach.name || ach.key,
            },
            create: {
              userId,
              gameId,
              key: ach.key,
              name: ach.name || ach.key,
              isEarned: ach.earned,
              earnedAt: ach.earnedAt,
              source: 'local_scan'
            }
          });
          imported++;
        }
      } catch (err) {
        log.error(`[AchievementScanner] Error parsing ${file}:`, err);
      }
    }
  }

  return { found, imported };
}

async function parseAchievementFile(filePath: string): Promise<any[]> {
  const ext = path.extname(filePath).toLowerCase();
  const content = fs.readFileSync(filePath);

  if (ext === '.json') {
    try {
      const data = JSON.parse(content.toString());
      return extractFromJson(data);
    } catch { return []; }
  }

  if (ext === '.bin' && filePath.includes('achievements.bin')) {
    // Steam binary VDF
    try {
      const parsed: any = vdf.parse(content.toString());
      // Steam achievements.bin format varies, this is a heuristic
      const results: any[] = [];
      const data = parsed?.data || {};
      for (const key of Object.keys(data)) {
        if (data[key].achieved === 1 || data[key].unlocked === 1) {
          results.push({
            key,
            earned: true,
            earnedAt: data[key].CRCUnlockTime ? new Date(data[key].CRCUnlockTime * 1000) : null
          });
        }
      }
      return results;
    } catch { return []; }
  }

  return [];
}

function extractFromJson(data: any): any[] {
  const results: any[] = [];
  // Heuristic: look for arrays or objects containing "achieved" or "unlocked"
  const traverse = (obj: any) => {
    if (typeof obj !== 'object' || obj === null) return;
    
    if (obj.key || obj.id || obj.name) {
      if (obj.achieved === true || obj.achieved === 1 || obj.unlocked === true || obj.unlocked === 1) {
        results.push({
          key: obj.key || obj.id || obj.name,
          name: obj.name || obj.title,
          earned: true,
          earnedAt: obj.earnedAt || obj.unlockTime ? new Date(obj.earnedAt || obj.unlockTime) : null
        });
      }
    }

    for (const k of Object.keys(obj)) {
      traverse(obj[k]);
    }
  };

  traverse(data);
  return results;
}

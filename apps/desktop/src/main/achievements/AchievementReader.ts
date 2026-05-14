import fs from 'fs';
import log from 'electron-log';

export interface AchievementState {
  id: string;
  unlocked: boolean;
  unlockTime?: number;
}

export async function readAchievements(filePath: string, format: 'json' | 'ini'): Promise<AchievementState[]> {
  try {
    if (!fs.existsSync(filePath)) {
      log.warn(`[AchReader] File not found: ${filePath}`);
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf8');

    if (format === 'json') {
      return parseJsonAchievements(content);
    } else if (format === 'ini') {
      return parseIniAchievements(content);
    }
  } catch (err: any) {
    log.error(`[AchReader] Failed to read achievements from ${filePath}: ${err.message}`);
  }
  return [];
}

function parseJsonAchievements(content: string): AchievementState[] {
  const results: AchievementState[] = [];
  try {
    const data = JSON.parse(content);

    // Try Empress format first: { "achievements": [ { "name": "ACH_NAME", "achieved": 1, "unlocktime": 1234 } ] }
    if (data.achievements && Array.isArray(data.achievements)) {
      for (const a of data.achievements) {
        results.push({
          id: a.name || a.id || '',
          unlocked: a.achieved === 1 || a.achieved === true,
          unlockTime: a.unlocktime || a.UnlockTime
        });
      }
      return results;
    }

    // Fallback to Goldberg format: { "ACH_NAME": { "earned": true, "earned_time": 1234567890 } }
    for (const [key, val] of Object.entries(data)) {
      if (typeof val === 'object' && val !== null) {
        const v = val as any;
        results.push({
          id: key,
          unlocked: v.earned === true || v.achieved === 1 || v.unlocked === true,
          unlockTime: v.earned_time || v.unlocktime || v.UnlockTime
        });
      } else if (typeof val === 'boolean') {
        results.push({
          id: key,
          unlocked: val,
          unlockTime: undefined
        });
      }
    }
  } catch (err: any) {
    log.warn(`[AchReader] JSON parse failed: ${err.message}`);
  }
  return results;
}

function parseIniAchievements(content: string): AchievementState[] {
  const results: AchievementState[] = [];
  const lines = content.split(/\r?\n/);
  
  let currentSection = '';
  const sections: Record<string, Record<string, string>> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) continue;

    const sectionMatch = trimmed.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      sections[currentSection] = {};
      continue;
    }

    const kvMatch = trimmed.match(/^([^=]+)=(.*)$/);
    if (kvMatch && currentSection) {
      const key = kvMatch[1].trim();
      const value = kvMatch[2].trim();
      sections[currentSection][key] = value;
    }
  }

  for (const [sectionName, keys] of Object.entries(sections)) {
    // Some emulators use the achievement ID as the section name
    // e.g., [ACH_01]
    //       Achieved=1
    //       UnlockTime=1234
    
    const achievedVal = keys['Achieved'] || keys['achieved'] || keys['unlocked'];
    const unlockTimeVal = keys['UnlockTime'] || keys['unlocktime'];

    if (achievedVal !== undefined) {
      results.push({
        id: sectionName,
        unlocked: achievedVal === '1' || achievedVal.toLowerCase() === 'true',
        unlockTime: unlockTimeVal ? parseInt(unlockTimeVal, 10) : undefined
      });
    }
  }

  return results;
}

export function diffAchievements(prev: AchievementState[], next: AchievementState[]): AchievementState[] {
  const prevMap = new Map(prev.map(a => [a.id, a.unlocked]));
  const newlyUnlocked: AchievementState[] = [];

  for (const n of next) {
    const wasUnlocked = prevMap.get(n.id) || false;
    if (n.unlocked && !wasUnlocked) {
      newlyUnlocked.push(n);
    }
  }

  return newlyUnlocked;
}

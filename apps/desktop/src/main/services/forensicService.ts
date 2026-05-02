import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export interface ForensicEvidence {
  appId: string;
  lastPlayed: number; // Unix timestamp
  totalPlaytimeMinutes: number;
  powerEvents: { time: string; id: number }[];
  steamLogs?: { startTime: string; endTime: string }[];
}

export class ForensicService {
  /**
   * Scans the local Windows machine for hard evidence of gaming activity.
   */
  static async gatherEvidence(appId: string): Promise<ForensicEvidence | null> {
    try {
      // 1. Read Steam Registry for exact total playtime and last played timestamp
      const registryData = await this.readSteamRegistry(appId);
      
      // 2. Get Windows Power Events (Sleep/Wake) to eliminate impossible windows
      const powerEvents = await this.getPowerEvents(14);

      // 3. Optional: Try to parse Steam appinfo.log if it exists
      const steamLogs = await this.parseSteamLogs(appId);

      return {
        appId,
        lastPlayed: registryData.lastPlayed,
        totalPlaytimeMinutes: registryData.playtimeMinutes,
        powerEvents,
        steamLogs
      };
    } catch (err) {
      console.error('[ForensicService] Failed to gather evidence:', err);
      return null;
    }
  }

  private static async readSteamRegistry(appId: string) {
    const command = `powershell -Command "Get-ItemProperty -Path 'HKCU:\\Software\\Valve\\Steam\\Apps\\${appId}' | Select-Object LastPlayed, Playtime | ConvertTo-Json"`;
    const { stdout } = await execAsync(command);
    const data = JSON.parse(stdout);
    return {
      lastPlayed: data.LastPlayed || 0,
      playtimeMinutes: data.Playtime || 0
    };
  }

  private static async getPowerEvents(daysBack: number) {
    // 1=Kernel boot, 42=Sleep, 107=Wake, 12=Startup, 13=Shutdown
    const command = `powershell -Command "Get-WinEvent -FilterHashtable @{LogName='System'; Id=1,12,13,42,107; StartTime=(Get-Date).AddDays(-${daysBack})} -ErrorAction SilentlyContinue | Select-Object TimeCreated, Id | ConvertTo-Json"`;
    try {
      const { stdout } = await execAsync(command);
      if (!stdout || stdout.trim() === '') return [];
      const data = JSON.parse(stdout);
      return Array.isArray(data) ? data.map((e: any) => ({
        time: e.TimeCreated,
        id: e.Id
      })) : [{ time: data.TimeCreated, id: data.Id }];
    } catch {
      return [];
    }
  }

  private static async parseSteamLogs(appId: string) {
    // Attempt to find Steam path
    const steamPathCommand = `powershell -Command "Get-ItemProperty -Path 'HKCU:\\Software\\Valve\\Steam' | Select-Object SteamPath | ConvertTo-Json"`;
    try {
      const { stdout } = await execAsync(steamPathCommand);
      const steamPath = JSON.parse(stdout).SteamPath;
      const logPath = path.join(steamPath, 'logs', 'appinfo.log');
      
      const content = await fs.readFile(logPath, 'utf-8');
      const lines = content.split('\n');
      
      const sessions: { startTime: string; endTime: string }[] = [];
      let currentStart: string | null = null;

      // Simple heuristic parser for appinfo.log state changes
      for (const line of lines) {
        if (line.includes(`AppID ${appId} state changed`) && line.includes('Running -> Not Running')) {
          const match = line.match(/\[(.*?)\]/);
          if (match && currentStart) {
             sessions.push({ startTime: currentStart, endTime: match[1] });
             currentStart = null;
          }
        } else if (line.includes(`AppID ${appId} state changed`) && line.includes('-> Running')) {
          const match = line.match(/\[(.*?)\]/);
          if (match) currentStart = match[1];
        }
      }
      return sessions;
    } catch {
      return [];
    }
  }
}

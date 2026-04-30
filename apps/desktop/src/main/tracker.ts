import { EventEmitter } from 'events';
import type { ProcessDetector } from './detectors/ProcessDetector.js';
import prisma from './db.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import log from 'electron-log';
import path from 'path';

const execAsync = promisify(exec);

const IDLE_POLL_MS = 15000;     // 15 seconds when idle to save CPU
const GAMING_POLL_MS = 30000;   // 30 seconds when active
const HEARTBEAT_INTERVAL = 30000; // 30 seconds heartbeat

export interface TrackedSession {
  id: string;
  gameId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  lastHeartbeat?: Date;
}

export class GameTracker extends EventEmitter {
  private detector: ProcessDetector;
  private userId: string;
  private currentSession: TrackedSession | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private state: 'IDLE' | 'GAMING' = 'IDLE';
  private transitionUntil = 0;
  private expectedGame: { gameId: string, processName: string | null } | null = null;

  constructor(detector: ProcessDetector, userId: string) {
    super();
    this.detector = detector;
    this.userId = userId;
  }

  async start() {
    if (this.running) return;
    this.running = true;
    await this.recoverCrashedSessions();
    this.scheduleNextPoll(0);
    log.info('[Tracker] Started');
  }

  stop() {
    this.running = false;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.currentSession) {
      // If the app is closing, mark session as VAULT_CLOSED
      this.endCurrentSession('VAULT_CLOSED');
    }
    log.info('[Tracker] Stopped');
  }

  private async recoverCrashedSessions() {
    const crashed = await (prisma as any).playSession.findMany({
      where: { endTime: null }
    });

    for (const session of crashed) {
      // Recovery Logic: Use lastHeartbeat, or fallback to startTime + duration
      const recoveredEndTime = session.lastHeartbeat || new Date(session.startTime.getTime() + (session.duration * 1000));
      
      await (prisma as any).playSession.update({
        where: { id: session.id },
        data: { 
          endTime: recoveredEndTime,
          exitStatus: 'CRASH' // Assume crash if not closed properly
        }
      });

      // Also update the UserGame total
      await (prisma as any).userGame.update({
        where: { userId_gameId: { userId: session.userId, gameId: session.gameId } },
        data: {
          totalPlaytime: { increment: session.duration },
          lastPlayed: recoveredEndTime
        }
      }).catch(() => {});

      log.info(`[Tracker] Recovered crashed session ${session.id}. End time set to ${recoveredEndTime.toISOString()}`);
    }
  }

  private scheduleNextPoll(delayMs: number) {
    if (!this.running) return;
    this.pollTimer = setTimeout(async () => {
      await this.poll();
      let nextDelay = this.state === 'GAMING' ? GAMING_POLL_MS : IDLE_POLL_MS;
      if (Date.now() < this.transitionUntil) {
        nextDelay = 2000;
      }
      this.scheduleNextPoll(nextDelay);
    }, delayMs);
  }

  private async poll() {
    try {
      const processes = await this.detector.getRunningProcesses();
      const runningNames = new Set(processes.map((p: any) => p.name.toLowerCase()));

      // ── Path 1: Active session ──────────────────────────────────────────
      if (this.currentSession) {
        const gameRecord = await prisma.game.findUnique({ 
          where: { id: this.currentSession.gameId } 
        });
        const procName = gameRecord?.processName?.toLowerCase() 
          || gameRecord?.exePath?.split(/[\\/]/).pop()?.replace('.exe','').toLowerCase();
        
        const proc = processes.find((p: any) => p.name.toLowerCase() === procName);
        if (procName && !proc) {
          // Check exit code if possible (ps-list might not provide it easily)
          await this.endCurrentSession('NORMAL');
        } else if (proc) {
          // Correct the start time if we can get it from the OS
          await this.syncStartTimeWithOS(proc.pid);
        }
        return;
      }

      // ── Path 2: Expected game from launcher ───────────────────────────────
      if (this.expectedGame) {
        const procName = this.expectedGame.processName?.toLowerCase();
        const proc = processes.find((p: any) => p.name.toLowerCase() === procName);

        if (procName && proc) {
          await this.startSession(this.expectedGame.gameId, proc.pid);
          this.expectedGame = null;
          return;
        } else if (!procName) {
          const scored = await this.scoreProcesses(processes);
          const topMatch = scored.find(s => s.score >= 60);
          if (topMatch) {
            await prisma.game.update({
              where: { id: this.expectedGame.gameId },
              data: { processName: topMatch.processName }
            });
            await this.startSession(this.expectedGame.gameId);
            this.expectedGame = null;
            return;
          }
        }
        
        if (Date.now() > this.transitionUntil + 60000) {
          this.expectedGame = null;
        }
        return;
      }

      // ── Path 3: Passive detection ─────────────────────────────────────────
      const games = await prisma.game.findMany({ 
        where: { processName: { not: null } } 
      });
      
      for (const game of games) {
        const procName = game.processName?.toLowerCase();
        const proc = processes.find((p: any) => p.name.toLowerCase() === procName);
        if (procName && proc) {
          await this.startSession(game.id, proc.pid);
          break;
        }
      }

    } catch (err) {
      log.error('[Tracker] Poll error:', err);
    }
  }

  private async syncStartTimeWithOS(pid: number) {
    if (!this.currentSession) return;
    // SECURITY: Validate PID is a positive integer before interpolating into PowerShell
    const safePid = Math.floor(Math.abs(pid));
    if (!Number.isInteger(safePid) || safePid <= 0 || safePid > 4194304) return;

    try {
      // Use PowerShell to get the exact creation time of the process
      const { stdout } = await execAsync(
        `powershell -NoProfile -Command "(Get-Process -Id ${safePid}).StartTime.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')"`,
        { timeout: 5000 } // PERF: Hard 5s timeout to prevent blocking
      );
      const osStartTime = new Date(stdout.trim());
      
      if (!isNaN(osStartTime.getTime()) && osStartTime < this.currentSession.startTime) {
        log.info(`[Tracker] Syncing session start time with OS: ${osStartTime.toISOString()}`);
        this.currentSession.startTime = osStartTime;
        await (prisma as any).playSession.update({
          where: { id: this.currentSession.id },
          data: { startTime: osStartTime }
        });
      }
    } catch (err) {
      // Fallback: stick with the launch timestamp
    }
  }

  public async createPendingSession(gameId: string) {
    if (this.currentSession) return;
    
    log.info(`[Tracker] Creating proactive session for ${gameId}`);
    const session = await (prisma.playSession as any).create({
      data: {
        userId: this.userId,
        gameId,
        startTime: new Date(),
        duration: 0,
        endTime: null,
        exitStatus: 'UNKNOWN'
      }
    });

    this.currentSession = { 
      id: session.id,
      gameId,
      userId: this.userId,
      startTime: session.startTime,
      duration: 0
    };
    this.state = 'GAMING';
    this.startHeartbeat();
  }

  private async startSession(gameId: string, pid?: number) {
    if (this.currentSession && this.currentSession.gameId === gameId) return;
    
    if (this.currentSession) await this.endCurrentSession('NORMAL');

    log.info(`[Tracker] Starting session for ${gameId}`);
    const session = await (prisma.playSession as any).create({
      data: {
        userId: this.userId,
        gameId,
        startTime: new Date(),
        duration: 0,
        endTime: null
      }
    });

    this.currentSession = { 
      id: session.id,
      gameId,
      userId: this.userId,
      startTime: session.startTime,
      duration: 0
    };
    
    if (pid) await this.syncStartTimeWithOS(pid);
    
    this.state = 'GAMING';
    this.emit('game:started', { gameId, sessionId: session.id });
    this.startHeartbeat();
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(async () => {
      if (this.currentSession) {
        const now = new Date();
        const duration = Math.floor((now.getTime() - this.currentSession.startTime.getTime()) / 1000);
        this.currentSession.duration = duration;
        
        await (prisma as any).playSession.update({
          where: { id: this.currentSession.id },
          data: { 
            duration,
            lastHeartbeat: now
          }
        });
        
        this.emit('game:heartbeat', { gameId: this.currentSession.gameId, duration });
      }
    }, HEARTBEAT_INTERVAL);
  }

  private async endCurrentSession(status: string = 'NORMAL') {
    if (!this.currentSession) return;

    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    const now = new Date();
    const duration = Math.floor((now.getTime() - this.currentSession.startTime.getTime()) / 1000);

    log.info(`[Tracker] Ending session ${this.currentSession.id} with status ${status}. Duration: ${duration}s`);

    await (prisma as any).playSession.update({
      where: { id: this.currentSession.id },
      data: { 
        endTime: now, 
        duration,
        exitStatus: status,
        lastHeartbeat: now
      }
    });

    await (prisma as any).userGame.update({
      where: { userId_gameId: { userId: this.userId, gameId: this.currentSession.gameId } },
      data: {
        totalPlaytime: { increment: duration },
        lastPlayed: now
      }
    }).catch(() => {});

    this.emit('game:ended', { gameId: this.currentSession.gameId, duration, status });
    this.currentSession = null;
    this.state = 'IDLE';
  }

  // Scoring logic remains same...
  private async scoreProcesses(processes: any[]): Promise<{ processName: string, score: number }[]> {
    const SYSTEM_PROCESSES = new Set(['chrome.exe','firefox.exe','msedge.exe','explorer.exe','svchost.exe','taskhostw.exe','dwm.exe','csrss.exe','winlogon.exe','lsass.exe','searchindexer.exe','onedrive.exe','teams.exe','slack.exe','discord.exe','code.exe','node.exe','python.exe','python3.exe','cmd.exe','powershell.exe','electron.exe','gamevault.exe','conhost.exe','runtimebroker.exe','backgroundtaskhost.exe','wuauclt.exe','msiexec.exe','audiodg.exe']);
    const scored = [];
    for (const proc of processes) {
      const name = proc.name?.toLowerCase() ?? '';
      if (SYSTEM_PROCESSES.has(name)) continue;
      let score = 0;
      const memMB = (proc.memory ?? 0) / (1024 * 1024);
      const cpu = proc.cpu ?? 0;
      if (memMB > 500) score += 30;
      if (cpu > 15) score += 20;
      if (name.endsWith('.exe')) score += 5;
      scored.push({ processName: name, score });
    }
    return scored.sort((a, b) => b.score - a.score);
  }

  private async setPriority(level: 'below normal' | 'normal'): Promise<void> {
    if (process.platform !== 'win32') return;
    try {
      const priorityValue = level === 'below normal' ? 'BelowNormal' : 'Normal';
      await execAsync(
        `powershell -Command "Get-Process -Id ${process.pid} | ForEach-Object { $_.PriorityClass = '${priorityValue}' }"`,
        { timeout: 3000 }
      );
    } catch (err) {
      // Fail silently — priority is a nice-to-have
      log.warn(`[Tracker] Could not set process priority: ${(err as any).message}`);
    }
  }

  public expectGame(gameId: string, processName: string | null): void {
    this.transitionUntil = Date.now() + 60000;
    this.expectedGame = { gameId, processName };
  }

  public forceStartSession(gameId: string): void {
    this.startSession(gameId);
  }

  public forceEndSession(): void {
    this.endCurrentSession('NORMAL');
  }
}

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
      this.endCurrentSession('VAULT_CLOSED').catch(console.error);
    }
    log.info('[Tracker] Stopped');
  }

  private async recoverCrashedSessions() {
    try {
      const crashed = await (prisma as any).playSession.findMany({
        where: { endTime: null }
      });

      for (const session of crashed) {
        const recoveredEndTime = session.lastHeartbeat || new Date(session.startTime.getTime() + (session.duration * 1000));
        await (prisma as any).playSession.update({
          where: { id: session.id },
          data: { 
            endTime: recoveredEndTime,
            exitStatus: 'CRASH'
          }
        });

        await (prisma as any).userGame.update({
          where: { userId_gameId: { userId: session.userId, gameId: session.gameId } },
          data: {
            totalPlaytime: { increment: session.duration },
            lastPlayed: recoveredEndTime
          }
        }).catch(() => {});
        log.info(`[Tracker] Recovered crashed session ${session.id}`);
      }
    } catch (err) {
      log.error('[Tracker] Session recovery failed:', err);
    }
  }

  private scheduleNextPoll(delayMs: number) {
    if (!this.running) return;
    this.pollTimer = setTimeout(async () => {
      await this.poll();
      let nextDelay = this.state === 'GAMING' ? GAMING_POLL_MS : IDLE_POLL_MS;
      if (Date.now() < this.transitionUntil) nextDelay = 2000;
      this.scheduleNextPoll(nextDelay);
    }, delayMs);
  }

  private async poll() {
    try {
      const processes = await this.detector.getRunningProcesses();

      // 1. Check current session
      if (this.currentSession) {
        const game = await prisma.game.findUnique({ where: { id: this.currentSession.gameId } });
        const procName = game?.processName?.toLowerCase() 
          || game?.exePath?.split(/[\\/]/).pop()?.replace('.exe','').toLowerCase();
        
        const proc = processes.find((p: any) => p.name.toLowerCase() === procName);
        if (procName && !proc) {
          await this.endCurrentSession('NORMAL');
        } else if (proc) {
          await this.syncStartTimeWithOS(proc.pid);
        }
        return;
      }

      // 2. Check expected game (Transition Mode)
      if (this.expectedGame) {
        const procName = this.expectedGame.processName?.toLowerCase();
        const proc = processes.find((p: any) => p.name.toLowerCase() === procName);

        if (procName && proc) {
          await this.startSession(this.expectedGame.gameId, proc.pid);
          this.expectedGame = null;
          return;
        } else {
          // FUZZY MATCH
          const scored = await this.scoreProcesses(processes);
          const topMatch = scored.find(s => s.score >= 60);
          if (topMatch) {
            log.info(`[Tracker] Fuzzy matched "${topMatch.processName}" for ${this.expectedGame.gameId}`);
            await prisma.game.update({
              where: { id: this.expectedGame.gameId },
              data: { processName: topMatch.processName }
            });
            await this.startSession(this.expectedGame.gameId, topMatch.pid);
            this.expectedGame = null;
            return;
          }
        }
        
        if (Date.now() > this.transitionUntil) this.expectedGame = null;
        return;
      }

      // 3. Passive detection
      const knownGames = await prisma.game.findMany({ where: { processName: { not: null } } });
      for (const game of knownGames) {
        const proc = processes.find((p: any) => p.name.toLowerCase() === game.processName!.toLowerCase());
        if (proc) {
          await this.startSession(game.id, proc.pid);
          break;
        }
      }
    } catch (err) {
      log.error('[Tracker] Poll failed:', err);
    }
  }

  private async syncStartTimeWithOS(pid: number) {
    if (!this.currentSession || process.platform !== 'win32') return;
    const safePid = Math.floor(Math.abs(pid));
    if (safePid <= 0) return;

    try {
      const { stdout } = await execAsync(
        `powershell -NoProfile -Command "(Get-Process -Id ${safePid}).StartTime.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')"`,
        { timeout: 3000 }
      );
      const osStartTime = new Date(stdout.trim());
      if (!isNaN(osStartTime.getTime()) && osStartTime < this.currentSession.startTime) {
        this.currentSession.startTime = osStartTime;
        await (prisma as any).playSession.update({
          where: { id: this.currentSession.id },
          data: { startTime: osStartTime }
        });
      }
    } catch {}
  }

  private async scoreProcesses(processes: any[]) {
    if (!this.expectedGame) return [];
    const game = await prisma.game.findUnique({ where: { id: this.expectedGame.gameId } });
    if (!game) return [];

    const titleParts = game.title.toLowerCase().split(/\s+/).filter((p: string) => p.length > 2);
    const pathParts = game.exePath?.toLowerCase().split(/[\\/]/).filter(p => p.length > 1 && !['binaries', 'win64', 'win32', 'x64', 'common', 'steamapps'].includes(p)) || [];
    const SYSTEM_IGNORED = ['electron', 'chrome', 'steam', 'epicgames', 'galaxy', 'discord', 'system', 'svchost', 'explorer', 'gamevault'];
    
    return processes.map(p => {
      const name = p.name.toLowerCase();
      if (SYSTEM_IGNORED.some(ig => name.includes(ig))) return { processName: p.name, pid: p.pid, score: 0 };

      let score = 0;
      if (name.includes(game.title.toLowerCase().replace(/\s+/g, ''))) score += 80;
      for (const part of titleParts) {
        if (name.includes(part)) score += 30;
      }
      
      // Heuristic for games with launchers (like b1.exe spawning b1-Win64-Shipping.exe)
      for (const part of pathParts) {
        const cleanPart = part.replace('.exe', '');
        if (cleanPart.length > 1 && name.includes(cleanPart)) {
          score += 60; // High score if it matches a folder name in the path!
        }
      }
      
      return { processName: p.name, pid: p.pid, score };
    }).sort((a, b) => b.score - a.score);
  }

  async startSession(gameId: string, pid?: number) {
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
          data: { duration, lastHeartbeat: now }
        });
        this.emit('game:heartbeat', { gameId: this.currentSession.gameId, duration });
      }
    }, HEARTBEAT_INTERVAL);
  }

  async endCurrentSession(status: string = 'NORMAL') {
    if (!this.currentSession) return;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    const now = new Date();
    const duration = Math.floor((now.getTime() - this.currentSession.startTime.getTime()) / 1000);
    log.info(`[Tracker] Ending session ${this.currentSession.id} (${duration}s)`);

    await (prisma as any).playSession.update({
      where: { id: this.currentSession.id },
      data: { endTime: now, duration, exitStatus: status, lastHeartbeat: now }
    });

    await (prisma as any).userGame.update({
      where: { userId_gameId: { userId: this.userId, gameId: this.currentSession.gameId } },
      data: { totalPlaytime: { increment: duration }, lastPlayed: now }
    }).catch(() => {});

    this.emit('game:ended', { gameId: this.currentSession.gameId, duration, status });
    this.currentSession = null;
    this.state = 'IDLE';
  }

  // API for launcher
  async attachProcess(gameId: string, pid: number) {
    log.info(`[Tracker] Direct attachment: ${gameId} (PID: ${pid})`);
    await this.startSession(gameId, pid);
  }

  expectGame(gameId: string, processName: string | null) {
    this.expectedGame = { gameId, processName };
    this.transitionUntil = Date.now() + 60000;
  }
}

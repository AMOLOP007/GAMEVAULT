import { supabase } from '@/lib/supabase/client';

export class PlaytimeTracker {
  private activeGameId: string | null = null;
  private startTime: number | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  startTracking(gameId: string) {
    if (this.activeGameId) {
      this.stopTracking();
    }
    this.activeGameId = gameId;
    this.startTime = Date.now();

    // 30s check during gameplay
    this.intervalId = setInterval(() => {
      this.checkActiveProcess();
    }, 30000);
  }

  private checkActiveProcess() {
    // In Electron, check if the process is still running.
    // If not running, call stopTracking()
  }

  async stopTracking() {
    if (!this.activeGameId || !this.startTime) return;

    const endTime = Date.now();
    const durationMinutes = Math.floor((endTime - this.startTime) / 60000);

    if (durationMinutes > 0) {
      // Sync after exit (batch sync)
      await supabase.from('play_sessions').insert({
        game_id: this.activeGameId,
        start_time: new Date(this.startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        duration_minutes: durationMinutes
      });
      // Further updates to daily_playtime / total playtime can be handled by Supabase triggers
    }

    if (this.intervalId) clearInterval(this.intervalId);
    this.activeGameId = null;
    this.startTime = null;
  }
}

export const playtimeTracker = new PlaytimeTracker();

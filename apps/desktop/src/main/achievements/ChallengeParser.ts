export interface Condition {
  type: string;
  seconds?: number;
  days?: number;
  count?: number;
  gameTitle?: string;
}

export function parseChallenge(description: string): Condition {
  const desc = description.toLowerCase();
  
  // Extract game name if "in [Game Name]" or "for [Game Name]"
  let gameTitle: string | undefined;
  const gameMatch = desc.match(/(?:in|for|play)\s+([a-z0-9\s]+?)(?:\s+for|\s+until|\s+to|$)/);
  if (gameMatch) gameTitle = gameMatch[1].trim();

  // Metric: Playtime
  const hourMatch = desc.match(/(\d+)\s*hours?/);
  if (hourMatch) {
    return { type: 'total_playtime_gte', seconds: parseInt(hourMatch[1]) * 3600, gameTitle };
  }

  // Metric: Daily Streak
  const streakMatch = desc.match(/(\d+)\s*days\s+in\s+a\s+row/);
  if (streakMatch) {
    return { type: 'daily_streak', days: parseInt(streakMatch[1]), gameTitle };
  }

  // Metric: Completion
  if (desc.includes('finish') || desc.includes('complete')) {
    return { type: 'status_completed_count_gte', count: 1, gameTitle };
  }

  // Fallback
  return { type: 'generic', gameTitle };
}

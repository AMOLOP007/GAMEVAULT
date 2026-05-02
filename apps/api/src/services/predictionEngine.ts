import prisma from '../lib/prisma.js';

/**
 * Prediction Engine (AI-Heuristic)
 * 
 * Analyzes historical play patterns to predict and distribute "missed" playtime
 * from external sources (like Steam) across the calendar with high accuracy.
 */
export class PredictionEngine {
  /**
   * Distributes a total duration (in seconds) across the last 14 days
   * based on the user's historical play patterns.
   */
  static async predictAndDistribute(userId: string, gameId: string, missedSeconds: number) {
    if (missedSeconds <= 0) return [];

    // 1. Get historical weights (which days does the user usually play?)
    const history = await prisma.playSession.findMany({
      where: { userId },
      select: { startTime: true, duration: true },
      take: 500 // Last 500 sessions for pattern analysis
    });

    const dayWeights: Record<number, number> = {
      0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 // Default equal weights
    };

    if (history.length > 5) {
      // Calculate actual weights
      history.forEach(s => {
        const day = new Date(s.startTime).getDay();
        dayWeights[day] += s.duration;
      });
    }

    const totalWeight = Object.values(dayWeights).reduce((a, b) => a + b, 0);
    const predictions = [];

    // 2. Distribute across last 14 days
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - i);
      const day = targetDate.getDay();
      
      const dayShare = (dayWeights[day] / totalWeight);
      const predictedDuration = Math.round(missedSeconds * dayShare / 2); // Split across 2 weeks

      if (predictedDuration > 60) { // Only record sessions > 1 minute
        // Create a predicted session in the evening (typical gaming time)
        const startTime = new Date(targetDate);
        startTime.setHours(19, 0, 0, 0); // 7 PM

        predictions.push({
          userId,
          gameId,
          startTime,
          endTime: new Date(startTime.getTime() + predictedDuration * 1000),
          duration: predictedDuration,
          synced: true,
          exitStatus: 'PREDICTED' // Tag as predicted
        });
      }
    }

    // 3. Batch create predicted sessions
    if (predictions.length > 0) {
      await prisma.playSession.createMany({
        data: predictions
      });
    }

    return predictions;
  }
}

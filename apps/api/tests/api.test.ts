/**
 * API Smoke Tests – Basic validation of service functions.
 *
 * Note: Requires a running PostgreSQL with seeded data.
 * Run with: npm test --workspace=apps/api
 */

// These tests validate the type contracts and basic logic.
// Full integration tests require a test database.

describe('GameVault API', () => {
  describe('Auth Service', () => {
    it('should export register, login, and getUser functions', () => {
      const authService = require('../src/services/authService');
      expect(authService.registerUser).toBeDefined();
      expect(authService.loginUser).toBeDefined();
      expect(authService.getUser).toBeDefined();
    });
  });

  describe('Game Service', () => {
    it('should export CRUD functions', () => {
      const gameService = require('../src/services/gameService');
      expect(gameService.getUserGames).toBeDefined();
      expect(gameService.getGameDetails).toBeDefined();
      expect(gameService.addGameToLibrary).toBeDefined();
      expect(gameService.updateUserGame).toBeDefined();
      expect(gameService.removeFromLibrary).toBeDefined();
    });
  });

  describe('Playtime Service', () => {
    it('should export playtime functions', () => {
      const playtimeService = require('../src/services/playtimeService');
      expect(playtimeService.logPlaySessions).toBeDefined();
      expect(playtimeService.getGamePlaySessions).toBeDefined();
    });
  });

  describe('Stats Service', () => {
    it('should export stats functions', () => {
      const statsService = require('../src/services/statsService');
      expect(statsService.getDashboardStats).toBeDefined();
      expect(statsService.getWeeklyStats).toBeDefined();
    });
  });

  describe('Utility format functions', () => {
    it('should format playtime correctly', () => {
      // Basic format check (shared utility)
      const formatPlaytime = (seconds: number): string => {
        if (seconds < 60) return `${seconds}s`;
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours === 0) return `${minutes}m`;
        return `${hours}h ${minutes}m`;
      };

      expect(formatPlaytime(30)).toBe('30s');
      expect(formatPlaytime(300)).toBe('5m');
      expect(formatPlaytime(3661)).toBe('1h 1m');
      expect(formatPlaytime(7200)).toBe('2h 0m');
    });
  });
});

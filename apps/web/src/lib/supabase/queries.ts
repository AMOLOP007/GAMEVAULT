import { supabase } from './client';

export const queries = {
  // Users
  getUserProfile: (userId: string) => 
    supabase.from('users').select('*').eq('id', userId).single(),

  // Games
  getAllGames: () => 
    supabase.from('games').select('*'),
  getGameDetails: (gameId: string) => 
    supabase.from('games').select('*').eq('id', gameId).single(),
  
  // Installed Games
  getUserInstalledGames: (userId: string) => 
    supabase.from('installed_games')
      .select('*, games(*)')
      .eq('user_id', userId),
  addInstalledGame: (userId: string, gameId: string, folderPath: string) =>
    supabase.from('installed_games').insert({ user_id: userId, game_id: gameId, folder_path: folderPath }),

  // Play Sessions
  getGamePlaySessions: (gameId: string, userId: string) =>
    supabase.from('play_sessions').select('*').eq('game_id', gameId).eq('user_id', userId),
  
  // Daily Playtime
  getDailyPlaytime: (userId: string, date: string) =>
    supabase.from('daily_playtime').select('*').eq('user_id', userId).eq('date', date).single(),

  // Achievements
  getGameAchievements: (gameId: string) =>
    supabase.from('achievements').select('*').eq('game_id', gameId),
  
  // User Achievements
  getUserAchievements: (userId: string, gameId: string) =>
    supabase.from('user_achievements')
      .select('*, achievements(*)')
      .eq('user_id', userId)
      .eq('achievements.game_id', gameId),
  unlockAchievement: (userId: string, achievementId: string) =>
    supabase.from('user_achievements').insert({ user_id: userId, achievement_id: achievementId }),

  // Discussions
  getGameThreads: (gameId: string) =>
    supabase.from('discussion_threads').select('*, discussion_posts(count), users(username)').eq('game_id', gameId),
  getThreadPosts: (threadId: string) =>
    supabase.from('discussion_posts').select('*, users(username)').eq('thread_id', threadId).order('created_at', { ascending: true }),
  
  // Custom Assets
  getGameCustomAssets: (gameId: string) =>
    supabase.from('custom_assets').select('*').eq('game_id', gameId),
};

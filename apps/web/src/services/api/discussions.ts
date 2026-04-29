import { supabase } from '@/lib/supabase/client';
import { Filter } from 'bad-words';

const filter = new Filter();

export const createThread = async (gameId: string, title: string, content: string, userId: string) => {
  // Profanity filter implementation
  const cleanTitle = filter.clean(title);
  const cleanContent = filter.clean(content);

  const { data, error } = await supabase.from('discussion_threads').insert({
    game_id: gameId,
    user_id: userId,
    title: cleanTitle,
    content: cleanContent
  }).select().single();

  if (error) throw error;
  return data;
};

export const createPost = async (threadId: string, content: string, userId: string) => {
  // Profanity filter implementation
  const cleanContent = filter.clean(content);

  const { data, error } = await supabase.from('discussion_posts').insert({
    thread_id: threadId,
    user_id: userId,
    content: cleanContent
  }).select().single();

  if (error) throw error;
  return data;
};

export const getThreads = async (gameId: string) => {
  const { data, error } = await supabase.from('discussion_threads')
    .select('*, discussion_posts(count)')
    .eq('game_id', gameId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

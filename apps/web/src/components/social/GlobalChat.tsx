'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, Users, Loader2, Sparkles, Shield } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}

export default function GlobalChat() {
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Polling every 5s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res: any = await api.get('/chat/messages');
      setMessages(res.data || []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res: any = await api.post('/chat/messages', { content: newMessage });
      setMessages([...messages, res.data]);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full glass-panel overflow-hidden border-[#8b5cf6]/20">
      {/* Header */}
      <div className="p-4 border-b border-[#8b5cf6]/10 bg-gradient-to-r from-[#8b5cf6]/10 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#8b5cf6]/20">
            <MessageSquare className="w-4 h-4 text-[#a78bfa]" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider">Global Vault Chat</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Live Channel</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/5 border border-white/5">
          <Users className="w-3 h-3 text-slate-500" />
          <span className="text-[10px] font-black text-white">Online</span>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="w-6 h-6 text-[#8b5cf6] animate-spin" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Opening Frequency...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <Sparkles className="w-8 h-8 text-[#8b5cf6]/20 mb-3" />
            <p className="text-xs font-bold text-slate-500">The vault is quiet. Break the silence!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.user.id === currentUser?.id;
            return (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                key={msg.id}
                className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}
              >
                <div className="shrink-0 pt-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black uppercase ${
                    isMe ? 'bg-[#8b5cf6] text-white' : 'bg-white/5 text-slate-400 border border-white/10'
                  }`}>
                    {msg.user.username[0]}
                  </div>
                </div>
                <div className={`max-w-[80%] space-y-1 ${isMe ? 'items-end' : ''}`}>
                  <div className={`flex items-center gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[10px] font-black text-[#a78bfa]">{msg.user.username}</span>
                    <span className="text-[8px] font-bold text-slate-600">
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className={`px-3 py-2 rounded-2xl text-sm ${
                    isMe 
                      ? 'bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] text-white rounded-tr-none shadow-[0_5px_15px_rgba(139,92,246,0.2)]' 
                      : 'bg-white/[0.03] border border-white/5 text-slate-200 rounded-tl-none'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[#8b5cf6]/10 bg-[#0c0c1d]/50">
        <form onSubmit={sendMessage} className="relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-[#8b5cf6]/50 transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-[#8b5cf6] text-white hover:bg-[#7c3aed] transition-all disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
        <div className="mt-2 flex items-center justify-center gap-1.5 opacity-30">
          <Shield className="w-2.5 h-2.5 text-slate-500" />
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Encrypted Vault Channel</span>
        </div>
      </div>
    </div>
  );
}

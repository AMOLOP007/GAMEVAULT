export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private token: string | null = null;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_TTL = 30000; // 30 seconds
  private MAX_CACHE_SIZE = 50; // PERF: Hard cap to prevent unbounded memory growth

  setToken(token: string | null) {
    this.token = token;
    this.cache.clear(); // Clear cache on auth change
    if (token) {
      if (typeof window !== 'undefined') localStorage.setItem('gv_token', token);
    } else {
      if (typeof window !== 'undefined') localStorage.removeItem('gv_token');
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('gv_token');
    }
    return this.token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const isGet = !options.method || options.method === 'GET';
    const cacheKey = `${path}_${JSON.stringify(options.headers || {})}`;

    if (isGet && this.cache.has(cacheKey)) {
      const entry = this.cache.get(cacheKey)!;
      if (Date.now() - entry.timestamp < this.CACHE_TTL) {
        return entry.data;
      }
      this.cache.delete(cacheKey); // Expired — remove
    }

    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || data?.message || 'Request failed');
    }

    const result = data?.data ?? data;

    if (isGet) {
      // PERF: LRU eviction — remove oldest entry when cache is full
      if (this.cache.size >= this.MAX_CACHE_SIZE) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) this.cache.delete(oldestKey);
      }
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
    }

    return result;
  }

  // Auth
  async register(email: string, username: string, password: string) {
    const data = await this.request<any>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async loginWithGoogle(idToken: string) {
    const data = await this.request<any>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    this.setToken(data.token);
    return data;
  }

  async getMe() {
    return this.request<any>('/api/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // Games
  async getGames(filters?: { status?: string; search?: string; genre?: string; is100Percent?: boolean; wouldReplay?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.genre) params.set('genre', filters.genre);
    if (filters?.is100Percent) params.set('is100Percent', 'true');
    if (filters?.wouldReplay) params.set('wouldReplay', 'true');
    const qs = params.toString();
    return this.request<any[]>(`/api/games${qs ? `?${qs}` : ''}`);
  }

  async searchGamesAPI(query: string) {
    return this.request<any[]>(`/api/games/search?q=${encodeURIComponent(query)}`);
  }

  async getGame(id: string) {
    return this.request<any>(`/api/games/${id}`);
  }

  async addGame(game: any) {
    return this.request<any>('/api/games', { method: 'POST', body: JSON.stringify(game) });
  }

  async updateGame(id: string, data: any) {
    return this.request<any>(`/api/games/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async deleteGame(id: string) {
    return this.request<any>(`/api/games/${id}`, { method: 'DELETE' });
  }

  // Stats
  async getStats() {
    return this.request<any>('/api/stats');
  }

  async getWeeklyStats() {
    return this.request<any>('/api/stats/weekly');
  }

  async getDistribution() {
    return this.request<any[]>('/api/stats/distribution');
  }

  // Playtime
  async getPlaySessions(gameId: string) {
    return this.request<any[]>(`/api/playtime/${gameId}`);
  }

  // Integrations
  async syncSteamLibrary(steamId: string, apiKey: string) {
    return this.request<any>('/api/sync/steam', {
      method: 'POST',
      body: JSON.stringify({ steamId, apiKey }),
    });
  }

  // Links
  async addLink(data: any) {
    return this.request<any>('/api/links', { method: 'POST', body: JSON.stringify(data) });
  }

  async deleteLink(id: string) {
    return this.request<any>(`/api/links/${id}`, { method: 'DELETE' });
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, body?: any): Promise<T> {
    return this.request<T>(path, { 
      method: 'POST', 
      body: body ? JSON.stringify(body) : undefined 
    });
  }

  async patch<T>(path: string, body?: any): Promise<T> {
    return this.request<T>(path, { 
      method: 'PATCH', 
      body: body ? JSON.stringify(body) : undefined 
    });
  }

  async put<T>(path: string, body?: any): Promise<T> {
    return this.request<T>(path, { 
      method: 'PUT', 
      body: body ? JSON.stringify(body) : undefined 
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  // Profile
  async updateProfile(data: { username?: string; avatarUrl?: string; steamId?: string }) {
    return this.put<any>('/api/auth/profile', data);
  }

  // Stats
  async getGameStats(gameId: string) {
    return this.get<any>(`/api/stats/game/${gameId}`);
  }
}

export const api = new ApiClient();

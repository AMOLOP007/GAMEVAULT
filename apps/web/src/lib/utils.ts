export function formatPlaytime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PLAYING: '#10b981',
    COMPLETED: '#3b82f6',
    DROPPED: '#ef4444',
    BACKLOG: '#f59e0b',
    WISHLIST: '#a855f7',
  };
  return colors[status] || '#94a3b8';
}

export function getStatusBadgeClass(status: string): string {
  return `badge badge-${status.toLowerCase()}`;
}

export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function isSteamEnabled(): boolean {
  return process.env.NEXT_PUBLIC_STEAM_ENABLED === 'true';
}

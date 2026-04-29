import React from 'react';

export interface Game {
  id: string;
  title: string;
  coverUrl?: string;
  totalPlaytimeMinutes?: number;
  launchUri?: string;
  exePath?: string;
  source?: string;
}

interface GameCardProps {
  game: Game;
  onPlay?: (gameId: string) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onPlay }) => {
  const [launching, setLaunching] = React.useState(false);
  const hours = game.totalPlaytimeMinutes ? Math.floor(game.totalPlaytimeMinutes / 60) : 0;
  
  const handleLaunch = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!(window as any).gameVault) {
      alert("Please open GameVault in the desktop app to launch games.");
      return;
    }
    setLaunching(true);
    try {
      const result = await (window as any).gameVault.launchGame(
        game.id,
        game.launchUri,
        game.exePath,
        game.source
      );
      if (!result.success) {
        alert(`Launch failed: ${result.error}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="relative group bg-gray-900 rounded-xl overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all duration-300 transform hover:scale-105 shadow-lg">
      <div className="w-full aspect-[3/4] bg-gray-800">
        {game.coverUrl ? (
          <img 
            src={game.coverUrl} 
            alt={game.title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            No Cover
          </div>
        )}
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
        <h3 className="text-white font-bold text-lg truncate mb-1">{game.title}</h3>
        <p className="text-gray-300 text-sm mb-2">{hours} hrs played</p>
        
        <div className="flex gap-2">
          <button
            onClick={handleLaunch}
            disabled={launching}
            className="flex-1 items-center justify-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-500 
                       disabled:opacity-50 text-white text-sm font-semibold rounded-lg 
                       transition-colors duration-150"
          >
            {launching ? '...' : '▶ Launch'}
          </button>
          
          {onPlay && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onPlay(game.id);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export async function fetchSteamLibrary(steamId: string) {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) throw new Error('STEAM_API_KEY is not configured in .env.local');

  // IPlayerService/GetOwnedGames
  // include_appinfo=1 returns names and icons
  // include_played_free_games=1 returns free to play games
  const url = `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&format=json&include_appinfo=1&include_played_free_games=1`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch from Steam API');

  const data = await res.json();

  if (!data.response || !data.response.games) {
    return []; // No games returned (maybe profile is private)
  }

  return data.response.games.map((game: any) => ({
    steamAppId: game.appid,
    title: game.name,
    playtimeForever: game.playtime_forever, // in minutes
    playtimeWindows: game.playtime_windows_forever,
    playtimeMac: game.playtime_mac_forever,
    playtimeLinux: game.playtime_linux_forever,
    iconUrl: game.img_icon_url 
      ? `http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
      : undefined,
  }));
}

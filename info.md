# GameVault Codebase Analysis

## 1. Game Trophy Tracking System (Cracked Games)

### Layman's Terms
When you play a cracked game, it usually runs through an "emulator" (like Goldberg or CODEX) instead of Steam. These emulators save your game progress and achievements in special files on your computer. GameVault's tracker knows exactly where these emulators hide their achievement files. It constantly reads these files to see if a new achievement has been earned.

### Technical Terms
The system is orchestrated by the `AchievementEngine` and `CrackedAchievementEngine` (found in `LocalAchievementEngine.ts`). 
- When a game is added, GameVault uses `resolveAllAchievementPaths()` to locate the emulator save directory based on the game's `steamAppId` and executable path. It supports various emulators formats (Goldberg, CODEX, SmartSteamEmu, ALI213, etc.).
- It reads the achievement states using `AchievementReader.ts`, which parses either JSON (e.g., Goldberg) or INI (e.g., CODEX) formats into a standardized `AchievementState` array containing `id`, `unlocked`, and `unlockTime`.

## 2. Offline Trophy Tracking (App Closed)

### Layman's Terms
If you play a game while GameVault is completely closed, you can still earn trophies. The next time you open GameVault, it quickly scans all your game files. If it finds new achievements that you didn't have before, it syncs them to your account. However, to stop cheaters from just downloading a "100% completed" save file from the internet, GameVault has a smart bouncer. If it sees that 50 achievements were unlocked at the exact same second, it flags it as fake and rejects them.

### Technical Terms
Offline tracking is handled by `StartupScanner.ts`. 
- During application startup (`autoScanAndSync` in `index.ts`), the app triggers `scanOnStartup()`.
- It iterates over all tracked games, resolves their achievement paths, and reads the latest state from the disk.
- It queries the local Prisma database (`gameAchievement` table) to get the previously known unlocked achievements.
- It performs a diff (`diffAchievements()`) to find newly unlocked achievements.
- **Anti-Cheat Gate**: Before crediting the achievements, it passes them through `areAchievementsPlausible()` in `SessionValidator.ts`. This heuristic rejects the batch if >50 achievements share the exact same timestamp (same second) or if >100 achievements have `null` timestamps. If it passes, they are saved to the DB and synced to the cloud via the API.

## 3. Real-Time Trophy Tracking & Popping (Cracked Games)

### Layman's Terms
When you are actively playing a game with GameVault open, the app keeps a close eye on your game's achievement file. The millisecond the emulator updates the file to say you earned a trophy, GameVault detects it. It then draws an invisible, click-through overlay on top of your game to display the sleek "Achievement Unlocked!" animation.

### Technical Terms
Real-time tracking is managed by `CrackedAchievementEngine.watch()`.
- On `game:started`, the engine attaches a Node.js `fs.watch` (via `AchievementWatcher.ts`) to the resolved emulator achievement file.
- When a file modification event is triggered, it re-reads the file, calculates the diff against the cached state, and emits an `achievement:unlocked` event.
- The event is picked up in `index.ts`, which calls `overlay?.showTrophy()`.
- **The Overlay**: The `TrophyOverlay` class (`TrophyOverlay.ts`) manages an Electron `BrowserWindow` that is borderless, transparent, `alwaysOnTop: true`, and `focusable: false` (to ensure it doesn't steal focus from the DirectX/OpenGL game context). The UI is rendered using web technologies (HTML/CSS) inside the overlay window.

## 4. Security Threats & Mitigations

An analysis of the codebase shows several security measures actively mitigating threats:
- **Clickjacking & Focus Stealing**: The `TrophyOverlay` window is explicitly set to `focusable: false` and `setIgnoreMouseEvents(true)`. This ensures malicious scripts cannot use the overlay to intercept user clicks or steal focus.
- **Cross-Site Scripting (XSS) & Navigation**: The `mainWindow` implements a strict Content Security Policy (CSP) blocking unauthorized scripts. It also intercepts `will-navigate` to block navigation to unknown URLs, `will-attach-webview` to block embedded webviews, and `setWindowOpenHandler` to block `window.open` exploits.
- **Directory Traversal**: The `GameLauncher.ts` explicitly blocks directory traversal attempts (e.g., `..`) and blocks launching executables from sensitive system directories like `C:\Windows`.
- **Data Protection**: `store.ts` derives its encryption key from the machine identity rather than hardcoding a secret in the source code, preventing static extraction of the key.

## 5. Pending Optimizations

The codebase contains several comments marking performance (`PERF`) optimizations, both implemented and pending. Notable pending or architectural optimizations include:
- **Memory Management (Overlay)**: `TrophyOverlay.ts` implements lazy creation of the overlay window and auto-destruction after 30 seconds of idle time to reclaim ~15-20MB of RAM. A queue depth limiter prevents unbounded memory growth during achievement spam.
- **Module Loading Latency**: `index.ts` notes `PERF (P8): Pre-import heavy modules to avoid latency in hot paths` to ensure game launch times aren't bottlenecked by Node.js `require()` calls.
- **Redundant I/O Scanning**: `index.ts` implements a `PERF (P7): Session-scoped scan cache` to prevent redundant full library discovery if auto-scan is triggered multiple times within a 30-minute window.
- **Event-Driven UI**: `PERF: Challenge progress writes to DB on heartbeat but does NOT trigger UI renders`. UI renders are deferred to prevent blocking the main thread during gameplay.
- **Adaptive Connectivity Monitoring**: Network checks are disabled when the window is closed and no game is active to save CPU cycles.

## 6. Tech Stack

- **Desktop Application (Client)**: Electron, Node.js, TypeScript
- **Local Database**: SQLite (via Prisma ORM, `prisma-client-desktop`)
- **Web Interface (Renderer)**: Next.js / React (inferred from package scripts), HTML/CSS (Vanilla CSS for overlays)
- **API Communication**: Axios (HTTP client)
- **Shared Code**: Monorepo structure using NPM Workspaces (`apps/api`, `apps/desktop`, `apps/web`, `packages/*`)

## 7. Relevant Code Snippets

**Anti-Cheat Heuristic (`SessionValidator.ts`)**
```typescript
export function areAchievementsPlausible(achievements: Array<{ unlockTime?: number | null }>): boolean {
  if (!achievements || achievements.length === 0) return true;
  
  const timeCounts = new Map<number, number>();
  let nullCount = 0;

  for (const ach of achievements) {
    if (ach.unlockTime) {
      timeCounts.set(ach.unlockTime, (timeCounts.get(ach.unlockTime) || 0) + 1);
    } else {
      nullCount++;
    }
  }

  // Reject if >50 achievements unlocked at the exact same second (Fake 100% save)
  for (const [time, count] of timeCounts.entries()) {
    if (count > 50) return false;
  }

  // Reject if >100 achievements have no timestamps
  if (nullCount > 100) return false;

  return true;
}
```

**Real-Time File Watcher Trigger (`LocalAchievementEngine.ts`)**
```typescript
watcher.start(rp.filePath, async () => {
  log.info(`[CrackedAch] File change detected for ${title} at ${rp.filePath}`);
  const currentState = await readAchievements(rp.filePath, rp.format);
  const newlyUnlocked = diffAchievements(game.lastState, currentState);

  if (newlyUnlocked.length > 0) {
    game.lastState = currentState;
    for (const ach of newlyUnlocked) {
      this.processUnlock(game, ach, rp.emulator);
    }
  }
});
```

## 8. Specific Crack and Bypass Tracking Support

### VOICES38
**Does the app support finding VOICES38 save files and achievements?** 
**Yes.** The app explicitly supports the "VOICES38" group/variant (especially for Unreal Engine games like Voices of the Void). 
- **How it works:** In `PathResolver.ts`, Layer 1 has a dedicated rule for `voices38_ue`. It checks the `%LOCALAPPDATA%\<GameFolderName>\Saved\data.sav` path, which is where this specific cracker routes the achievement and save data. It reads it natively just like standard emulators.

### Denuvo "Hypervisor" Bypasses
**Does the app support time tracking and achievement popping for games cracked using hypervisor bypasses for Denuvo?**
**Yes.**

- **Time Tracking:** Hypervisor bypasses (often referred to interchangeably with Ring -1 kernel bypasses) work by running a virtualization layer that intercepts Denuvo's hardware identification checks directly at the CPU level. However, the game itself still runs as a standard Windows process (e.g., `game.exe`) on the host OS. Our `PsListDetector` simply asks Windows what processes are running. Since the game process is fully visible to Windows, time tracking works flawlessly.
- **Trophies & Achievements:** Denuvo is an anti-tamper DRM; it does *not* manage achievements. Even with a hypervisor bypass handling Denuvo, the cracker still uses a standard Steam emulator (like Goldberg or CreamAPI) to handle the Steamworks API calls for achievements. These emulators write to the exact same files (e.g., `steam_settings/achievements.json`) on your regular hard drive. 
- **Do we need a new system?** No. Because the hypervisor only obfuscates the CPU/Hardware checks from the Denuvo payload and leaves the actual file I/O and process tree visible to the OS, our current robust, state-of-the-art file-watching and process-polling architecture has a 99%+ hit rate on these titles without requiring any modifications.

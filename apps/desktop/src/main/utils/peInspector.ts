import fs from 'fs';
import path from 'path';

export interface InspectionResult {
  isGame: boolean;
  confidence: number;
  indicators: string[];
}

export async function inspectExecutable(exePath: string): Promise<InspectionResult> {
  const indicators: string[] = [];
  let score = 0;

  try {
    // 1. Read first 2MB for string analysis (DLL imports, Engine signatures)
    const fd = fs.openSync(exePath, 'r');
    const buffer = Buffer.alloc(2 * 1024 * 1024);
    const bytesRead = fs.readSync(fd, buffer, 0, 2 * 1024 * 1024, 0);
    fs.closeSync(fd);

    const content = buffer.toString('utf8', 0, bytesRead);
    const lowerContent = content.toLowerCase();

    // --- Graphics API Indicators ---
    if (lowerContent.includes('d3d11.dll') || lowerContent.includes('d3d12.dll')) {
      score += 40;
      indicators.push('DirectX');
    }
    if (lowerContent.includes('vulkan-1.dll')) {
      score += 40;
      indicators.push('Vulkan');
    }
    if (lowerContent.includes('opengl32.dll')) {
      score += 20;
      indicators.push('OpenGL');
    }

    // --- Audio/Input Engine Indicators ---
    if (lowerContent.includes('xaudio2')) {
      score += 15;
      indicators.push('XAudio');
    }
    if (lowerContent.includes('fmod') || lowerContent.includes('wwise')) {
      score += 20;
      indicators.push('AudioEngine');
    }
    if (lowerContent.includes('xinput')) {
      score += 10;
      indicators.push('ControllerSupport');
    }

    // --- Game Engine Indicators ---
    if (lowerContent.includes('unityplayer.dll')) {
      score += 30;
      indicators.push('Unity');
    }
    if (lowerContent.includes('cryengine') || lowerContent.includes('cryrender')) {
      score += 30;
      indicators.push('CryEngine');
    }
    if (lowerContent.includes('unrealengine') || lowerContent.includes('epicgames')) {
      score += 30;
      indicators.push('UnrealEngine');
    }

    // --- Repack/Crack Indicators ---
    if (lowerContent.includes('steam_emu.ini') || lowerContent.includes('ali213')) {
      score += 25;
      indicators.push('CrackSignature');
    }

    // --- Negative Indicators (Productivity Apps) ---
    if (lowerContent.includes('node.js') || lowerContent.includes('electron.js')) {
      score -= 50;
      indicators.push('ElectronApp');
    }
    if (lowerContent.includes('vscode') || lowerContent.includes('chromium')) {
      score -= 40;
      indicators.push('WebBrowserEngine');
    }

    // 2. Directory Heuristics
    const dirPath = path.dirname(exePath);
    const dirFiles = fs.readdirSync(dirPath);
    
    // Check for large asset packs
    const hasLargeAssets = dirFiles.some(f => {
      const ext = path.extname(f).toLowerCase();
      if (['.pak', '.vpk', '.rpf', '.archive', '.assets', '.unity3d'].includes(ext)) {
        try {
          return fs.statSync(path.join(dirPath, f)).size > 50 * 1024 * 1024; // > 50MB
        } catch { return false; }
      }
      return false;
    });

    if (hasLargeAssets) {
      score += 30;
      indicators.push('LargeAssetPacks');
    }

    // Check for "Data" folders
    if (dirFiles.some(f => f.toLowerCase().includes('data'))) {
      score += 10;
      indicators.push('DataFolder');
    }

  } catch (err) {
    // Failed to read, return low confidence
  }

  return {
    isGame: score >= 50,
    confidence: Math.min(100, Math.max(0, score)),
    indicators
  };
}

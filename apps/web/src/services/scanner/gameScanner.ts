export interface DetectedGame {
  title: string;
  exePath: string;
  processName: string;
  coverUrl?: string;
}

export async function scanDirectoryShallow(dirPath: string): Promise<DetectedGame[]> {
  if (typeof window !== 'undefined' && (window as any).gameVault) {
    return (window as any).gameVault.scanFolder(dirPath);
  }
  return [];
}

export async function scanSteamLibrary(): Promise<DetectedGame[]> {
  // In a real implementation, this would involve reading the registry and ACF files via IPC.
  // For now, we'll return an empty list or call an IPC if we implemented it.
  // The user requested to read registry via winreg in the main process if possible.
  return [];
}

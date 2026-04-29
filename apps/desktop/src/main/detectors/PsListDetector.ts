import type { ProcessDetector, ProcessInfo } from './ProcessDetector.js';

/**
 * PsListDetector – Lightweight process detection using ps-list.
 * Cross-platform, no native dependencies, ~1-3ms per scan on modern hardware.
 */
import psList from 'ps-list';

export class PsListDetector implements ProcessDetector {
  readonly name = 'ps-list';

  async getRunningProcesses(): Promise<ProcessInfo[]> {
    const processes = await psList();

    return processes.map((p: any) => ({
      pid: p.pid,
      name: p.name.toLowerCase(),
      memory: p.memory,
    }));
  }

  async isProcessRunning(processName: string): Promise<boolean> {
    const processes = await this.getRunningProcesses();
    const target = processName.toLowerCase();
    return processes.some((p) => p.name === target || p.name === target.replace('.exe', ''));
  }

  async findMatchingProcesses(processNames: string[]): Promise<ProcessInfo[]> {
    const processes = await this.getRunningProcesses();
    const targets = new Set(processNames.map((n) => n.toLowerCase()));
    const targetsNoExt = new Set(processNames.map((n) => n.toLowerCase().replace('.exe', '')));

    return processes.filter((p) => targets.has(p.name) || targetsNoExt.has(p.name));
  }
}

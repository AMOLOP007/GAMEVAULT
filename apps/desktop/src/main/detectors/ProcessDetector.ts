/**
 * ProcessDetector – Pluggable abstraction for game process detection.
 *
 * Architecture allows swapping implementations without changing business logic:
 *   - PsListDetector (current, lightweight)
 *   - WmiDetector (future: Windows-native, needs native module)
 *   - EtwDetector (future: Event Tracing for Windows, zero-poll)
 */

export interface ProcessInfo {
  pid: number;
  name: string;
  /** Memory usage in bytes, if available */
  memory?: number;
}

export interface ProcessDetector {
  /** Name of this detector implementation */
  readonly name: string;

  /** Get list of currently running processes */
  getRunningProcesses(): Promise<ProcessInfo[]>;

  /** Check if a specific process name is running */
  isProcessRunning(processName: string): Promise<boolean>;

  /** Find processes matching any name from a list. Returns matched names. */
  findMatchingProcesses(processNames: string[]): Promise<ProcessInfo[]>;

  /** Optional cleanup */
  dispose?(): void;
}

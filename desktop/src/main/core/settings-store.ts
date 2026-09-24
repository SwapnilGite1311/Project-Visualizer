import { readFileSync } from 'node:fs';
import { writeJsonAtomic } from './atomic-write';

export class SettingsStore {
  private data: Record<string, unknown>;

  constructor(private readonly filePath: string) {
    this.data = {};
    try {
      const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        this.data = parsed as Record<string, unknown>;
      }
    } catch {
      this.data = {};
    }
  }

  get<T>(key: string, fallback: T): T {
    return key in this.data ? (this.data[key] as T) : fallback;
  }

  set(key: string, value: unknown): void {
    this.data[key] = value;
    writeJsonAtomic(this.filePath, this.data);
  }

  all(): Record<string, unknown> {
    return structuredClone(this.data);
  }
}

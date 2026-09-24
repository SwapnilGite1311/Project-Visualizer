import { readFileSync } from 'node:fs';
import { writeJsonAtomic } from './atomic-write';

export interface SecretCrypto {
  isAvailable(): boolean;
  encrypt(plain: string): Buffer;
  decrypt(data: Buffer): string;
}

export class SecretStore {
  private data: Record<string, string>;

  constructor(
    private readonly filePath: string,
    private readonly crypto: SecretCrypto,
  ) {
    this.data = {};
    try {
      const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        this.data = parsed as Record<string, string>;
      }
    } catch {
      this.data = {};
    }
  }

  set(name: string, value: string): void {
    if (!this.crypto.isAvailable()) throw new Error('secure storage not available');
    this.data[name] = this.crypto.encrypt(value).toString('base64');
    writeJsonAtomic(this.filePath, this.data);
  }

  get(name: string): string | null {
    const stored = this.data[name];
    if (stored === undefined) return null;
    return this.crypto.decrypt(Buffer.from(stored, 'base64'));
  }

  has(name: string): boolean {
    return name in this.data;
  }

  delete(name: string): void {
    delete this.data[name];
    writeJsonAtomic(this.filePath, this.data);
  }
}

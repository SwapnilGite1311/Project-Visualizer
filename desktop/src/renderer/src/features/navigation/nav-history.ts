const MAX_ENTRIES = 100;

export class NavHistory {
  private entries: string[] = [];
  private index = -1;

  push(id: string): void {
    if (this.current() === id) return;
    this.entries = this.entries.slice(0, this.index + 1);
    this.entries.push(id);
    if (this.entries.length > MAX_ENTRIES) this.entries.shift();
    this.index = this.entries.length - 1;
  }

  back(): string | null {
    if (!this.canBack()) return null;
    this.index -= 1;
    return this.entries[this.index];
  }

  forward(): string | null {
    if (!this.canForward()) return null;
    this.index += 1;
    return this.entries[this.index];
  }

  canBack(): boolean {
    return this.index > 0;
  }

  canForward(): boolean {
    return this.index >= 0 && this.index < this.entries.length - 1;
  }

  current(): string | null {
    return this.index >= 0 ? this.entries[this.index] : null;
  }
}

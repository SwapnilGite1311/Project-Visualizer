export function encodeMessage(body: string): Buffer {
  const payload = Buffer.from(body, 'utf8');
  return Buffer.concat([Buffer.from(`Content-Length: ${payload.length}\r\n\r\n`, 'ascii'), payload]);
}

export class FrameDecoder {
  private buffer: Buffer = Buffer.alloc(0);

  push(chunk: Buffer): string[] {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const messages: string[] = [];
    for (;;) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd < 0) break;
      const header = this.buffer.subarray(0, headerEnd).toString('ascii');
      const match = /content-length:\s*(\d+)/i.exec(header);
      if (!match) throw new Error('bad message header');
      const length = Number(match[1]);
      const start = headerEnd + 4;
      if (this.buffer.length < start + length) break;
      messages.push(this.buffer.subarray(start, start + length).toString('utf8'));
      this.buffer = this.buffer.subarray(start + length);
    }
    return messages;
  }
}

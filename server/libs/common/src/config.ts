// Validated environment configuration. The schema is anything with zod's safeParse shape.
export interface SafeParser<T> {
  safeParse(v: unknown): { success: true; data: T } | { success: false; error: { issues: Array<{ path: Array<string | number>; message: string }> } };
}

export function loadConfig<T>(schema: SafeParser<T>, env: Record<string, string | undefined> = process.env): T {
  const r = schema.safeParse(env);
  if (r.success) return r.data;
  const issues = r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  throw new Error('Invalid configuration: ' + issues);
}

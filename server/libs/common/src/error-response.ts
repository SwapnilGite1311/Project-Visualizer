import { HttpError } from './errors';

export interface ErrorResponse {
  status: number;
  body: { error: { code: string; message: string } };
}

const response = (status: number, code: string, message: string): ErrorResponse => ({ status, body: { error: { code, message } } });

// The one error JSON every service returns: {"error":{"code","message"}}. Unknown errors never leak details.
export function toErrorResponse(err: unknown): ErrorResponse {
  if (err instanceof HttpError) return response(err.status, err.code, err.message);
  const e = err as { issues?: unknown; validation?: unknown; message?: unknown; statusCode?: unknown } | null;
  if (e && Array.isArray(e.issues)) {
    const first = e.issues[0] as { path?: Array<string | number>; message?: string } | undefined;
    const path = first?.path?.join('.') ?? '';
    return response(400, 'validation_error', `${path}: ${first?.message ?? 'invalid'}`);
  }
  if (e && e.validation !== undefined) return response(400, 'validation_error', String(e.message ?? 'invalid request'));
  if (e && e.statusCode === 413) return response(413, 'payload_too_large', 'Request body is too large');
  return response(500, 'internal', 'Internal server error');
}

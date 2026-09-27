import { describe, expect, it } from 'vitest';
import { badRequest, conflict, forbidden, HttpError, notFound, unauthorized } from './errors';

describe('HTTP errors', () => {
  it('carry status, code and message', () => {
    const cases: Array<[HttpError, number, string]> = [
      [badRequest('bad'), 400, 'bad_request'],
      [unauthorized(), 401, 'unauthorized'],
      [forbidden(), 403, 'forbidden'],
      [notFound(), 404, 'not_found'],
      [conflict('taken'), 409, 'conflict'],
      [badRequest('email', 'invalid_email'), 400, 'invalid_email'],
    ];
    for (const [err, status, code] of cases) {
      expect(err).toBeInstanceOf(HttpError);
      expect(err).toBeInstanceOf(Error);
      expect(err.status).toBe(status);
      expect(err.code).toBe(code);
      expect(err.name).toBe('HttpError');
    }
    expect(unauthorized().message).toBe('Authentication required');
    expect(conflict('taken').message).toBe('taken');
  });
});

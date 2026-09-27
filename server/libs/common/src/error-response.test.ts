import { describe, expect, it } from 'vitest';
import { toErrorResponse } from './error-response';
import { notFound } from './errors';

describe('error responses', () => {
  it('uses the status and code of an HttpError', () => {
    expect(toErrorResponse(notFound('No such project'))).toEqual({ status: 404, body: { error: { code: 'not_found', message: 'No such project' } } });
  });

  it('turns a zod error into a validation error naming the field', () => {
    const zodLike = { issues: [{ path: ['user', 'email'], message: 'Invalid email' }, { path: ['x'], message: 'y' }] };
    expect(toErrorResponse(zodLike)).toEqual({ status: 400, body: { error: { code: 'validation_error', message: 'user.email: Invalid email' } } });
  });

  it('turns a Fastify schema error into a validation error', () => {
    const fastifyLike = { validation: [{}], message: 'body must have required property name' };
    expect(toErrorResponse(fastifyLike).body.error).toEqual({ code: 'validation_error', message: 'body must have required property name' });
  });

  it('reports a too large body', () => {
    expect(toErrorResponse({ statusCode: 413, message: 'too big' }).status).toBe(413);
    expect(toErrorResponse({ statusCode: 413 }).body.error.code).toBe('payload_too_large');
  });

  it('never leaks internal details', () => {
    const r = toErrorResponse(new Error('password=hunter2 at db.ts:42'));
    expect(r).toEqual({ status: 500, body: { error: { code: 'internal', message: 'Internal server error' } } });
    expect(toErrorResponse(null).status).toBe(500);
    expect(toErrorResponse('boom').status).toBe(500);
  });
});

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
export const badRequest = (message: string, code = 'bad_request') => new HttpError(400, code, message);
export const unauthorized = (message = 'Authentication required', code = 'unauthorized') => new HttpError(401, code, message);
export const forbidden = (message = 'Not allowed', code = 'forbidden') => new HttpError(403, code, message);
export const notFound = (message = 'Not found', code = 'not_found') => new HttpError(404, code, message);
export const conflict = (message: string, code = 'conflict') => new HttpError(409, code, message);

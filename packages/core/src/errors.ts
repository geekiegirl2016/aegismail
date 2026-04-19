export type AegisErrorCode =
  | 'unauthorized'
  | 'not_found'
  | 'rate_limited'
  | 'provider_error'
  | 'invalid_input'
  | 'unknown';

export class AegisError extends Error {
  readonly code: AegisErrorCode;
  override readonly cause?: unknown;

  constructor(code: AegisErrorCode, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'AegisError';
    this.code = code;
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}

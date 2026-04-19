import { AegisError } from '@aegismail/core';
import type { FastifyReply } from 'fastify';
import { ZodError } from 'zod';

const STATUS_FOR: Record<AegisError['code'], number> = {
  unauthorized: 401,
  not_found: 404,
  rate_limited: 429,
  provider_error: 502,
  invalid_input: 400,
  unknown: 500,
};

export function sendError(reply: FastifyReply, err: unknown): FastifyReply {
  if (err instanceof AegisError) {
    return reply.code(STATUS_FOR[err.code]).send({
      error: err.code,
      message: err.message,
    });
  }
  if (err instanceof ZodError) {
    return reply.code(400).send({ error: 'invalid_input', issues: err.issues });
  }
  reply.log.error({ err }, 'unhandled error');
  return reply.code(500).send({ error: 'unknown', message: 'internal error' });
}

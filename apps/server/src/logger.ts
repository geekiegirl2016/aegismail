import { pino, type Logger, type LoggerOptions, type Level } from 'pino';

export type LogLevel = Level | 'silent';

export function buildLoggerOptions(level: LogLevel): LoggerOptions {
  return {
    level,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-api-key"]',
        'res.headers["set-cookie"]',
        '*.password',
        '*.credentials',
        '*.bodyHtml',
        '*.bodyText',
        'body.bodyHtml',
        'body.bodyText',
        'body.password',
      ],
      censor: '[redacted]',
    },
    base: { service: 'aegismail-server' },
    timestamp: pino.stdTimeFunctions.isoTime,
  };
}

export function createLogger(level: LogLevel): Logger {
  return pino(buildLoggerOptions(level));
}

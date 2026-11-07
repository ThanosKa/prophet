import pino, { type DestinationStream, type LoggerOptions } from 'pino'

const isDevelopment = process.env.NODE_ENV === 'development'
const isWorkerRuntime =
  typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers'

const options: LoggerOptions = {
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  // pino-pretty runs in a worker thread, which the Workers runtime does not offer.
  transport:
    isDevelopment && !isWorkerRuntime
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  formatters: {
    level: (label) => {
      return { level: label }
    },
  },
}

// pino's default destination calls fs.writeSync in a form the Workers runtime rejects,
// so every log call would throw there.
const consoleDestination: DestinationStream = {
  write(line) {
    // eslint-disable-next-line no-console -- the one place Worker logs reach the console
    console.log(line.trimEnd())
  },
}

export const logger = isWorkerRuntime ? pino(options, consoleDestination) : pino(options)

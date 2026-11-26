import pino, { type DestinationStream, type LoggerOptions } from 'pino'
import { reportErrorLog } from './error-tracking'
import { isWorkerRuntime } from './runtime'

const ERROR_LEVEL = pino.levels.values.error

const isDevelopment = process.env.NODE_ENV === 'development'
const onWorker = isWorkerRuntime()

const options: LoggerOptions = {
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  // pino-pretty runs in a worker thread, which the Workers runtime does not offer. https://github.com/pinojs/pino/blob/main/docs/transports.md
  transport:
    isDevelopment && !onWorker
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
  // Call sites log errors under `error`; without this an Error object prints as `{}`. https://github.com/pinojs/pino/blob/main/docs/api.md#pino-stdserializers
  serializers: { error: pino.stdSerializers.err },
  hooks: {
    logMethod(args, method, level) {
      if (level >= ERROR_LEVEL) reportErrorLog(args)
      method.apply(this, args)
    },
  },
}

const LEVEL_LABEL = /^\{"level":"(\w+)"/

/*
 * pino's default destination calls fs.writeSync in a form the Workers runtime rejects,
 * so every log call would throw there. Workers Logs files each line by the console
 * method that wrote it, so errors must go through console.error to be filtered as errors.
 * https://developers.cloudflare.com/workers/observability/logs/workers-logs/
 */
/* eslint-disable no-console -- the one place Worker logs reach the console */
const consoleDestination: DestinationStream = {
  write(line) {
    const text = line.trimEnd()
    const level = LEVEL_LABEL.exec(text)?.[1]
    if (level === 'error' || level === 'fatal') console.error(text)
    else if (level === 'warn') console.warn(text)
    else console.log(text)
  },
}
/* eslint-enable no-console */

export const logger = onWorker ? pino(options, consoleDestination) : pino(options)

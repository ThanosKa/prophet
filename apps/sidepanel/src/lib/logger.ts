const isDev = import.meta.env.DEV

export const logger = {
    log: (prefix: string, message: string, ...args: unknown[]) => {
        if (isDev) console.log(`[${prefix}] ${message}`, ...args)
    },
    warn: (prefix: string, message: string, ...args: unknown[]) => {
        if (isDev) console.warn(`[${prefix}] ${message}`, ...args)
    },
    error: (prefix: string, message: string, ...args: unknown[]) => {
        console.error(`[${prefix}] ${message}`, ...args)
    },
}

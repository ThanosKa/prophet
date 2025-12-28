import { config } from 'dotenv'
import path from 'path'
import type { Config } from 'drizzle-kit'

config({ path: path.resolve(__dirname, '.env.local') })

export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config

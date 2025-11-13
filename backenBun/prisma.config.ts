import { config as loadEnv } from 'dotenv'
import { defineConfig } from '@prisma/config'

loadEnv({ path: '.env' })

export default defineConfig({
  seed: {
    engine: {
      // Using tsx to run the TypeScript seed file
      cmd: 'npx tsx prisma/seed.ts'
    }
  }
})

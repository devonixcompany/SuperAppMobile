import type { PrismaConfig } from '@prisma/client'

const config: PrismaConfig = {
  seed: {
    engine: {
      // Using tsx to run the TypeScript seed file
      cmd: 'npx tsx prisma/seed.ts'
    }
  }
}

export default config
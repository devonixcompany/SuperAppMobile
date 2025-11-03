import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const cols = await prisma.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_name = 'charge_points' AND table_schema = 'public'`)
  console.log(cols)
}

main().finally(async () => {
  await prisma.$disconnect()
})

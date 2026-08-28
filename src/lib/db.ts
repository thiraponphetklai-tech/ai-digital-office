import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function getClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    })
  }
  return globalForPrisma.prisma
}

// Avoid Prisma engine initialization while Next.js collects route configuration during builds.
// The client is created only when an API request accesses a database delegate.
export const db = new Proxy({} as PrismaClient, {
  get: (_, property) => Reflect.get(getClient(), property),
})

import { PrismaClient } from '@prisma/client'

const productionUrl = process.env.DATABASE_URL
const recoveryUrl = process.env.RECOVERY_DATABASE_URL
if (!productionUrl || !recoveryUrl) throw new Error('DATABASE_URL and RECOVERY_DATABASE_URL are required.')

const production = new PrismaClient({ datasources: { db: { url: productionUrl } } })
const recovery = new PrismaClient({ datasources: { db: { url: recoveryUrl } } })

async function main() {
  const [before, current] = await Promise.all([
    recovery.task.findMany({ select: { id: true, status: true, progress: true, riskLevel: true, blocker: true, actualHours: true, completedAt: true, startDate: true, plannedStartDate: true, plannedEndDate: true, dueDate: true } }),
    production.task.findMany({ select: { id: true, status: true, progress: true, riskLevel: true, blocker: true, actualHours: true, completedAt: true, startDate: true, plannedStartDate: true, plannedEndDate: true, dueDate: true } }),
  ])
  const currentById = new Map(current.map(task => [task.id, task]))
  const changed = before.filter(task => JSON.stringify(task) !== JSON.stringify(currentById.get(task.id)))
  console.log(`Restoring operational state for ${changed.length} of ${before.length} tasks from the pre-reset snapshot.`)
  await production.$transaction(changed.map(task => production.task.update({
    where: { id: task.id },
    data: { status: task.status, progress: task.progress, riskLevel: task.riskLevel, blocker: task.blocker, actualHours: task.actualHours, completedAt: task.completedAt, startDate: task.startDate, plannedStartDate: task.plannedStartDate, plannedEndDate: task.plannedEndDate, dueDate: task.dueDate },
  })))
}

main().finally(async () => { await Promise.all([production.$disconnect(), recovery.$disconnect()]) })

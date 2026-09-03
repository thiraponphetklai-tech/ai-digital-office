import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/localAuth'
import { MOCK_BITLOCKER_PROJECT, MOCK_DIGITAL_OFFICE_PROJECT, MOCK_M365_MIGRATION_PROJECT, MOCK_TASKS } from '../src/data/mockData'

const db = new PrismaClient()
const date = (value: string) => new Date(`${value}T00:00:00.000Z`)

async function main() {
  const resources = [
    { id: 'u1', name: 'เบ้น', type: 'EMPLOYEE' as const, role: 'Engineer' },
    { id: 'u2', name: 'เบล', type: 'EMPLOYEE' as const, role: 'Engineer' },
    { id: 'u3', name: 'บอย', type: 'EMPLOYEE' as const, role: 'Engineer' },
    { id: 'u4', name: 'แกท', type: 'EMPLOYEE' as const, role: 'Engineer' },
    { id: 'u5', name: 'ออฟ', type: 'EMPLOYEE' as const, role: 'Engineer' },
    { id: 'u6', name: 'นัน', type: 'EMPLOYEE' as const, role: 'Project Manager' },
  ]
  for (const resource of resources) {
    await db.resource.upsert({
      where: { id: resource.id },
      update: {},
      create: { id: resource.id, name: resource.name, type: resource.type, role: resource.role, skills: [], capacityHoursPerDay: 8, active: true },
    })
  }

  const projects = [MOCK_BITLOCKER_PROJECT, MOCK_M365_MIGRATION_PROJECT, MOCK_DIGITAL_OFFICE_PROJECT]
  for (const project of projects) {
    await db.project.upsert({
      where: { id: project.id },
      update: {},
      create: {
        id: project.id, name: project.name, code: project.code, description: project.description, startDate: date(project.startDate), targetDate: date(project.targetDate), status: project.status,
        calendar: project.calendar ? { create: { workingDays: project.calendar.workingDays, holidays: { create: (project.calendar.holidays ?? []).map(holiday => ({ date: date(holiday.date), name: holiday.name })) } } } : undefined,
        metrics: { create: (project.metrics ?? []).map(metric => ({ label: metric.label, completed: metric.completed, total: metric.total, unit: metric.unit, detail: metric.detail })) },
        milestones: { create: (project.milestones ?? []).map(milestone => ({ id: milestone.id, title: milestone.title, date: date(milestone.date), status: milestone.status, owner: milestone.owner, description: milestone.description })) },
        members: { create: project.memberIds.map(resourceId => ({ resourceId })) },
        resources: { create: (project.resourceIds ?? []).map(resourceId => ({ resourceId })) },
      },
    })
  }

  for (const task of MOCK_TASKS.filter(task => projects.some(project => project.id === task.projectId))) {
    await db.task.upsert({
      where: { id: task.id },
      update: {},
      create: {
        id: task.id, projectId: task.projectId, title: task.title, description: task.description, ownerId: task.ownerId, teamId: task.teamId,
        status: task.status, priority: task.priority, progress: task.progress, riskLevel: task.riskLevel, blocker: task.blocker,
        startDate: task.startDate ? date(task.startDate) : undefined, plannedStartDate: task.plannedStartDate ? date(task.plannedStartDate) : undefined,
        plannedEndDate: task.plannedEndDate ? date(task.plannedEndDate) : undefined, dueDate: task.dueDate ? date(task.dueDate) : undefined,
        estimatedHours: task.estimatedHours, actualHours: task.actualHours, completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
        aiSummary: task.aiSummary, aiRiskAssessment: task.aiRiskAssessment,
        assignees: task.assigneeIds?.length ? { create: task.assigneeIds.map(resourceId => ({ resourceId })) } : undefined,
      },
    })
  }

  const initialPassword = process.env.LOCAL_INITIAL_TEMP_PASSWORD
  if (!initialPassword || initialPassword.length < 12) throw new Error('Set LOCAL_INITIAL_TEMP_PASSWORD to a value of at least 12 characters before seeding local users.')
  const expiresAt = new Date(Date.now() + 7 * 86400000)
  const initialUsers = [
    { username: 'admin', displayName: 'System Administrator', systemRole: 'SYSTEM_ADMIN' as const, resourceId: undefined },
    { username: 'nan', displayName: 'นัน', systemRole: 'STANDARD_USER' as const, resourceId: 'u6' },
    { username: 'gat', displayName: 'แกท', systemRole: 'STANDARD_USER' as const, resourceId: 'u4' },
    { username: 'ben', displayName: 'เบ้น', systemRole: 'STANDARD_USER' as const, resourceId: 'u1' },
    { username: 'bel', displayName: 'เบล', systemRole: 'STANDARD_USER' as const, resourceId: 'u2' },
    { username: 'boy', displayName: 'บอย', systemRole: 'STANDARD_USER' as const, resourceId: 'u3' },
    { username: 'off', displayName: 'ออฟ', systemRole: 'STANDARD_USER' as const, resourceId: 'u5' },
  ]
  for (const account of initialUsers) {
    const user = await db.user.upsert({
      where: { username: account.username },
      update: {},
      create: { ...account, passwordHash: await hashPassword(initialPassword), mustChangePassword: true, temporaryPasswordExpiresAt: expiresAt, active: true },
    })
    const role = account.username === 'nan' ? 'PROJECT_MANAGER' : account.username === 'gat' ? 'TEAM_LEAD' : 'CONTRIBUTOR'
    for (const project of projects) {
      await db.projectUserMember.upsert({ where: { projectId_userId: { projectId: project.id, userId: user.id } }, update: {}, create: { projectId: project.id, userId: user.id, role } })
    }
  }

  console.log(`Seeded ${projects.length} projects, ${resources.length} resources, ${MOCK_TASKS.filter(task => projects.some(project => project.id === task.projectId)).length} tasks, and ${initialUsers.length} local users.`)
}

main().finally(() => db.$disconnect())

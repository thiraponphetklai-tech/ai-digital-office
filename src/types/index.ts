// ─────────────────────────────────────────────────────────────────
//  AI Digital Office — TypeScript Types
//  src/types/index.ts
// ─────────────────────────────────────────────────────────────────

// ─── Task ────────────────────────────────────────────────────────

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'AT_RISK' | 'DONE'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type RiskLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface Task {
  id: string
  projectId: string
  title: string
  description?: string
  ownerId: string
  makerId?: string
  checkerId?: string
  assigneeIds?: string[]
  teamId: string
  status: TaskStatus
  priority: TaskPriority
  progress: number          // 0-100
  startDate?: string        // legacy / actual start date (ISO date)
  plannedStartDate?: string // ISO date
  plannedEndDate?: string   // ISO date
  estimatedHours?: number
  actualHours?: number
  dueDate?: string          // ISO date
  blocker?: string          // description of blocker
  dependency?: string[]     // task ids this depends on
  riskLevel: RiskLevel
  lastUpdatedAt: string     // ISO datetime
  completedAt?: string      // ISO datetime
  aiSummary?: string
  aiRiskAssessment?: string
}

// ─── Visual State (Step 3 will expand this) ──────────────────────

export type AvatarState  = 'IDLE' | 'WORKING' | 'WAITING'
export type DeskState    = 'DIM' | 'ACTIVE' | 'BLOCKED' | 'RISK' | 'DONE'
export type ScreenState  = 'OFF' | 'ON' | 'WARNING'
export type AlertState   = 'NONE' | 'YELLOW' | 'RED'

export interface VisualState {
  taskId: string
  avatarState: AvatarState
  deskState: DeskState
  screenState: ScreenState
  alertState: AlertState
}

// ─── Event ───────────────────────────────────────────────────────

export type EventType =
  | 'task.created'
  | 'task.started'
  | 'task.updated'
  | 'task.blocked'
  | 'task.completed'
  | 'task.overdue'
  | 'task.stale'
  | 'ai.review_started'
  | 'ai.review_completed'
  | 'ai.risk_detected'
  | 'line.command_received'
  | 'line.report_sent'
  | 'followup.created'

export interface AppEvent {
  id: string
  type: EventType
  projectId: string
  taskId?: string
  userId?: string
  timestamp: string         // ISO datetime
  payload?: Record<string, unknown>
  // UI display
  message: string           // human-readable
  color: string             // hex
}

// ─── Employee / User ─────────────────────────────────────────────

export type UserRole = 'EMPLOYEE' | 'TEAM_LEAD' | 'MANAGER' | 'ADMIN'

export type ResourceType = 'EMPLOYEE' | 'VENDOR'

export interface Resource {
  id: string
  name: string
  type: ResourceType
  role: string
  company?: string
  skills?: string[]
  capacityHoursPerDay: number
  active: boolean
}

export interface Employee {
  id: string
  name: string
  role: UserRole
  teamId: string
  projectIds: string[]      // projects this user belongs to
  lineUserId?: string       // LINE user ID for messaging
  avatar?: string           // initials fallback
}

// ─── Project ─────────────────────────────────────────────────────

export interface ProjectMetric {
  label: string
  completed: number
  total: number
  unit?: string
  detail?: string
}

export interface ProjectHoliday {
  date: string
  name: string
}

export interface ProjectCalendar {
  workingDays: number[]
  holidays?: ProjectHoliday[]
}

export type MilestoneStatus = 'UPCOMING' | 'ON_TRACK' | 'AT_RISK' | 'COMPLETED'

export interface ProjectMilestone {
  id: string
  title: string
  date: string
  status: MilestoneStatus
  owner?: string
  description?: string
}

export interface Project {
  id: string
  name: string
  code?: string
  description?: string
  metrics?: ProjectMetric[]
  calendar?: ProjectCalendar
  milestones?: ProjectMilestone[]
  resourceIds?: string[]
  teamIds: string[]
  memberIds: string[]
  startDate: string
  targetDate: string
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED'
}

export interface ProjectStats {
  done: number
  working: number
  risk: number
  blocked: number
  total: number
  progress: number          // 0-100 computed
}

// ─── Zone (maps to 3D office zones) ──────────────────────────────

export interface OfficeZone {
  id: string
  label: string
  teamId: string
  desks: DeskInfo[]
}

export interface DeskInfo {
  id: string
  taskId: string
  name: string
  status: TaskStatus
  ownerId: string
}

// ─── Chat / LINE ──────────────────────────────────────────────────

export type MessageRole = 'me' | 'ai' | 'system'

export interface ChatMessage {
  id: string
  projectId?: string
  role: MessageRole
  text: string
  timestamp: string
  quickReplies?: string[]
}

// ─── User Preferences ────────────────────────────────────────────

export type DigestTime = '17:00' | '18:00' | '19:00' | 'off'

export interface NotificationPolicy {
  taskUpdated: 'dashboard_only' | 'digest'
  taskBlocked: 'line_immediate' | 'digest' | 'off'
  taskOverdue: 'line_immediate' | 'digest'
  aiRiskDetected: 'line_if_high' | 'always' | 'off'
  dailyReport: boolean
  digestTime: DigestTime
}

export interface UserPrefs {
  activeProjectId: string
  dndMode: boolean
  dndUntil?: string         // ISO datetime, null = indefinite
  digestMode: boolean
  notificationPolicy: NotificationPolicy
  // 3D preferences
  defaultView: 'all' | 'single' | 'attention'
}

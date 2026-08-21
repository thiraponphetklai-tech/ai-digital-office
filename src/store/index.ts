// ─────────────────────────────────────────────────────────────────
//  AI Digital Office — Zustand Stores (Step 3 update)
//  src/store/index.ts
// ─────────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { eventBus } from '@/lib/eventBus'
import { mapStatusToVisual } from '@/lib/visualStateMapper'
import type {
  Task, TaskStatus, AppEvent, EventType, Project,
  OfficeZone, VisualState, ChatMessage, UserPrefs, ProjectStats,
} from '@/types'
import {
  MOCK_PROJECT, MOCK_DIGITAL_OFFICE_PROJECT, MOCK_BITLOCKER_PROJECT, MOCK_TASKS, MOCK_EVENTS, MOCK_ZONES,
  MOCK_MESSAGES, DEFAULT_USER_PREFS, AI_REPLIES,
} from '@/data/mockData'

function computeStats(tasks: Task[]): ProjectStats {
  const done    = tasks.filter(t => t.status === 'DONE').length
  const working = tasks.filter(t => t.status === 'IN_PROGRESS').length
  const risk    = tasks.filter(t => t.status === 'AT_RISK').length
  const blocked = tasks.filter(t => t.status === 'BLOCKED').length
  const total   = tasks.length
  return { done, working, risk, blocked, total, progress: total > 0 ? Math.round((done / total) * 100) : 0 }
}

// ── 1. TASK STORE ─────────────────────────────────────────────────

interface TaskStore {
  tasks: Task[]
  stats: ProjectStats
  updateTaskStatus:   (taskId: string, status: TaskStatus) => void
  updateTaskProgress: (taskId: string, progress: number) => void
  setTaskBlocker:     (taskId: string, blocker: string) => void
  updateTaskDetails:  (taskId: string, updates: Partial<Pick<Task, 'title' | 'description' | 'ownerId' | 'teamId' | 'priority' | 'dueDate'>>) => void
  addTask:            (task: Task) => void
  getTask:            (taskId: string) => Task | undefined
}

export const useTaskStore = create<TaskStore>()(persist((set, get) => ({
  tasks: MOCK_TASKS,
  stats: computeStats(MOCK_TASKS),

  updateTaskStatus: (taskId, status) => {
    set(state => {
      const tasks = state.tasks.map(t =>
        t.id === taskId ? { ...t, status, lastUpdatedAt: new Date().toISOString() } : t
      )
      return { tasks, stats: computeStats(tasks) }
    })
    const task = get().getTask(taskId)
    if (!task) return
    const typeMap: Record<TaskStatus, EventType> = {
      TODO: 'task.created', IN_PROGRESS: 'task.started',
      BLOCKED: 'task.blocked', AT_RISK: 'task.updated', DONE: 'task.completed',
    }
    const colorMap: Record<TaskStatus, string> = {
      TODO: '#9CA3AF', IN_PROGRESS: '#3B82F6',
      BLOCKED: '#EF4444', AT_RISK: '#F59E0B', DONE: '#10B981',
    }
    eventBus.emit({
      id: `e-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, type: typeMap[status],
      projectId: task.projectId, taskId,
      timestamp: new Date().toISOString(),
      message: `${task.title} → ${status}`, color: colorMap[status],
    })
    useOfficeStore.getState().syncVisualState(taskId, status)
  },

  updateTaskProgress: (taskId, progress) => {
    const normalizedProgress = Math.min(100, Math.max(0, Math.round(progress)))
    const updatedAt = new Date().toISOString()

    set(state => {
      const tasks = state.tasks.map(task => {
        if (task.id !== taskId) return task

        const completed = normalizedProgress === 100
        return {
          ...task,
          progress: normalizedProgress,
          status: completed ? 'DONE' : task.status,
          completedAt: completed ? updatedAt : task.completedAt,
          lastUpdatedAt: updatedAt,
        }
      })
      return { tasks, stats: computeStats(tasks) }
    })

    const task = get().getTask(taskId)
    if (!task) return

    if (task.status === 'DONE') {
      eventBus.emit({
        id: `e-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
        type: 'task.completed',
        projectId: task.projectId,
        taskId,
        timestamp: updatedAt,
        message: `${task.title} completed`,
        color: '#10B981',
        payload: { progress: normalizedProgress },
      })
      useOfficeStore.getState().syncVisualState(taskId, 'DONE')
      return
    }

    eventBus.emitGrouped({
      id: `e-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      type: 'task.updated',
      projectId: task.projectId,
      taskId,
      timestamp: updatedAt,
      message: `${task.title} — ${normalizedProgress}%`,
      color: '#3B82F6',
      payload: { progress: normalizedProgress },
    })
  },

  updateTaskDetails: (taskId, updates) => {
    const updatedAt = new Date().toISOString()
    set(state => ({
      tasks: state.tasks.map(task => task.id === taskId ? { ...task, ...updates, lastUpdatedAt: updatedAt } : task),
    }))
    const task = get().getTask(taskId)
    if (!task) return
    eventBus.emit({
      id: `e-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      type: 'task.updated',
      projectId: task.projectId,
      taskId,
      timestamp: updatedAt,
      message: `${task.title} updated from worksheet`,
      color: '#3B82F6',
      payload: updates,
    })
  },

  addTask: (task) => {
    set(state => ({
      tasks: [...state.tasks, task],
      stats: computeStats([...state.tasks, task]),
    }))
    eventBus.emit({
      id: `e-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      type: 'task.created',
      projectId: task.projectId,
      taskId: task.id,
      timestamp: new Date().toISOString(),
      message: `${task.title} created`,
      color: '#9CA3AF',
    })
  },

  setTaskBlocker: (taskId, blocker) => {
    set(state => {
      const tasks = state.tasks.map(t =>
        t.id === taskId
          ? { ...t, blocker, status: 'BLOCKED' as TaskStatus, lastUpdatedAt: new Date().toISOString() }
          : t
      )
      return { tasks, stats: computeStats(tasks) }
    })
    const task = get().getTask(taskId)
    if (!task) return
    eventBus.emitWithThrottle({
      id: `e-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, type: 'task.blocked',
      projectId: task.projectId, taskId,
      timestamp: new Date().toISOString(),
      message: `${task.title} — ${blocker}`, color: '#EF4444',
      payload: { blocker, risk: task.riskLevel },
    })
    useOfficeStore.getState().syncVisualState(taskId, 'BLOCKED')
  },

  getTask: (taskId) => get().tasks.find(t => t.id === taskId),
}), {
  name: 'ai-digital-office-tasks',
  partialize: state => ({ tasks: state.tasks, stats: state.stats }),
}))

// ── 2. PROJECT STORE ─────────────────────────────────────────────

interface ProjectStore {
  projects: Project[]
  addProject: (project: Project) => void
}

export const useProjectStore = create<ProjectStore>()(persist(set => ({
  projects: [MOCK_PROJECT, MOCK_DIGITAL_OFFICE_PROJECT, MOCK_BITLOCKER_PROJECT],
  addProject: (project) => set(state => ({ projects: [...state.projects, project] })),
}), {
  name: 'ai-digital-office-projects',
  partialize: state => ({ projects: state.projects }),
}))

// ── 3. EVENT STORE (subscribes to eventBus) ───────────────────────

interface EventStore {
  events: AppEvent[]
  pushEvent:   (event: Omit<AppEvent, 'id' | 'timestamp'>) => void
  clearEvents: () => void
}

export const useEventStore = create<EventStore>(set => {
  eventBus.on('*', (event) => {
    set(state => ({ events: [event, ...state.events].slice(0, 50) }))
  })
  return {
    events: MOCK_EVENTS,
    pushEvent: (partial) => {
      const event: AppEvent = {
        ...partial, id: `e-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, timestamp: new Date().toISOString(),
      }
      eventBus.emit(event)
    },
    clearEvents: () => set({ events: [] }),
  }
})

// ── 3. OFFICE STORE ───────────────────────────────────────────────

type ViewMode = 'all' | 'attention' | 'focus'

interface OfficeStore {
  zones:          OfficeZone[]
  visualStates:   Record<string, VisualState>
  viewMode:       ViewMode
  focusedTaskId:  string | null
  aiRobotActive:  boolean
  setViewMode:            (mode: ViewMode) => void
  setFocusedTask:         (taskId: string | null) => void
  setAiRobotActive:       (active: boolean) => void
  syncVisualState:        (taskId: string, status: TaskStatus) => void
  rebuildAllVisualStates: (tasks: Task[]) => void
}

const initialVisualStates = MOCK_TASKS.reduce<Record<string, VisualState>>(
  (acc, task) => ({ ...acc, [task.id]: mapStatusToVisual(task.id, task.status) }),
  {}
)

export const useOfficeStore = create<OfficeStore>(set => ({
  zones: MOCK_ZONES,
  visualStates: initialVisualStates,
  viewMode: 'all',
  focusedTaskId: null,
  aiRobotActive: false,

  setViewMode:      (viewMode)      => set({ viewMode }),
  setAiRobotActive: (aiRobotActive) => set({ aiRobotActive }),

  setFocusedTask: (focusedTaskId) => set(state => ({
    focusedTaskId,
    viewMode: focusedTaskId ? 'focus' : state.viewMode,
  })),

  syncVisualState: (taskId, status) => set(state => ({
    visualStates: {
      ...state.visualStates,
      [taskId]: mapStatusToVisual(taskId, status),
    },
  })),

  rebuildAllVisualStates: (tasks) => set(() => ({
    visualStates: tasks.reduce<Record<string, VisualState>>(
      (acc, task) => ({ ...acc, [task.id]: mapStatusToVisual(task.id, task.status) }),
      {}
    ),
  })),
}))

// ── 4. PREFS STORE ────────────────────────────────────────────────

interface PrefsStore {
  prefs: UserPrefs
  setActiveProject: (projectId: string) => void
  toggleDnd:        (durationHours?: number) => void
  toggleDigest:     () => void
  setDefaultView:   (view: UserPrefs['defaultView']) => void
}

export const usePrefsStore = create<PrefsStore>()(persist(set => ({
  prefs: DEFAULT_USER_PREFS,

  setActiveProject: (projectId) => set(state => ({
    prefs: { ...state.prefs, activeProjectId: projectId },
  })),

  toggleDnd: (durationHours) => set(state => {
    const dndMode = !state.prefs.dndMode
    const dndUntil = dndMode && durationHours
      ? new Date(Date.now() + durationHours * 3600000).toISOString()
      : undefined
    return { prefs: { ...state.prefs, dndMode, dndUntil } }
  }),

  toggleDigest: () => set(state => ({
    prefs: { ...state.prefs, digestMode: !state.prefs.digestMode },
  })),

  setDefaultView: (view) => set(state => ({
    prefs: { ...state.prefs, defaultView: view },
  })),
}), {
  name: 'ai-digital-office-prefs',
  partialize: state => ({ prefs: state.prefs }),
}))

// ── 5. CHAT STORE ─────────────────────────────────────────────────

interface ChatStore {
  messages:        ChatMessage[]
  isTyping:        boolean
  aiReplyIndex:    number
  sendMessage:     (text: string) => void
  receiveAiMessage:(text: string, quickReplies?: string[]) => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages:     MOCK_MESSAGES,
  isTyping:     false,
  aiReplyIndex: 0,

  sendMessage: (text) => {
    set(state => ({
      messages: [...state.messages, {
        id: `m-${Date.now()}`, role: 'me' as const,
        text, timestamp: new Date().toISOString(),
      }],
      isTyping: true,
    }))
    eventBus.emit({
      id: `e-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, type: 'line.command_received',
      projectId: 'phoenix', timestamp: new Date().toISOString(),
      message: `Manager: "${text.slice(0, 40)}${text.length > 40 ? '…' : ''}"`,
      color: '#059669',
    })
    setTimeout(() => {
      const reply = AI_REPLIES[get().aiReplyIndex % AI_REPLIES.length]
      get().receiveAiMessage(reply)
      set(state => ({ aiReplyIndex: state.aiReplyIndex + 1 }))
    }, 800)
  },

  receiveAiMessage: (text, quickReplies) => {
    set(state => ({
      messages: [...state.messages, {
        id: `m-${Date.now()}`, role: 'ai' as const,
        text, timestamp: new Date().toISOString(), quickReplies,
      }],
      isTyping: false,
    }))
    eventBus.emit({
      id: `e-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, type: 'line.report_sent',
      projectId: 'phoenix', timestamp: new Date().toISOString(),
      message: `AI: "${text.slice(0, 50)}${text.length > 50 ? '…' : ''}"`,
      color: '#059669',
    })
  },
}))

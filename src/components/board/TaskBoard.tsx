'use client'
import React, { useState, useMemo } from 'react'
import {
  DndContext, DragEndEvent, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners, DragOverlay,
} from '@dnd-kit/core'
import { usePrefsStore, useTaskStore } from '@/store'
import { KanbanColumn } from './KanbanColumn'
import { TaskCard }     from './TaskCard'
import { TaskDetail }   from './TaskDetail'
import { WBSTable }     from './WBSTable'
import { TaskCreateDialog } from './TaskCreateDialog'
import { ChatPanel }    from '@/components/ChatPanel'
import type { Task, TaskStatus } from '@/types'

const COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'AT_RISK', 'BLOCKED', 'DONE']

export function TaskBoard() {
  const { tasks, updateTaskStatus } = useTaskStore()
  const activeProjectId = usePrefsStore(s => s.prefs.activeProjectId)
  const projectTasks = tasks.filter(task => task.projectId === activeProjectId)

  const [viewMode,       setViewMode]       = useState<'kanban' | 'wbs'>('kanban')
  const [activeTask,     setActiveTask]     = useState<Task | null>(null)
  const [selectedTask,   setSelectedTask]   = useState<Task | null>(null)
  const [filterStatus,   setFilterStatus]   = useState<TaskStatus | 'ALL'>('ALL')
  const [filterPriority, setFilterPriority] = useState<string>('ALL')
  const [search,         setSearch]         = useState('')
  const [showAiChat,     setShowAiChat]     = useState(false)
  const [createStatus,   setCreateStatus]   = useState<TaskStatus | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // Filtered tasks
  const filtered = useMemo(() => projectTasks.filter(t => {
    if (filterStatus !== 'ALL' && t.status !== filterStatus) return false
    if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [projectTasks, filterStatus, filterPriority, search])

  const byStatus = (status: TaskStatus) => filtered.filter(t => t.status === status)

  // Stats
  const stats = { total: projectTasks.length, done: projectTasks.filter(t => t.status === 'DONE').length }

  function handleDragStart(e: DragStartEvent) {
    const task = projectTasks.find(t => t.id === e.active.id)
    if (task) setActiveTask(task)
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = e
    if (!over) return

    const taskId = active.id as string
    const task   = projectTasks.find(t => t.id === taskId)
    if (!task) return

    // over.id can be a column status or another task id
    const newStatus = COLUMNS.includes(over.id as TaskStatus)
      ? (over.id as TaskStatus)
      : projectTasks.find(t => t.id === over.id)?.status

    if (newStatus && newStatus !== task.status) {
      updateTaskStatus(taskId, newStatus)
    }
  }

  function handleAddTask(status: TaskStatus) {
    setCreateStatus(status)
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: '#F4F7FB', overflow: 'hidden', position: 'relative',
    }}>
      {/* Toolbar */}
      <div style={{
        height: 52, background: '#FFFFFF', borderBottom: '1px solid #E5EAF2',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, flexShrink: 0,
        boxShadow: '0 1px 0 rgba(16,24,40,.04)',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, maxWidth: 260 }}>
          <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#98A2B3' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหา task..."
            style={{
              width: '100%', background: '#F8FAFC', border: '1px solid #E5EAF2',
              borderRadius: 8, padding: '7px 10px 7px 28px', fontSize: 12,
              color: '#172033', outline: 'none',
            }}
          />
        </div>

        {/* Priority filter */}
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          style={{
            background: '#F8FAFC', border: '1px solid #E5EAF2', borderRadius: 8,
            padding: '7px 10px', fontSize: 12, color: '#344054', cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="ALL">All Priority</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        <div style={{ flex: 1 }} />

        {/* Progress */}
        <div style={{ fontSize: 12, color: '#667085', fontWeight: 500 }}>
          <span style={{ color: '#059669', fontWeight: 700 }}>{stats.done}</span>
          <span> / {stats.total} done</span>
        </div>

        {/* Add task button */}
        {/* View toggle */}
        <div style={{ display:'flex', border:'1px solid #E5EAF2', borderRadius:8, overflow:'hidden' }}>
          {(['kanban','wbs'] as const).map(v => (
            <button key={v} onClick={() => setViewMode(v)} style={{
              padding:'6px 12px', fontSize:11, fontWeight:600, cursor:'pointer', border:'none',
              background: viewMode===v ? '#335CFF' : '#F8FAFC',
              color: viewMode===v ? '#fff' : '#667085',
              transition:'all .15s',
            }}>
              {v === 'kanban' ? '⬛ Kanban' : '≡ WBS'}
            </button>
          ))}
        </div>

        <button onClick={() => handleAddTask('TODO')} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg,#335CFF,#6D5CE7)',
          color: '#fff', fontSize: 12, fontWeight: 700,
          boxShadow: '0 4px 12px rgba(51,92,255,.2)',
        }}>
          + New Task
        </button>
      </div>

      {/* Main content */}
      {viewMode === 'wbs' ? (
        <WBSTable onOpenTask={setSelectedTask} />
      ) : (
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '16px 20px' }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div style={{ display: 'flex', gap: 14, height: '100%', minWidth: 'max-content' }}>
              {COLUMNS.map(status => (
                <div key={status} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
                  <KanbanColumn
                    status={status}
                    tasks={byStatus(status)}
                    onTaskClick={setSelectedTask}
                    onAddTask={handleAddTask}
                  />
                </div>
              ))}
            </div>
            <DragOverlay>
              {activeTask && <TaskCard task={activeTask} onClick={() => {}} />}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      <button onClick={() => setShowAiChat(open => !open)} style={{
        position: 'absolute', right: 20, bottom: 20, zIndex: 20,
        border: 'none', borderRadius: 22, padding: '10px 15px', cursor: 'pointer',
        background: 'linear-gradient(135deg,#335CFF,#6D5CE7)', color: '#FFFFFF',
        fontSize: 12, fontWeight: 700, boxShadow: '0 8px 20px rgba(51,92,255,.3)',
      }}>🤖 AI Agent</button>

      {showAiChat && (
        <div style={{ position: 'absolute', right: 20, bottom: 72, width: 380, zIndex: 20, borderRadius: 12, overflow: 'hidden', boxShadow: '0 16px 40px rgba(16,24,40,.2)' }}>
          <ChatPanel />
        </div>
      )}

      {/* Task detail panel */}
      {createStatus && <TaskCreateDialog projectId={activeProjectId} initialStatus={createStatus} onClose={() => setCreateStatus(null)} />}

      {selectedTask && (
        <TaskDetail
          task={projectTasks.find(t => t.id === selectedTask.id) ?? selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  )
}

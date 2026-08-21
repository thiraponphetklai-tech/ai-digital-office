'use client'
import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { TaskCard } from './TaskCard'
import type { Task, TaskStatus } from '@/types'

const COLUMN_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; border: string }> = {
  TODO:        { label: 'To Do',       color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
  IN_PROGRESS: { label: 'In Progress', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  BLOCKED:     { label: 'Blocked',     color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  AT_RISK:     { label: 'At Risk',     color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  DONE:        { label: 'Done',        color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
}

interface KanbanColumnProps {
  status:   TaskStatus
  tasks:    Task[]
  onTaskClick: (task: Task) => void
  onAddTask:   (status: TaskStatus) => void
}

export function KanbanColumn({ status, tasks, onTaskClick, onAddTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const cfg = COLUMN_CONFIG[status]

  return (
    <div style={{
      width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0,
    }}>
      {/* Column header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: cfg.color }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 8,
            background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
          }}>{tasks.length}</span>
        </div>
        <button
          onClick={() => onAddTask(status)}
          style={{
            width: 22, height: 22, borderRadius: 6, border: `1px solid ${cfg.border}`,
            background: cfg.bg, color: cfg.color, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, lineHeight: 1,
          }}
          title={`Add task to ${cfg.label}`}
        >+</button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1, minHeight: 80,
          background: isOver ? cfg.bg : 'transparent',
          border: isOver ? `2px dashed ${cfg.border}` : '2px dashed transparent',
          borderRadius: 10,
          padding: isOver ? 6 : 0,
          transition: 'all .15s',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </SortableContext>

        {tasks.length === 0 && !isOver && (
          <div style={{
            textAlign: 'center', padding: '20px 0',
            fontSize: 12, color: '#CBD5E1', fontStyle: 'italic',
          }}>
            No tasks
          </div>
        )}
      </div>
    </div>
  )
}

'use client'
import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '@/types'

const PRIORITY_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  LOW:      { bg: '#F9FAFB', text: '#6B7280', label: 'Low' },
  MEDIUM:   { bg: '#EFF6FF', text: '#2563EB', label: 'Medium' },
  HIGH:     { bg: '#FFFBEB', text: '#D97706', label: 'High' },
  CRITICAL: { bg: '#FEF2F2', text: '#DC2626', label: 'Critical' },
}

const STATUS_DOT: Record<string, string> = {
  TODO:        '#9CA3AF',
  IN_PROGRESS: '#2563EB',
  BLOCKED:     '#DC2626',
  AT_RISK:     '#D97706',
  DONE:        '#059669',
}

interface TaskCardProps {
  task: Task
  onClick: (task: Task) => void
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const pri = PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR.MEDIUM
  const dot = STATUS_DOT[task.status] ?? '#9CA3AF'

  const daysLeft = task.dueDate
    ? Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / 86400000)
    : null

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onClick(task)}
      style={{
        ...style,
        background: '#FFFFFF',
        border: '1px solid #E5EAF2',
        borderRadius: 10,
        padding: '10px 12px',
        cursor: 'grab',
        userSelect: 'none',
        boxShadow: isDragging ? '0 8px 24px rgba(16,24,40,.12)' : '0 1px 3px rgba(16,24,40,.04)',
        transition: 'box-shadow .15s',
      }}
    >
      {/* Priority badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
          background: pri.bg, color: pri.text, letterSpacing: '.04em',
        }}>{pri.label}</span>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} />
      </div>

      {/* Title */}
      <div style={{ fontSize: 13, fontWeight: 600, color: '#172033', marginBottom: 6, lineHeight: 1.4 }}>
        {task.title}
      </div>

      {/* Blocker */}
      {task.blocker && (
        <div style={{
          fontSize: 11, color: '#DC2626', background: '#FEF2F2',
          borderRadius: 6, padding: '3px 8px', marginBottom: 6,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span>⚠</span> {task.blocker}
        </div>
      )}

      {/* Progress bar */}
      {task.progress > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ height: 4, background: '#F1F5F9', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${task.progress}%`,
              background: task.progress === 100 ? '#059669' : '#335CFF',
              borderRadius: 2,
            }} />
          </div>
          <div style={{ fontSize: 10, color: '#98A2B3', marginTop: 3 }}>{task.progress}%</div>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Owner avatar */}
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          background: 'linear-gradient(135deg,#335CFF,#6D5CE7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 700, color: '#fff',
        }}>
          {task.ownerId.slice(-2).toUpperCase()}
        </div>

        {/* Due date */}
        {daysLeft !== null && (
          <span style={{
            fontSize: 10, fontWeight: 500,
            color: daysLeft < 0 ? '#DC2626' : daysLeft <= 1 ? '#D97706' : '#98A2B3',
          }}>
            {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
          </span>
        )}
      </div>
    </div>
  )
}

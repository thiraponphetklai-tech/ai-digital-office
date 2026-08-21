'use client'
import React, { useState } from 'react'
import { useTaskStore } from '@/store'
import type { Task, TaskStatus } from '@/types'

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'TODO',        label: '◯ To Do',       color: '#6B7280' },
  { value: 'IN_PROGRESS', label: '● In Progress',  color: '#2563EB' },
  { value: 'BLOCKED',     label: '✕ Blocked',      color: '#DC2626' },
  { value: 'AT_RISK',     label: '⚠ At Risk',      color: '#D97706' },
  { value: 'DONE',        label: '✓ Done',         color: '#059669' },
]

interface TaskDetailProps {
  task:    Task
  onClose: () => void
}

export function TaskDetail({ task, onClose }: TaskDetailProps) {
  const { updateTaskStatus, updateTaskProgress, setTaskBlocker } = useTaskStore()

  const [progress, setProgress] = useState(task.progress)
  const [blocker,  setBlocker]  = useState(task.blocker ?? '')
  const [showBlockerInput, setShowBlockerInput] = useState(false)

  function handleStatusChange(status: TaskStatus) {
    updateTaskStatus(task.id, status)
    if (status === 'BLOCKED' && !showBlockerInput) setShowBlockerInput(true)
  }

  function handleProgressSave() {
    updateTaskProgress(task.id, progress)
  }

  function handleBlockerSave() {
    if (!blocker.trim()) return
    setTaskBlocker(task.id, blocker.trim())
    setShowBlockerInput(false)
  }

  const daysLeft = task.dueDate
    ? Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / 86400000)
    : null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(16,24,40,.18)' }}
      />

      {/* Panel */}
      <div style={{
        position: 'relative', width: 400, height: '100vh',
        background: '#FFFFFF', borderLeft: '1px solid #E5EAF2',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '-8px 0 32px rgba(16,24,40,.1)',
        animation: 'slideIn .2s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #E5EAF2',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ flex: 1, marginRight: 12 }}>
            <div style={{ fontSize: 11, color: '#98A2B3', fontWeight: 500, marginBottom: 4 }}>
              {task.id} · {task.projectId}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#172033', lineHeight: 1.3 }}>
              {task.title}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 7, border: '1px solid #E5EAF2',
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: '#98A2B3', flexShrink: 0,
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Status */}
          <Section title="Status">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => handleStatusChange(opt.value)} style={{
                  fontSize: 11, fontWeight: 600, padding: '5px 11px', borderRadius: 7,
                  cursor: 'pointer', transition: 'all .1s',
                  background: task.status === opt.value ? opt.color : '#F8FAFC',
                  color: task.status === opt.value ? '#fff' : opt.color,
                  border: `1px solid ${task.status === opt.value ? opt.color : '#E5EAF2'}`,
                }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Blocker */}
          {(task.blocker || task.status === 'BLOCKED') && (
            <Section title="Blocker">
              {task.blocker && !showBlockerInput && (
                <div style={{
                  background: '#FEF2F2', border: '1px solid #FECACA',
                  borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#DC2626',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span>⚠ {task.blocker}</span>
                  <button onClick={() => setShowBlockerInput(true)} style={{
                    fontSize: 11, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer',
                  }}>Edit</button>
                </div>
              )}
              {showBlockerInput && (
                <div style={{ display: 'flex', gap: 7 }}>
                  <input
                    value={blocker}
                    onChange={e => setBlocker(e.target.value)}
                    placeholder="Describe the blocker..."
                    style={{
                      flex: 1, background: '#F8FAFC', border: '1px solid #D8DEE9',
                      borderRadius: 8, padding: '7px 10px', fontSize: 12, color: '#172033', outline: 'none',
                    }}
                  />
                  <button onClick={handleBlockerSave} style={{
                    padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: '#DC2626', color: '#fff', fontSize: 12, fontWeight: 600,
                  }}>Save</button>
                </div>
              )}
            </Section>
          )}

          {/* Progress */}
          <Section title="Progress">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="range" min={0} max={100} value={progress}
                onChange={e => setProgress(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#335CFF', minWidth: 36 }}>{progress}%</span>
              <button onClick={handleProgressSave} style={{
                padding: '5px 10px', borderRadius: 7, border: '1px solid #BFDBFE',
                background: '#EFF6FF', color: '#2563EB', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              }}>Save</button>
            </div>
            <div style={{ height: 5, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
              <div style={{
                height: '100%', width: `${progress}%`,
                background: progress === 100 ? '#059669' : '#335CFF',
                borderRadius: 3, transition: 'width .3s',
              }} />
            </div>
          </Section>

          {/* Meta info */}
          <Section title="Details">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <MetaRow label="Owner" value={task.ownerId} />
              <MetaRow label="Priority" value={task.priority} />
              <MetaRow label="Risk" value={task.riskLevel} />
              {task.dueDate && (
                <MetaRow
                  label="Due date"
                  value={new Date(task.dueDate).toLocaleDateString('th-TH')}
                  valueColor={daysLeft !== null && daysLeft < 0 ? '#DC2626' : daysLeft !== null && daysLeft <= 1 ? '#D97706' : undefined}
                />
              )}
              <MetaRow label="Last update" value={new Date(task.lastUpdatedAt).toLocaleString('th-TH')} />
            </div>
          </Section>

          {/* AI Assessment */}
          {task.aiRiskAssessment && (
            <Section title="AI Assessment">
              <div style={{
                background: '#F5F3FF', border: '1px solid #DDD6FE',
                borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#4C1D95', lineHeight: 1.6,
              }}>
                🤖 {task.aiRiskAssessment}
              </div>
            </Section>
          )}
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #E5EAF2', flexShrink: 0,
          display: 'flex', gap: 8,
        }}>
          <button style={{
            flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#335CFF,#6D5CE7)', color: '#fff',
            fontSize: 12, fontWeight: 600, boxShadow: '0 4px 12px rgba(51,92,255,.2)',
          }}>
            🤖 Ask AI
          </button>
          <button style={{
            flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
            background: '#F8FAFC', border: '1px solid #E5EAF2',
            color: '#667085', fontSize: 12, fontWeight: 600,
          }}>
            👤 Follow-up
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 800, color: '#98A2B3', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function MetaRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
      <span style={{ color: '#98A2B3', fontWeight: 500 }}>{label}</span>
      <span style={{ color: valueColor ?? '#344054', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

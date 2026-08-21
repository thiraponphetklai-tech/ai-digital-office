'use client'
import React, { useState } from 'react'
import { usePrefsStore, useTaskStore } from '@/store'
import type { Task, TaskStatus, TaskPriority } from '@/types'

const STATUS_CFG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  TODO:        { label: 'To Do',       color: '#6B7280', bg: '#F9FAFB' },
  IN_PROGRESS: { label: 'In Progress', color: '#2563EB', bg: '#EFF6FF' },
  BLOCKED:     { label: 'Blocked',     color: '#DC2626', bg: '#FEF2F2' },
  AT_RISK:     { label: 'At Risk',     color: '#D97706', bg: '#FFFBEB' },
  DONE:        { label: 'Done',        color: '#059669', bg: '#ECFDF5' },
}

const PRIORITY_CFG: Record<TaskPriority, { label: string; color: string }> = {
  LOW:      { label: 'Low',      color: '#6B7280' },
  MEDIUM:   { label: 'Medium',   color: '#2563EB' },
  HIGH:     { label: 'High',     color: '#D97706' },
  CRITICAL: { label: 'Critical', color: '#DC2626' },
}

type SortKey = 'title' | 'status' | 'priority' | 'progress' | 'dueDate' | 'ownerId'

export function WBSTable() {
  const { tasks, updateTaskStatus, updateTaskProgress } = useTaskStore()
  const activeProjectId = usePrefsStore(s => s.prefs.activeProjectId)
  const projectTasks = tasks.filter(task => task.projectId === activeProjectId)

  const [sortKey,  setSortKey]  = useState<SortKey>('status')
  const [sortAsc,  setSortAsc]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState<TaskStatus | 'ALL'>('ALL')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editing,  setEditing]  = useState<{ id: string; field: string } | null>(null)
  const [editVal,  setEditVal]  = useState('')

  // Sort + filter
  const sorted = [...projectTasks]
    .filter(t => {
      if (filter !== 'ALL' && t.status !== filter) return false
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      let av: string | number = a[sortKey] ?? ''
      let bv: string | number = b[sortKey] ?? ''
      if (sortKey === 'progress') { av = a.progress; bv = b.progress }
      if (sortKey === 'dueDate') { av = a.dueDate ?? ''; bv = b.dueDate ?? '' }
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(v => !v)
    else { setSortKey(key); setSortAsc(true) }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function startEdit(id: string, field: string, val: string) {
    setEditing({ id, field })
    setEditVal(val)
  }

  function commitEdit(task: Task) {
    if (!editing) return
    if (editing.field === 'status') {
      updateTaskStatus(task.id, editVal as TaskStatus)
    } else if (editing.field === 'progress') {
      updateTaskProgress(task.id, Number(editVal))
    }
    setEditing(null)
  }

  const daysLeft = (due?: string) => due
    ? Math.ceil((new Date(due).getTime() - Date.now()) / 86400000)
    : null

  const stats = {
    total:   projectTasks.length,
    done:    projectTasks.filter(t => t.status === 'DONE').length,
    blocked: projectTasks.filter(t => t.status === 'BLOCKED').length,
    avgProg: projectTasks.length > 0 ? Math.round(projectTasks.reduce((s, t) => s + t.progress, 0) / projectTasks.length) : 0,
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F4F7FB', overflow: 'hidden' }}>

      {/* Toolbar */}
      <div style={{
        height: 52, background: '#FFFFFF', borderBottom: '1px solid #E5EAF2',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, flexShrink: 0,
      }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#98A2B3' }}>🔍</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหา task..."
            style={{ background: '#F8FAFC', border: '1px solid #E5EAF2', borderRadius: 8, padding: '7px 10px 7px 28px', fontSize: 12, color: '#172033', outline: 'none', width: 200 }}
          />
        </div>

        <select value={filter} onChange={e => setFilter(e.target.value as any)} style={{ background: '#F8FAFC', border: '1px solid #E5EAF2', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: '#344054', outline: 'none', cursor: 'pointer' }}>
          <option value="ALL">All Status</option>
          {(Object.keys(STATUS_CFG) as TaskStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_CFG[s].label}</option>
          ))}
        </select>

        <div style={{ flex: 1 }} />

        {/* Summary chips */}
        {[
          { label: `${stats.done}/${stats.total} Done`, color: '#059669', bg: '#ECFDF5' },
          { label: `${stats.blocked} Blocked`, color: '#DC2626', bg: '#FEF2F2' },
          { label: `Avg ${stats.avgProg}%`, color: '#335CFF', bg: '#EFF6FF' },
        ].map(chip => (
          <span key={chip.label} style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8, background: chip.bg, color: chip.color }}>
            {chip.label}
          </span>
        ))}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E5EAF2', borderRadius: 12, overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 1180, borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E5EAF2' }}>
                <Th width={32} />
                <Th width={28} label="#" />
                <Th label="Task Name" sortKey="title" current={sortKey} asc={sortAsc} onSort={toggleSort} width={190} />
                <Th label="คำอธิบาย" width={280} />
                <Th label="Status" sortKey="status" current={sortKey} asc={sortAsc} onSort={toggleSort} width={130} />
                <Th label="Priority" sortKey="priority" current={sortKey} asc={sortAsc} onSort={toggleSort} width={95} />
                <Th label="Owner" sortKey="ownerId" current={sortKey} asc={sortAsc} onSort={toggleSort} width={80} />
                <Th label="Progress" sortKey="progress" current={sortKey} asc={sortAsc} onSort={toggleSort} width={140} />
                <Th label="Due Date" sortKey="dueDate" current={sortKey} asc={sortAsc} onSort={toggleSort} width={110} />
                <Th label="Risk" width={80} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((task, idx) => {
                const st  = STATUS_CFG[task.status]
                const pri = PRIORITY_CFG[task.priority]
                const dl  = daysLeft(task.dueDate)
                const exp = expanded.has(task.id)
                const isEditStatus   = editing?.id === task.id && editing.field === 'status'
                const isEditProgress = editing?.id === task.id && editing.field === 'progress'

                return (
                  <React.Fragment key={task.id}>
                    <tr style={{
                      borderBottom: '1px solid #F1F5F9',
                      background: idx % 2 === 0 ? '#FFFFFF' : '#FAFBFD',
                      transition: 'background .1s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F0F4FF')}
                      onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#FFFFFF' : '#FAFBFD')}
                    >
                      {/* Expand */}
                      <td style={{ padding: '10px 6px', textAlign: 'center', width: 32 }}>
                        {task.blocker || task.aiRiskAssessment ? (
                          <button onClick={() => toggleExpand(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#98A2B3', padding: 0 }}>
                            {exp ? '▼' : '▶'}
                          </button>
                        ) : null}
                      </td>

                      {/* Index */}
                      <td style={{ padding: '10px 6px', color: '#CBD5E1', fontWeight: 500, width: 28, textAlign: 'center' }}>
                        {idx + 1}
                      </td>

                      {/* Task name */}
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600, color: '#172033', marginBottom: task.blocker ? 3 : 0 }}>
                          {task.title}
                        </div>
                        {task.blocker && (
                          <div style={{ fontSize: 10, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 4 }}>
                            ⚠ {task.blocker}
                          </div>
                        )}
                      </td>

                      {/* Description */}
                      <td style={{ padding: '10px 12px', width: 280, color: '#667085', fontSize: 11, lineHeight: 1.45 }}>
                        {task.description ?? <span style={{ color: '#CBD5E1' }}>—</span>}
                      </td>

                      {/* Status — click to edit */}
                      <td style={{ padding: '10px 8px', width: 130 }}>
                        {isEditStatus ? (
                          <select
                            autoFocus
                            value={editVal}
                            onChange={e => setEditVal(e.target.value)}
                            onBlur={() => commitEdit(task)}
                            style={{ fontSize: 11, border: '1px solid #C7D7FF', borderRadius: 6, padding: '3px 6px', outline: 'none', background: '#fff' }}
                          >
                            {(Object.keys(STATUS_CFG) as TaskStatus[]).map(s => (
                              <option key={s} value={s}>{STATUS_CFG[s].label}</option>
                            ))}
                          </select>
                        ) : (
                          <span
                            onClick={() => startEdit(task.id, 'status', task.status)}
                            style={{
                              display: 'inline-block', fontSize: 11, fontWeight: 600,
                              padding: '3px 9px', borderRadius: 6,
                              background: st.bg, color: st.color,
                              cursor: 'pointer',
                            }}
                            title="Click to change status"
                          >
                            {st.label}
                          </span>
                        )}
                      </td>

                      {/* Priority */}
                      <td style={{ padding: '10px 8px', width: 95 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: pri.color }}>
                          {pri.label}
                        </span>
                      </td>

                      {/* Owner */}
                      <td style={{ padding: '10px 8px', width: 80 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: 'linear-gradient(135deg,#335CFF,#6D5CE7)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 8, fontWeight: 700, color: '#fff', flexShrink: 0,
                          }}>{task.ownerId.slice(-2).toUpperCase()}</div>
                          <span style={{ fontSize: 11, color: '#667085' }}>{task.ownerId}</span>
                        </div>
                      </td>

                      {/* Progress — click to edit */}
                      <td style={{ padding: '10px 8px', width: 140 }}>
                        {isEditProgress ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input
                              type="number" min={0} max={100}
                              autoFocus
                              value={editVal}
                              onChange={e => setEditVal(e.target.value)}
                              onBlur={() => commitEdit(task)}
                              onKeyDown={e => e.key === 'Enter' && commitEdit(task)}
                              style={{ width: 52, fontSize: 11, border: '1px solid #C7D7FF', borderRadius: 6, padding: '3px 6px', outline: 'none' }}
                            />
                            <span style={{ fontSize: 10, color: '#98A2B3' }}>%</span>
                          </div>
                        ) : (
                          <div onClick={() => startEdit(task.id, 'progress', String(task.progress))} style={{ cursor: 'pointer' }} title="Click to edit">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 10, color: task.progress === 100 ? '#059669' : '#335CFF', fontWeight: 600 }}>{task.progress}%</span>
                            </div>
                            <div style={{ height: 5, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', width: `${task.progress}%`,
                                background: task.progress === 100 ? '#059669' : '#335CFF',
                                borderRadius: 3, transition: 'width .3s',
                              }} />
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Due date */}
                      <td style={{ padding: '10px 8px', width: 110 }}>
                        {task.dueDate ? (
                          <span style={{
                            fontSize: 11, fontWeight: 500,
                            color: dl !== null && dl < 0 ? '#DC2626' : dl !== null && dl <= 1 ? '#D97706' : '#667085',
                          }}>
                            {new Date(task.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                            {dl !== null && (
                              <span style={{ display: 'block', fontSize: 10, marginTop: 1 }}>
                                {dl < 0 ? `${Math.abs(dl)}d overdue` : dl === 0 ? 'Due today' : `${dl}d left`}
                              </span>
                            )}
                          </span>
                        ) : <span style={{ color: '#CBD5E1', fontSize: 11 }}>—</span>}
                      </td>

                      {/* Risk */}
                      <td style={{ padding: '10px 8px', width: 80 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          color: task.riskLevel === 'HIGH' || task.riskLevel === 'CRITICAL' ? '#DC2626'
                            : task.riskLevel === 'MEDIUM' ? '#D97706' : '#98A2B3',
                        }}>
                          {task.riskLevel}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {exp && (
                      <tr style={{ background: '#FAFBFD', borderBottom: '1px solid #F1F5F9' }}>
                        <td colSpan={10} style={{ padding: '8px 48px 12px' }}>
                          <div style={{ display: 'flex', gap: 20 }}>
                            {task.aiRiskAssessment && (
                              <div style={{
                                background: '#F5F3FF', border: '1px solid #DDD6FE',
                                borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#4C1D95', flex: 1,
                              }}>
                                🤖 <strong>AI Assessment:</strong> {task.aiRiskAssessment}
                              </div>
                            )}
                            {task.aiSummary && (
                              <div style={{
                                background: '#F0FDF4', border: '1px solid #BBF7D0',
                                borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#065F46', flex: 1,
                              }}>
                                📝 <strong>Summary:</strong> {task.aiSummary}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>

          {sorted.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#CBD5E1', fontSize: 13 }}>
              ไม่พบ task ที่ตรงกับเงื่อนไข
            </div>
          )}
        </div>

        {/* WBS summary footer */}
        <div style={{
          marginTop: 12, background: '#FFFFFF', border: '1px solid #E5EAF2',
          borderRadius: 10, padding: '10px 16px',
          display: 'flex', gap: 24, alignItems: 'center',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#98A2B3', letterSpacing: '.08em' }}>WBS SUMMARY</span>
          {[
            { label: 'Total tasks', value: stats.total, color: '#344054' },
            { label: 'Completed',   value: stats.done,    color: '#059669' },
            { label: 'In progress', value: projectTasks.filter(t => t.status === 'IN_PROGRESS').length, color: '#2563EB' },
            { label: 'Blocked',     value: stats.blocked, color: '#DC2626' },
            { label: 'Avg progress',value: `${stats.avgProg}%`, color: '#335CFF' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#98A2B3', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Table header cell ────────────────────────────────────────────
function Th({ label, sortKey, current, asc, onSort, width, flex }: {
  label?: string; sortKey?: SortKey; current?: SortKey; asc?: boolean
  onSort?: (k: SortKey) => void; width?: number; flex?: boolean
}) {
  const active = sortKey && current === sortKey
  return (
    <th
      onClick={() => sortKey && onSort?.(sortKey)}
      style={{
        padding: '10px 8px', textAlign: 'left', fontSize: 10, fontWeight: 700,
        color: active ? '#335CFF' : '#98A2B3', letterSpacing: '.08em', textTransform: 'uppercase',
        cursor: sortKey ? 'pointer' : 'default', userSelect: 'none',
        width: flex ? undefined : width,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      {active && <span style={{ marginLeft: 4 }}>{asc ? '↑' : '↓'}</span>}
    </th>
  )
}

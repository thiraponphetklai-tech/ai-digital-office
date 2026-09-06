'use client'
import React, { useState } from 'react'
import { usePrefsStore, useResourceStore, useTaskStore } from '@/store'
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

type SortKey = 'title' | 'status' | 'priority' | 'progress' | 'dueDate' | 'ownerId' | 'makerId' | 'checkerId'

export function WBSTable({ onOpenTask }: { onOpenTask: (task: Task) => void }) {
  const { tasks, updateTaskStatus, updateTaskProgress, updateTaskDetails, setTasks } = useTaskStore()
  const { resources } = useResourceStore()
  const activeProjectId = usePrefsStore(s => s.prefs.activeProjectId)
  const projectTasks = tasks.filter(task => task.projectId === activeProjectId)

  const [sortKey,  setSortKey]  = useState<SortKey>('status')
  const [sortAsc,  setSortAsc]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState<TaskStatus | 'ALL'>('ALL')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editing,  setEditing]  = useState<{ id: string; field: string } | null>(null)
  const [editVal,  setEditVal]  = useState('')
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)

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
    } else if (editing.field === 'title' || editing.field === 'description' || editing.field === 'ownerId' || editing.field === 'makerId' || editing.field === 'checkerId' || editing.field === 'priority' || editing.field === 'dueDate') {
      const value = editing.field === 'title' ? editVal.trim() : editVal
      if (editing.field !== 'title' || value) updateTaskDetails(task.id, { [editing.field]: value } as Partial<Task>)
    }
    setEditing(null)
  }

  function savePlanning(task: Task, form: HTMLFormElement) {
    const data = new FormData(form)
    updateTaskDetails(task.id, {
      plannedStartDate: String(data.get('plannedStartDate') || ''),
      plannedEndDate: String(data.get('plannedEndDate') || ''),
      estimatedHours: data.get('estimatedHours') ? Number(data.get('estimatedHours')) : undefined,
      actualHours: data.get('actualHours') ? Number(data.get('actualHours')) : undefined,
    })
    setEditing(null)
  }

  async function deleteTask(task: Task) {
    if (!window.confirm(`Delete task “${task.title}”? This cannot be undone.`)) return
    setDeletingTaskId(task.id)
    try {
      const response = await fetch(`/api/tasks/${encodeURIComponent(task.id)}`, { method: 'DELETE' })
      const result = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Unable to delete task.')
      setTasks(tasks.filter(item => item.id !== task.id))
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to delete task.')
    } finally {
      setDeletingTaskId(null)
    }
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
          <table style={{ width: '100%', minWidth: 1580, borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E5EAF2' }}>
                <Th width={32} />
                <Th width={28} label="#" />
                <Th label="Task Name" sortKey="title" current={sortKey} asc={sortAsc} onSort={toggleSort} width={190} />
                <Th label="คำอธิบาย" width={280} />
                <Th label="Status" sortKey="status" current={sortKey} asc={sortAsc} onSort={toggleSort} width={130} />
                <Th label="Priority" sortKey="priority" current={sortKey} asc={sortAsc} onSort={toggleSort} width={95} />
                <Th label="Owner" sortKey="ownerId" current={sortKey} asc={sortAsc} onSort={toggleSort} width={80} />
                <Th label="Maker" sortKey="makerId" current={sortKey} asc={sortAsc} onSort={toggleSort} width={105} />
                <Th label="Checker" sortKey="checkerId" current={sortKey} asc={sortAsc} onSort={toggleSort} width={105} />
                <Th label="Progress" sortKey="progress" current={sortKey} asc={sortAsc} onSort={toggleSort} width={140} />
                <Th label="Planning" width={150} />
                <Th label="Due Date" sortKey="dueDate" current={sortKey} asc={sortAsc} onSort={toggleSort} width={110} />
                <Th label="Risk" width={80} />
                <Th label="" width={58} />
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
                const isEditTitle    = editing?.id === task.id && editing.field === 'title'
                const isEditDescription = editing?.id === task.id && editing.field === 'description'
                const isEditPriority = editing?.id === task.id && editing.field === 'priority'
                const isEditOwner    = editing?.id === task.id && editing.field === 'ownerId'
                const isEditMaker    = editing?.id === task.id && editing.field === 'makerId'
                const isEditChecker  = editing?.id === task.id && editing.field === 'checkerId'
                const isEditDueDate  = editing?.id === task.id && editing.field === 'dueDate'
                const isEditPlanning = editing?.id === task.id && editing.field === 'planning'
                const owner = resources.find(resource => resource.id === task.ownerId)
                const ownerName = owner?.name ?? task.ownerId
                const ownerNames = [task.ownerId, ...(task.assigneeIds ?? []).filter(id => id !== task.ownerId)].map(id => resources.find(resource => resource.id === id)?.name ?? id)

                return (
                  <React.Fragment key={task.id}>
                    <tr style={{
                      borderBottom: '1px solid #F1F5F9',
                      background: idx % 2 === 0 ? '#FFFFFF' : '#FAFBFD',
                      transition: 'background .1s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F0F4FF')}
                      onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#FFFFFF' : '#FAFBFD')}
                      onDoubleClick={() => onOpenTask(task)}
                      title="Double-click to open task detail"
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
                        {isEditTitle ? <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={() => commitEdit(task)} onKeyDown={e => { if (e.key === 'Enter') commitEdit(task); if (e.key === 'Escape') setEditing(null) }} style={{ width:'100%', fontWeight:600, fontSize:12, border:'1px solid #C7D7FF', borderRadius:6, padding:'4px 6px', outline:'none' }} /> : <div onClick={() => startEdit(task.id, 'title', task.title)} title="Click to edit task name" style={{ fontWeight: 600, color: '#172033', marginBottom: task.blocker ? 3 : 0, cursor:'pointer' }}>
                          {task.title}
                        </div>}

                        {task.blocker && (
                          <div style={{ fontSize: 10, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 4 }}>
                            ⚠ {task.blocker}
                          </div>
                        )}
                      </td>

                      {/* Description */}
                      <td style={{ padding: '10px 12px', width: 280, color: '#667085', fontSize: 11, lineHeight: 1.45 }}>
                        {isEditDescription ? <textarea autoFocus value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={() => commitEdit(task)} onKeyDown={e => { if (e.key === 'Escape') setEditing(null); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) commitEdit(task) }} placeholder="Add description" style={{ width:'100%', minHeight:48, resize:'vertical', fontSize:11, border:'1px solid #C7D7FF', borderRadius:6, padding:'5px 6px', outline:'none' }} /> : <div onClick={() => startEdit(task.id, 'description', task.description ?? '')} title="Click to edit description" style={{ cursor:'pointer', minHeight:16 }}>{task.description || <span style={{ color: '#CBD5E1' }}>Click to add description</span>}</div>}
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
                        {isEditPriority ? <select autoFocus value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={() => commitEdit(task)} style={{ fontSize:11, border:'1px solid #C7D7FF', borderRadius:6, padding:'3px 5px', outline:'none', background:'#fff' }}>{(Object.keys(PRIORITY_CFG) as TaskPriority[]).map(priority => <option key={priority} value={priority}>{PRIORITY_CFG[priority].label}</option>)}</select> : <span onClick={() => startEdit(task.id, 'priority', task.priority)} title="Click to edit priority" style={{ fontSize: 11, fontWeight: 600, color: pri.color, cursor:'pointer' }}>{pri.label}</span>}
                      </td>

                      {/* Owner */}
                      <td style={{ padding: '10px 8px', width: 80 }}>
                        {isEditOwner ? <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={() => commitEdit(task)} onKeyDown={e => { if (e.key === 'Enter') commitEdit(task); if (e.key === 'Escape') setEditing(null) }} style={{ width:'100%', fontSize:11, border:'1px solid #C7D7FF', borderRadius:6, padding:'4px 5px', outline:'none' }} /> : <div onClick={() => startEdit(task.id, 'ownerId', task.ownerId)} title="Click to edit owners in task detail" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor:'pointer' }}><div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#335CFF,#6D5CE7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{ownerName.slice(0, 2).toUpperCase()}</div><span style={{ fontSize: 11, color: '#667085', lineHeight:1.35 }}>{ownerNames.join(', ')}</span></div>}
                      </td>

                      {/* Maker */}
                      <td style={{ padding:'10px 8px', width:105 }}>
                        {isEditMaker ? <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={() => commitEdit(task)} onKeyDown={e => { if (e.key === 'Enter') commitEdit(task); if (e.key === 'Escape') setEditing(null) }} placeholder="Resource ID" style={{ width:'100%', fontSize:11, border:'1px solid #C7D7FF', borderRadius:6, padding:'4px 5px', outline:'none' }} /> : <div onClick={() => startEdit(task.id, 'makerId', task.makerId ?? '')} title="Click to assign maker" style={{ cursor:'pointer', fontSize:11, color:task.makerId ? '#344054' : '#CBD5E1', minHeight:16 }}>{task.makerId || 'Assign maker'}</div>}
                      </td>

                      {/* Checker */}
                      <td style={{ padding:'10px 8px', width:105 }}>
                        {isEditChecker ? <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={() => commitEdit(task)} onKeyDown={e => { if (e.key === 'Enter') commitEdit(task); if (e.key === 'Escape') setEditing(null) }} placeholder="Resource ID" style={{ width:'100%', fontSize:11, border:'1px solid #C7D7FF', borderRadius:6, padding:'4px 5px', outline:'none' }} /> : <div onClick={() => startEdit(task.id, 'checkerId', task.checkerId ?? '')} title="Click to assign checker" style={{ cursor:'pointer', fontSize:11, color:task.checkerId ? '#344054' : '#CBD5E1', minHeight:16 }}>{task.checkerId || 'Assign checker'}</div>}
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

                      {/* Planning */}
                      <td style={{ padding: '10px 8px', width: 150, color:'#667085', fontSize:10, lineHeight:1.45 }}>
                        {isEditPlanning ? <form onSubmit={e => { e.preventDefault(); savePlanning(task, e.currentTarget) }} style={{ display:'grid', gap:4 }}><input name="plannedStartDate" type="date" defaultValue={task.plannedStartDate ?? ''} title="Planned start" style={{ fontSize:10, border:'1px solid #C7D7FF', borderRadius:5, padding:3 }} /><input name="plannedEndDate" type="date" defaultValue={task.plannedEndDate ?? ''} title="Planned end" style={{ fontSize:10, border:'1px solid #C7D7FF', borderRadius:5, padding:3 }} /><div style={{ display:'flex', gap:3 }}><input name="estimatedHours" type="number" min={0} step="0.5" defaultValue={task.estimatedHours ?? ''} placeholder="Est. h" style={{ width:'50%', fontSize:10, border:'1px solid #C7D7FF', borderRadius:5, padding:3 }} /><input name="actualHours" type="number" min={0} step="0.5" defaultValue={task.actualHours ?? ''} placeholder="Actual h" style={{ width:'50%', fontSize:10, border:'1px solid #C7D7FF', borderRadius:5, padding:3 }} /></div><div style={{ display:'flex', gap:4 }}><button type="submit" style={{ border:'none', borderRadius:5, padding:'3px 6px', cursor:'pointer', background:'#335CFF', color:'#fff', fontSize:10, fontWeight:700 }}>Save</button><button type="button" onClick={() => setEditing(null)} style={{ border:'1px solid #D8DEE9', borderRadius:5, padding:'3px 6px', cursor:'pointer', background:'#fff', color:'#667085', fontSize:10 }}>Cancel</button></div></form> : <div onClick={() => startEdit(task.id, 'planning', '')} title="Click to edit planning" style={{ cursor:'pointer' }}>{task.plannedStartDate || task.plannedEndDate ? <><div>{task.plannedStartDate ? new Date(task.plannedStartDate).toLocaleDateString('th-TH', { day:'numeric', month:'short' }) : '—'} → {task.plannedEndDate ? new Date(task.plannedEndDate).toLocaleDateString('th-TH', { day:'numeric', month:'short' }) : '—'}</div><strong style={{ color:'#4F46E5' }}>{task.estimatedHours ?? 0}h est. · {task.actualHours ?? 0}h actual</strong></> : <span style={{ color:'#CBD5E1' }}>Click to plan</span>}</div>}
                      </td>

                      {/* Due date */}
                      <td style={{ padding: '10px 8px', width: 110 }}>
                        {isEditDueDate ? <input autoFocus type="date" value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={() => commitEdit(task)} onKeyDown={e => { if (e.key === 'Enter') commitEdit(task); if (e.key === 'Escape') setEditing(null) }} style={{ width:'100%', fontSize:10, border:'1px solid #C7D7FF', borderRadius:6, padding:'3px', outline:'none' }} /> : <div onClick={() => startEdit(task.id, 'dueDate', task.dueDate ?? '')} title="Click to edit due date" style={{ cursor:'pointer', minHeight:16 }}>{task.dueDate ? <span style={{ fontSize: 11, fontWeight: 500, color: dl !== null && dl < 0 ? '#DC2626' : dl !== null && dl <= 1 ? '#D97706' : '#667085' }}>{new Date(task.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}{dl !== null && <span style={{ display: 'block', fontSize: 10, marginTop: 1 }}>{dl < 0 ? `${Math.abs(dl)}d overdue` : dl === 0 ? 'Due today' : `${dl}d left`}</span>}</span> : <span style={{ color: '#CBD5E1', fontSize: 11 }}>Click to set</span>}</div>}
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
                      <td style={{ padding:'10px 8px', width:58, textAlign:'center' }}>
                        <button type="button" onClick={() => void deleteTask(task)} disabled={deletingTaskId === task.id} aria-label={`Delete ${task.title}`} title="Delete task" style={{ border:'1px solid #FECACA', borderRadius:6, padding:'4px 6px', cursor:deletingTaskId === task.id ? 'not-allowed' : 'pointer', background:'#FFF5F5', color:'#B91C1C', fontSize:11, opacity:deletingTaskId === task.id ? .55 : 1 }}>{deletingTaskId === task.id ? '…' : 'Delete'}</button>
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {exp && (
                      <tr style={{ background: '#FAFBFD', borderBottom: '1px solid #F1F5F9' }}>
                        <td colSpan={14} style={{ padding: '8px 48px 12px' }}>
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

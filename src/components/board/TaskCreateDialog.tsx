'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useProjectStore, useResourceStore, useTaskStore } from '@/store'
import type { Resource, Task, TaskPriority, TaskStatus } from '@/types'

interface TaskCreateDialogProps {
  projectId: string
  initialStatus: TaskStatus
  onClose: () => void
}

export function TaskCreateDialog({ projectId, initialStatus, onClose }: TaskCreateDialogProps) {
  const addTask = useTaskStore(state => state.addTask)
  const resources = useResourceStore(state => state.resources)
  const project = useProjectStore(state => state.projects.find(item => item.id === projectId))
  const localResources = useMemo(
    () => resources.filter(resource => resource.active && (project?.resourceIds?.includes(resource.id) ?? true)),
    [project?.resourceIds, resources],
  )
  const [availableResources, setAvailableResources] = useState<Resource[]>(localResources)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ownerId, setOwnerId] = useState(localResources[0]?.id ?? '')
  const [teamId, setTeamId] = useState('general')
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM')
  const [dueDate, setDueDate] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    void fetch(`/api/projects/${encodeURIComponent(projectId)}/resources`).then(response => response.ok ? response.json() : null).then((items: Resource[] | null) => {
      if (cancelled || !Array.isArray(items)) return
      setAvailableResources(items)
      setOwnerId(current => items.some(resource => resource.id === current) ? current : (items[0]?.id ?? ''))
    })
    return () => { cancelled = true }
  }, [projectId])

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ownerId) {
      setError('Please select an owner before creating the task.')
      return
    }

    setIsSaving(true)
    setError('')
    const draft = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      ownerId,
      assigneeIds: [ownerId],
      teamId: teamId.trim() || 'general',
      status: initialStatus,
      priority,
      riskLevel: 'NONE' as const,
      progress: initialStatus === 'DONE' ? 100 : 0,
      dueDate: dueDate || undefined,
    }

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const result = await response.json().catch(() => ({})) as Task & { error?: string }
      if (!response.ok) throw new Error(result.error || 'Unable to create task.')
      addTask(result)
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create task.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div style={overlayStyle}>
      <form onSubmit={createTask} style={dialogStyle}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start' }}>
          <div><div style={{ color: '#4F46E5', fontSize: 11, fontWeight: 800, letterSpacing: '.08em' }}>NEW TASK</div><h2 style={{ margin: '6px 0 0', fontSize: 20 }}>Add task to {project?.name ?? 'project'}</h2></div>
          <button type="button" onClick={onClose} disabled={isSaving} style={closeStyle}>×</button>
        </header>
        <label style={labelStyle}>Task title *<input required autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Prepare UAT environment" style={inputStyle} /></label>
        <label style={labelStyle}>Description<textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Optional task details" style={{ ...inputStyle, minHeight: 74, resize: 'vertical' }} /></label>
        <div style={gridStyle}>
          <label style={labelStyle}>Owner *<select required value={ownerId} onChange={event => setOwnerId(event.target.value)} style={inputStyle}><option value="" disabled>Select owner</option>{availableResources.map(resource => <option key={resource.id} value={resource.id}>{resource.name} · {resource.role}</option>)}</select></label>
          <label style={labelStyle}>Team<input required value={teamId} onChange={event => setTeamId(event.target.value)} style={inputStyle} /></label>
          <label style={labelStyle}>Priority<select value={priority} onChange={event => setPriority(event.target.value as TaskPriority)} style={inputStyle}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></label>
          <label style={labelStyle}>Due date<input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} style={inputStyle} /></label>
        </div>
        {error && <p style={{ margin: '4px 0 0', color: '#B91C1C', fontSize: 12 }}>{error}</p>}
        <footer style={{ display: 'flex', justifyContent: 'end', gap: 8, marginTop: 22 }}>
          <button type="button" disabled={isSaving} onClick={onClose} style={secondaryStyle}>Cancel</button>
          <button type="submit" disabled={isSaving || !availableResources.length} style={{ ...primaryStyle, opacity: isSaving || !availableResources.length ? .7 : 1 }}>{isSaving ? 'Creating...' : 'Create Task'}</button>
        </footer>
      </form>
    </div>
  )
}

const overlayStyle = { position: 'fixed' as const, inset: 0, zIndex: 110, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(15,23,42,.38)' }
const dialogStyle = { width: 'min(560px, 100%)', background: '#FFFFFF', borderRadius: 16, padding: 24, boxShadow: '0 24px 64px rgba(15,23,42,.26)' }
const gridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
const labelStyle = { display: 'block', marginTop: 14, color: '#475467', fontSize: 12, fontWeight: 700 }
const inputStyle = { display: 'block', width: '100%', marginTop: 6, border: '1px solid #D8DEE9', borderRadius: 8, padding: '9px 10px', color: '#172033', background: '#FFFFFF', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' as const }
const primaryStyle = { border: 'none', borderRadius: 8, padding: '9px 14px', cursor: 'pointer', background: 'linear-gradient(135deg,#335CFF,#6D5CE7)', color: '#FFFFFF', fontSize: 12, fontWeight: 800 }
const secondaryStyle = { border: '1px solid #D8DEE9', borderRadius: 8, padding: '9px 14px', cursor: 'pointer', background: '#FFFFFF', color: '#475467', fontSize: 12, fontWeight: 700 }
const closeStyle = { width: 28, height: 28, border: '1px solid #E5EAF2', borderRadius: 7, background: '#FFFFFF', cursor: 'pointer', color: '#667085', fontSize: 20, lineHeight: 1 }

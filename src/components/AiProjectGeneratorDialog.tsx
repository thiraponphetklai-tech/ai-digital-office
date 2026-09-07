'use client'

import { useState } from 'react'
import { useResourceStore } from '@/store'
import type { Project, TaskPriority } from '@/types'

type DraftTask = { id: string; title: string; description: string; ownerId: string; dueDate: string; priority: TaskPriority }
type Draft = { auditId: string; name: string; code: string; description: string; targetDate: string; tasks: DraftTask[] }

export function AiProjectGeneratorDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (project: Project, tasks: DraftTask[]) => void }) {
  const resources = useResourceStore(state => state.resources).filter(resource => resource.active)
  const [goal, setGoal] = useState('')
  const [scope, setScope] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [ownerIds, setOwnerIds] = useState<string[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const updateTask = (index: number, updates: Partial<DraftTask>) => setDraft(current => current ? { ...current, tasks: current.tasks.map((task, taskIndex) => taskIndex === index ? { ...task, ...updates } : task) } : current)

  async function generate() {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/ai/project-draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal, scope, targetDate, ownerIds }) })
      const result = await response.json().catch(() => ({})) as Draft & { error?: string }
      if (!response.ok) throw new Error(result.error || 'Unable to generate a draft.')
      setDraft(result)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to generate a draft.') } finally { setBusy(false) }
  }

  async function confirm() {
    if (!draft) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: `project-${crypto.randomUUID()}`, name: draft.name.trim(), code: draft.code.trim().toUpperCase() || undefined, description: draft.description.trim() || undefined, startDate: new Date().toISOString().slice(0, 10), targetDate: draft.targetDate, status: 'ACTIVE', tasks: draft.tasks, aiGenerated: true, aiDraftAuditId: draft.auditId }) })
      const result = await response.json().catch(() => ({})) as Project & { error?: string }
      if (!response.ok) throw new Error(result.error || 'Unable to create project.')
      onCreated(result, draft.tasks)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to create project.') } finally { setBusy(false) }
  }

  return <div style={overlayStyle}>
    <section style={dialogStyle}>
      <div style={headingStyle}><div><h2 style={{ margin: 0 }}>✨ Generate project with AI</h2><p style={hintStyle}>AI creates a draft only. Review and edit every field before confirmation.</p></div><button onClick={onClose} disabled={busy} style={closeStyle}>×</button></div>
      {!draft ? <>
        <label style={labelStyle}>Goal *<textarea autoFocus value={goal} onChange={event => setGoal(event.target.value)} maxLength={1200} placeholder="What outcome should this project achieve?" style={{ ...inputStyle, minHeight: 78 }} /></label>
        <label style={labelStyle}>Scope<textarea value={scope} onChange={event => setScope(event.target.value)} maxLength={1600} placeholder="In scope, key constraints, or useful context" style={{ ...inputStyle, minHeight: 64 }} /></label>
        <label style={labelStyle}>Target date *<input type="date" value={targetDate} onChange={event => setTargetDate(event.target.value)} style={inputStyle} /></label>
        <fieldset style={fieldsetStyle}><legend style={{ fontSize: 12, fontWeight: 700 }}>Team / task owners *</legend><div style={ownerGridStyle}>{resources.map(resource => <label key={resource.id} style={ownerStyle}><input type="checkbox" checked={ownerIds.includes(resource.id)} onChange={() => setOwnerIds(current => current.includes(resource.id) ? current.filter(id => id !== resource.id) : [...current, resource.id])} /> {resource.name} <small>({resource.role})</small></label>)}</div></fieldset>
        <button onClick={generate} disabled={busy || !goal.trim() || !targetDate || ownerIds.length === 0} style={{ ...primaryStyle, opacity: busy || !goal.trim() || !targetDate || ownerIds.length === 0 ? .6 : 1 }}>{busy ? 'Generating…' : 'Generate draft'}</button>
      </> : <>
        <label style={labelStyle}>Project name *<input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} style={inputStyle} /></label>
        <label style={labelStyle}>Project code<input value={draft.code} onChange={event => setDraft({ ...draft, code: event.target.value })} style={inputStyle} /></label>
        <label style={labelStyle}>Description<textarea value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} style={{ ...inputStyle, minHeight: 58 }} /></label>
        <label style={labelStyle}>Target date *<input type="date" value={draft.targetDate} onChange={event => setDraft({ ...draft, targetDate: event.target.value })} style={inputStyle} /></label>
        <h3 style={{ margin: '18px 0 8px', fontSize: 15 }}>Tasks to create ({draft.tasks.length})</h3>
        <div style={{ display: 'grid', gap: 10 }}>{draft.tasks.map((task, index) => <div key={`${task.title}-${index}`} style={taskStyle}><input value={task.title} onChange={event => updateTask(index, { title: event.target.value })} aria-label="Task title" style={inputStyle} /><textarea value={task.description} onChange={event => updateTask(index, { description: event.target.value })} aria-label="Task description" style={{ ...inputStyle, minHeight: 48 }} /><div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 105px', gap: 8 }}><select value={task.ownerId} onChange={event => updateTask(index, { ownerId: event.target.value })} style={inputStyle}>{resources.filter(resource => ownerIds.includes(resource.id)).map(resource => <option key={resource.id} value={resource.id}>{resource.name}</option>)}</select><input type="date" value={task.dueDate} onChange={event => updateTask(index, { dueDate: event.target.value })} style={inputStyle} /><select value={task.priority} onChange={event => updateTask(index, { priority: event.target.value as TaskPriority })} style={inputStyle}>{(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as TaskPriority[]).map(priority => <option key={priority}>{priority}</option>)}</select></div></div>)}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'end', marginTop: 18 }}><button onClick={() => setDraft(null)} disabled={busy} style={secondaryStyle}>Back</button><button onClick={confirm} disabled={busy || !draft.name.trim() || draft.tasks.some(task => !task.title.trim() || !task.ownerId || !task.dueDate)} style={{ ...primaryStyle, opacity: busy ? .6 : 1 }}>{busy ? 'Creating…' : 'Confirm & Create'}</button></div>
      </>}
      {error && <p style={{ color: '#B42318', fontSize: 12, margin: '12px 0 0' }}>{error}</p>}
    </section>
  </div>
}

const overlayStyle = { position: 'fixed' as const, inset: 0, zIndex: 80, overflow: 'auto' as const, background: 'rgba(15,23,42,.52)', padding: 20 }
const dialogStyle = { width: 'min(760px, 100%)', margin: '30px auto', background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 24px 64px rgba(15,23,42,.3)' }
const headingStyle = { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start' }
const hintStyle = { margin: '5px 0 20px', color: '#667085', fontSize: 12, lineHeight: 1.5 }
const closeStyle = { width: 28, height: 28, border: '1px solid #E5EAF2', borderRadius: 7, background: '#fff', cursor: 'pointer', color: '#667085', fontSize: 20, lineHeight: 1 }
const inputStyle = { width: '100%', marginTop: 6, border: '1px solid #D8DEE9', borderRadius: 8, padding: '9px 10px', color: '#172033', background: '#fff', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }
const labelStyle = { display: 'block', marginBottom: 13, color: '#475467', fontSize: 12, fontWeight: 700 }
const fieldsetStyle = { border: '1px solid #E5EAF2', borderRadius: 8, margin: '0 0 16px', padding: '10px 12px' }
const ownerGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 6, marginTop: 7 }
const ownerStyle = { fontSize: 12, color: '#344054' }
const taskStyle = { border: '1px solid #E5EAF2', borderRadius: 10, padding: 10, background: '#FAFBFF' }
const primaryStyle = { border: 'none', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', background: 'linear-gradient(135deg,#335CFF,#6D5CE7)', color: '#fff', fontSize: 12, fontWeight: 800 }
const secondaryStyle = { border: '1px solid #D8DEE9', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', background: '#fff', color: '#475467', fontSize: 12, fontWeight: 700 }

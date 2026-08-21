'use client'

import { useMemo, useState } from 'react'
import { usePrefsStore, useProjectStore, useTaskStore } from '@/store'
import { downloadTasksCsv } from './exportCsv'
import type { Project, Task, TaskPriority, TaskStatus } from '@/types'

const statuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'AT_RISK', 'BLOCKED', 'DONE']
const priorities: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

function newProject(): Project {
  const id = `project-${Date.now()}`
  const date = new Date().toISOString().slice(0, 10)
  return {
    id,
    name: `New Project ${new Date().toLocaleDateString('en-CA')}`,
    description: 'Created from Work Sheet',
    teamIds: [],
    memberIds: [],
    startDate: date,
    targetDate: date,
    status: 'ACTIVE',
  }
}

export function WorksheetTable() {
  const { projects, addProject } = useProjectStore()
  const { prefs, setActiveProject } = usePrefsStore()
  const { tasks, addTask, updateTaskDetails, updateTaskProgress, updateTaskStatus, setTaskBlocker } = useTaskStore()
  const [search, setSearch] = useState('')

  const activeProject = projects.find(project => project.id === prefs.activeProjectId) ?? projects[0]
  const projectTasks = useMemo(() => tasks.filter(task =>
    task.projectId === activeProject?.id && task.title.toLowerCase().includes(search.toLowerCase())
  ), [activeProject?.id, search, tasks])

  if (!activeProject) return null

  function addProjectAndSelect() {
    const project = newProject()
    addProject(project)
    setActiveProject(project.id)
  }

  function addRow() {
    const task: Task = {
      id: `T-${Date.now()}`,
      projectId: activeProject.id,
      title: 'New task',
      ownerId: '',
      teamId: '',
      status: 'TODO',
      priority: 'MEDIUM',
      progress: 0,
      riskLevel: 'NONE',
      lastUpdatedAt: new Date().toISOString(),
    }
    addTask(task)
  }

  function updateText(task: Task, field: 'title' | 'description' | 'ownerId' | 'teamId' | 'dueDate', value: string) {
    updateTaskDetails(task.id, { [field]: value || undefined })
  }

  return (
    <main style={{ minHeight: '100vh', background: '#F4F7FB', color: '#172033', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ height: 58, background: '#FFFFFF', borderBottom: '1px solid #E5EAF2', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 14 }}>
        <a href="/" style={{ color: '#4F46E5', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>← Digital Office</a>
        <div style={{ width: 1, height: 20, background: '#E5EAF2' }} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Work Sheet</div>
          <div style={{ fontSize: 10, color: '#667085' }}>Basic project spreadsheet</div>
        </div>
        <div style={{ flex: 1 }} />
        <select value={activeProject.id} onChange={event => setActiveProject(event.target.value)} style={selectStyle}>
          {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <button onClick={addProjectAndSelect} style={secondaryButtonStyle}>+ New Project</button>
        <button onClick={() => downloadTasksCsv(activeProject.name, projectTasks)} style={primaryButtonStyle}>⇩ Export CSV</button>
      </header>

      <section style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'end', gap: 14, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22 }}>{activeProject.name}</h1>
            <p style={{ margin: '4px 0 0', color: '#667085', fontSize: 12 }}>{projectTasks.length} task{projectTasks.length === 1 ? '' : 's'} · Changes sync with the project task store.</p>
          </div>
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search task..." style={{ ...inputStyle, width: 220 }} />
          <button onClick={addRow} style={primaryButtonStyle}>+ Add Row</button>
        </div>

        <div style={{ background: '#FFFFFF', border: '1px solid #E5EAF2', borderRadius: 12, overflow: 'auto', boxShadow: '0 2px 8px rgba(16,24,40,.04)' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 1380, width: '100%', fontSize: 12 }}>
            <thead><tr style={{ background: '#F8FAFC' }}>
              {['Task ID', 'Task name', 'คำอธิบาย', 'Owner', 'Team', 'Status', 'Priority', 'Progress', 'Due date', 'Blocker'].map(label => (
                <th key={label} style={headerCellStyle}>{label}</th>
              ))}
            </tr></thead>
            <tbody>
              {projectTasks.map(task => (
                <tr key={task.id} style={{ borderTop: '1px solid #EEF2F7' }}>
                  <td style={cellStyle}><code>{task.id}</code></td>
                  <td style={cellStyle}><input value={task.title} onChange={event => updateText(task, 'title', event.target.value)} style={cellInputStyle} /></td>
                  <td style={{ ...cellStyle, minWidth: 260, whiteSpace: 'normal' }}><input value={task.description ?? ''} onChange={event => updateText(task, 'description', event.target.value)} placeholder="รายละเอียดงาน" style={cellInputStyle} /></td>
                  <td style={cellStyle}><input value={task.ownerId} onChange={event => updateText(task, 'ownerId', event.target.value)} style={cellInputStyle} /></td>
                  <td style={cellStyle}><input value={task.teamId} onChange={event => updateText(task, 'teamId', event.target.value)} style={cellInputStyle} /></td>
                  <td style={cellStyle}><select value={task.status} onChange={event => updateTaskStatus(task.id, event.target.value as TaskStatus)} style={cellInputStyle}>{statuses.map(status => <option key={status}>{status}</option>)}</select></td>
                  <td style={cellStyle}><select value={task.priority} onChange={event => updateTaskDetails(task.id, { priority: event.target.value as TaskPriority })} style={cellInputStyle}>{priorities.map(priority => <option key={priority}>{priority}</option>)}</select></td>
                  <td style={cellStyle}><input type="number" min={0} max={100} value={task.progress} onChange={event => updateTaskProgress(task.id, Number(event.target.value))} style={{ ...cellInputStyle, width: 74 }} />%</td>
                  <td style={cellStyle}><input type="date" value={task.dueDate ?? ''} onChange={event => updateText(task, 'dueDate', event.target.value)} style={cellInputStyle} /></td>
                  <td style={cellStyle}><input value={task.blocker ?? ''} onChange={event => event.target.value ? setTaskBlocker(task.id, event.target.value) : undefined} placeholder="Add blocker" style={cellInputStyle} /></td>
                </tr>
              ))}
              {projectTasks.length === 0 && <tr><td colSpan={10} style={{ padding: 36, textAlign: 'center', color: '#98A2B3' }}>No tasks yet. Select “Add Row” to start tracking work.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

const inputStyle = { background: '#FFFFFF', border: '1px solid #D8DEE9', borderRadius: 8, padding: '8px 10px', fontSize: 12, outline: 'none' }
const selectStyle = { ...inputStyle, minWidth: 190, cursor: 'pointer' }
const primaryButtonStyle = { background: 'linear-gradient(135deg,#335CFF,#6D5CE7)', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
const secondaryButtonStyle = { background: '#FFFFFF', color: '#335CFF', border: '1px solid #C7D2FE', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
const headerCellStyle = { padding: '11px 10px', color: '#667085', fontSize: 10, fontWeight: 800, letterSpacing: '.06em', textAlign: 'left' as const, textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }
const cellStyle = { padding: '7px 10px', color: '#344054', whiteSpace: 'nowrap' as const }
const cellInputStyle = { width: '100%', border: '1px solid transparent', background: 'transparent', borderRadius: 5, padding: '5px 6px', color: '#172033', fontSize: 12, outline: 'none' }

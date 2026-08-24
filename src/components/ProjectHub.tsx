'use client'

import { FormEvent, useState } from 'react'
import { useProjectStore, useTaskStore, usePrefsStore } from '@/store'
import type { Project } from '@/types'
import { CsvProjectImporter } from '@/components/CsvProjectImporter'

interface ProjectHubProps {
  onOpenWorkspace: () => void
}

const today = () => new Date().toISOString().slice(0, 10)
const addMonths = (months: number) => {
  const date = new Date()
  date.setMonth(date.getMonth() + months)
  return date.toISOString().slice(0, 10)
}

export function ProjectHub({ onOpenWorkspace }: ProjectHubProps) {
  const { projects, addProject } = useProjectStore()
  const { tasks } = useTaskStore()
  const { prefs, setActiveProject } = usePrefsStore()
  const [showSetup, setShowSetup] = useState(false)
  const [showCsvImporter, setShowCsvImporter] = useState(false)
  const [query, setQuery] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState(today())
  const [targetDate, setTargetDate] = useState(addMonths(3))

  const filteredProjects = projects.filter(project =>
    `${project.name} ${project.code ?? ''}`.toLowerCase().includes(query.toLowerCase())
  )

  function openProject(projectId: string) {
    setActiveProject(projectId)
    onOpenWorkspace()
  }

  function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const project: Project = {
      id: `project-${Date.now()}`,
      name: name.trim(),
      code: code.trim().toUpperCase() || undefined,
      description: description.trim() || undefined,
      teamIds: [],
      memberIds: [],
      startDate,
      targetDate,
      status: 'ACTIVE',
    }
    addProject(project)
    setActiveProject(project.id)
    setShowSetup(false)
    onOpenWorkspace()
  }

  return (
    <main style={{ minHeight: '100vh', padding: '40px clamp(20px, 6vw, 88px)', background: 'linear-gradient(135deg,#F4F7FF,#FAFBFF)', color: '#172033', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg,#335CFF,#7C3AED)', color: '#fff', fontWeight: 800 }}>AI</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Digital Office</div>
            <div style={{ fontSize: 11, color: '#667085' }}>AI Project Management Platform</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}><button onClick={() => setShowCsvImporter(true)} style={secondaryButtonStyle}>⇧ Import CSV Plan</button><button onClick={() => setShowSetup(true)} style={primaryButtonStyle}>+ Create Project</button></div>
      </header>

      <section style={{ maxWidth: 1100, margin: '0 auto' }}>
        <span style={{ display: 'inline-block', padding: '5px 10px', borderRadius: 20, background: '#EEF2FF', color: '#4F46E5', fontSize: 11, fontWeight: 800, letterSpacing: '.06em' }}>PROJECT HUB</span>
        <h1 style={{ fontSize: 'clamp(30px, 5vw, 48px)', margin: '14px 0 10px', letterSpacing: '-.04em' }}>Manage every project in one workspace.</h1>
        <p style={{ color: '#667085', fontSize: 15, maxWidth: 620, lineHeight: 1.6, margin: 0 }}>Create a new project to start with a blank task workspace, or open an existing project to view its office, board, and worksheet.</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '34px 0 18px' }}>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search projects..." style={{ ...inputStyle, width: 260 }} />
          <span style={{ color: '#98A2B3', fontSize: 12 }}>{filteredProjects.length} project{filteredProjects.length === 1 ? '' : 's'}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {filteredProjects.map(project => {
            const projectTasks = tasks.filter(task => task.projectId === project.id)
            const completed = projectTasks.filter(task => task.status === 'DONE').length
            const active = project.id === prefs.activeProjectId
            return (
              <article key={project.id} style={{ background: '#FFFFFF', border: `1px solid ${active ? '#A5B4FC' : '#E5EAF2'}`, borderRadius: 16, padding: 20, boxShadow: active ? '0 8px 22px rgba(79,70,229,.12)' : '0 2px 10px rgba(16,24,40,.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 18 }}>
                  <span style={{ fontSize: 10, padding: '4px 8px', borderRadius: 6, background: '#ECFDF5', color: '#059669', fontWeight: 800 }}>{project.status}</span>
                  {project.code && <span style={{ fontSize: 11, color: '#667085', fontFamily: 'monospace' }}>{project.code}</span>}
                </div>
                <h2 style={{ margin: 0, fontSize: 18 }}>{project.name}</h2>
                <p style={{ minHeight: 38, margin: '7px 0 18px', fontSize: 12, color: '#667085', lineHeight: 1.5 }}>{project.description ?? 'No description added yet.'}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#667085', fontSize: 11, borderTop: '1px solid #EEF2F7', paddingTop: 14 }}>
                  <span>{projectTasks.length} tasks</span>
                  <span><strong style={{ color: '#059669' }}>{completed}</strong> completed</span>
                </div>
                <div style={{ fontSize: 10, color: '#98A2B3', marginTop: 8 }}>Target: {new Date(project.targetDate).toLocaleDateString('th-TH')}</div>
                <button onClick={() => openProject(project.id)} style={{ ...primaryButtonStyle, width: '100%', marginTop: 16 }}>Open Workspace →</button>
              </article>
            )
          })}

          <button onClick={() => setShowCsvImporter(true)} style={{ minHeight: 260, border: '2px dashed #C7D2FE', borderRadius: 16, background: '#F8FAFF', color: '#4F46E5', cursor: 'pointer', fontWeight: 800, fontSize: 14 }}>⇧ Import a project plan CSV</button>
        </div>
      </section>

      {showCsvImporter && <CsvProjectImporter onClose={() => setShowCsvImporter(false)} onImported={() => { setShowCsvImporter(false); onOpenWorkspace() }} />}

      {showSetup && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15,23,42,.38)', display: 'grid', placeItems: 'center', padding: 20 }}>
          <form onSubmit={createProject} style={{ width: 'min(520px, 100%)', background: '#FFFFFF', borderRadius: 16, padding: 24, boxShadow: '0 24px 64px rgba(15,23,42,.26)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 16 }}>
              <div><h2 style={{ margin: 0, fontSize: 20 }}>Create New Project</h2><p style={{ margin: '5px 0 20px', color: '#667085', fontSize: 12 }}>Mock setup only — backend persistence will be connected later.</p></div>
              <button type="button" onClick={() => setShowSetup(false)} style={closeButtonStyle}>×</button>
            </div>
            <label style={labelStyle}>Project name *<input required autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Customer Portal" style={inputStyle} /></label>
            <label style={labelStyle}>Project code<input value={code} onChange={event => setCode(event.target.value)} placeholder="e.g. PORTAL-26" style={inputStyle} /></label>
            <label style={labelStyle}>Description<textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="What is this project for?" style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} /></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={labelStyle}>Start date<input required type="date" value={startDate} onChange={event => setStartDate(event.target.value)} style={inputStyle} /></label>
              <label style={labelStyle}>Target date<input required type="date" min={startDate} value={targetDate} onChange={event => setTargetDate(event.target.value)} style={inputStyle} /></label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'end', gap: 8, marginTop: 22 }}>
              <button type="button" onClick={() => setShowSetup(false)} style={secondaryButtonStyle}>Cancel</button>
              <button type="submit" style={primaryButtonStyle}>Create & Open Workspace</button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}

const inputStyle = { width: '100%', marginTop: 6, border: '1px solid #D8DEE9', borderRadius: 8, padding: '9px 10px', color: '#172033', background: '#FFFFFF', fontSize: 13, outline: 'none', fontFamily: 'inherit' }
const labelStyle = { display: 'block', marginBottom: 13, color: '#475467', fontSize: 12, fontWeight: 700 }
const primaryButtonStyle = { border: 'none', borderRadius: 8, padding: '9px 14px', cursor: 'pointer', background: 'linear-gradient(135deg,#335CFF,#6D5CE7)', color: '#FFFFFF', fontSize: 12, fontWeight: 800 }
const secondaryButtonStyle = { border: '1px solid #D8DEE9', borderRadius: 8, padding: '9px 14px', cursor: 'pointer', background: '#FFFFFF', color: '#475467', fontSize: 12, fontWeight: 700 }
const closeButtonStyle = { width: 28, height: 28, border: '1px solid #E5EAF2', borderRadius: 7, background: '#FFFFFF', cursor: 'pointer', color: '#667085', fontSize: 20, lineHeight: 1 }

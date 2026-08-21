'use client'

import { ChangeEvent, useState } from 'react'
import { usePrefsStore, useProjectStore, useTaskStore } from '@/store'
import type { Project, Task, TaskPriority, TaskStatus } from '@/types'

type CsvRow = Record<string, string>

const STATUS: Record<string, TaskStatus> = {
  TODO: 'TODO', TO_DO: 'TODO', 'TO DO': 'TODO', 'ยังไม่เริ่ม': 'TODO',
  IN_PROGRESS: 'IN_PROGRESS', 'IN PROGRESS': 'IN_PROGRESS', 'กำลังทำ': 'IN_PROGRESS',
  AT_RISK: 'AT_RISK', 'AT RISK': 'AT_RISK', 'เสี่ยง': 'AT_RISK',
  BLOCKED: 'BLOCKED', 'ติดปัญหา': 'BLOCKED', DONE: 'DONE', 'เสร็จแล้ว': 'DONE',
}
const PRIORITY: Record<string, TaskPriority> = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', CRITICAL: 'CRITICAL' }

function parseCsvLine(line: string) {
  const cells: string[] = []
  let cell = ''; let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"' && line[index + 1] === '"') { cell += '"'; index += 1 } else if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) { cells.push(cell.trim()); cell = '' } else cell += char
  }
  cells.push(cell.trim())
  return cells
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim())
  const headers = parseCsvLine(lines[0] ?? '').map(header => header.toLowerCase().trim())
  return lines.slice(1).map(line => Object.fromEntries(parseCsvLine(line).map((value, index) => [headers[index] ?? '', value])))
}

const value = (row: CsvRow, ...names: string[]) => names.map(name => row[name.toLowerCase()]).find(Boolean)?.trim() ?? ''
const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export function CsvProjectImporter({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const addProject = useProjectStore(state => state.addProject)
  const addTask = useTaskStore(state => state.addTask)
  const setActiveProject = usePrefsStore(state => state.setActiveProject)
  const [rows, setRows] = useState<CsvRow[]>([])
  const [fileName, setFileName] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectCode, setProjectCode] = useState('')
  const [error, setError] = useState('')

  function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const importedRows = parseCsv(String(reader.result))
      const validRows = importedRows.filter(row => value(row, 'task name', 'task', 'title', 'ชื่องาน'))
      setRows(validRows); setFileName(file.name); setError(validRows.length ? '' : 'ไม่พบคอลัมน์ Task Name / Task / Title / ชื่องาน')
      if (!projectName) setProjectName(file.name.replace(/\.csv$/i, '').replaceAll(/[-_]/g, ' '))
    }
    reader.readAsText(file)
  }

  const analysis = {
    progress: rows.length ? Math.round(rows.reduce((sum, row) => sum + Math.min(100, Math.max(0, Number(value(row, 'progress', 'ความคืบหน้า')) || 0)), 0) / rows.length) : 0,
    risks: rows.filter(row => ['AT_RISK', 'BLOCKED'].includes(STATUS[value(row, 'status', 'สถานะ').toUpperCase()])).length,
    missingDueDates: rows.filter(row => !value(row, 'due date', 'due', 'กำหนดส่ง')).length,
  }

  function importProject() {
    if (!projectName.trim() || !rows.length) return
    const projectId = `${slug(projectName) || 'project'}-${Date.now()}`
    const project: Project = { id: projectId, name: projectName.trim(), code: projectCode.trim().toUpperCase() || undefined, description: `Imported from ${fileName}`, teamIds: [...new Set(rows.map(row => value(row, 'team', 'ทีม')).filter(Boolean))], memberIds: [], startDate: new Date().toISOString().slice(0, 10), targetDate: rows.map(row => value(row, 'due date', 'due', 'กำหนดส่ง')).filter(Boolean).sort().at(-1) || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10), status: 'ACTIVE' }
    addProject(project)
    rows.forEach((row, index) => {
      const rawStatus = value(row, 'status', 'สถานะ').toUpperCase()
      const progress = Math.min(100, Math.max(0, Number(value(row, 'progress', 'ความคืบหน้า')) || 0))
      const status = STATUS[rawStatus] || (progress === 100 ? 'DONE' : 'TODO')
      const task: Task = { id: value(row, 'task id', 'id') || `${projectId}-task-${index + 1}`, projectId, title: value(row, 'task name', 'task', 'title', 'ชื่องาน'), description: value(row, 'description', 'รายละเอียด') || undefined, ownerId: value(row, 'owner', 'owner id', 'ผู้รับผิดชอบ') || 'unassigned', teamId: value(row, 'team', 'ทีม') || 'general', status, priority: PRIORITY[value(row, 'priority', 'ความสำคัญ').toUpperCase()] || 'MEDIUM', progress, dueDate: value(row, 'due date', 'due', 'กำหนดส่ง') || undefined, blocker: value(row, 'blocker', 'อุปสรรค') || undefined, riskLevel: status === 'BLOCKED' ? 'HIGH' : status === 'AT_RISK' ? 'MEDIUM' : 'NONE', lastUpdatedAt: new Date().toISOString() }
      addTask(task)
    })
    setActiveProject(projectId); onImported()
  }

  return <div style={overlayStyle}><section style={modalStyle}><header style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><div><h2 style={{ margin: 0, fontSize: 20 }}>Import Project Plan CSV</h2><p style={{ color: '#667085', fontSize: 12 }}>Upload → AI preview → confirm import</p></div><button onClick={onClose} style={closeStyle}>×</button></header><label style={labelStyle}>CSV project plan<input type="file" accept=".csv,text/csv" onChange={readFile} style={{ display: 'block', marginTop: 7 }} /></label>{error && <p style={{ color: '#B42318', fontSize: 12 }}>{error}</p>}{rows.length > 0 && <><div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: 12 }}><label style={labelStyle}>Project name<input value={projectName} onChange={event => setProjectName(event.target.value)} style={inputStyle} /></label><label style={labelStyle}>Project code<input value={projectCode} onChange={event => setProjectCode(event.target.value)} style={inputStyle} /></label></div><div style={{ padding: 13, background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: 10, fontSize: 12, color: '#5B21B6' }}><strong>🤖 AI Import Analysis</strong><div style={{ marginTop: 6 }}>{rows.length} tasks detected · Overall progress {analysis.progress}% · {analysis.risks} risk/blocked · {analysis.missingDueDates} task(s) without due date</div></div><div style={{ maxHeight: 170, overflow: 'auto', marginTop: 12, border: '1px solid #E5EAF2', borderRadius: 10 }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}><thead><tr><th style={cellStyle}>Task</th><th style={cellStyle}>Status</th><th style={cellStyle}>Due date</th></tr></thead><tbody>{rows.slice(0, 10).map((row, index) => <tr key={index}><td style={cellStyle}>{value(row, 'task name', 'task', 'title', 'ชื่องาน')}</td><td style={cellStyle}>{value(row, 'status', 'สถานะ') || 'TODO'}</td><td style={cellStyle}>{value(row, 'due date', 'due', 'กำหนดส่ง') || '—'}</td></tr>)}</tbody></table></div></>}<footer style={{ display: 'flex', justifyContent: 'end', gap: 8, marginTop: 18 }}><button onClick={onClose} style={secondaryStyle}>Cancel</button><button disabled={!rows.length || !projectName.trim()} onClick={importProject} style={{ ...primaryStyle, opacity: rows.length && projectName.trim() ? 1 : .5 }}>Import {rows.length} Tasks</button></footer></section></div>
}

const overlayStyle = { position: 'fixed' as const, inset: 0, zIndex: 60, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(15,23,42,.38)' }
const modalStyle = { width: 'min(700px, 100%)', maxHeight: '90vh', overflowY: 'auto' as const, padding: 24, borderRadius: 16, background: '#FFFFFF', boxShadow: '0 24px 64px rgba(15,23,42,.26)' }
const labelStyle = { display: 'block', marginTop: 14, color: '#475467', fontSize: 12, fontWeight: 700 }
const inputStyle = { width: '100%', marginTop: 6, border: '1px solid #D8DEE9', borderRadius: 8, padding: '9px 10px', color: '#172033', fontSize: 13, boxSizing: 'border-box' as const }
const cellStyle = { padding: '8px 10px', textAlign: 'left' as const, borderBottom: '1px solid #EEF2F7' }
const primaryStyle = { border: 'none', borderRadius: 8, padding: '9px 14px', cursor: 'pointer', background: 'linear-gradient(135deg,#335CFF,#6D5CE7)', color: '#FFFFFF', fontSize: 12, fontWeight: 800 }
const secondaryStyle = { border: '1px solid #D8DEE9', borderRadius: 8, padding: '9px 14px', cursor: 'pointer', background: '#FFFFFF', color: '#475467', fontSize: 12, fontWeight: 700 }
const closeStyle = { width: 28, height: 28, border: '1px solid #E5EAF2', borderRadius: 7, background: '#FFFFFF', cursor: 'pointer', color: '#667085', fontSize: 20, lineHeight: 1 }

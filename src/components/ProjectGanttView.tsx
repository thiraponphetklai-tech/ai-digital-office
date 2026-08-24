'use client'

import React from 'react'
import { usePrefsStore, useProjectStore, useTaskStore } from '@/store'
import type { Task, TaskStatus } from '@/types'

const colors: Record<TaskStatus, string> = { TODO:'#94A3B8', IN_PROGRESS:'#2563EB', AT_RISK:'#D97706', BLOCKED:'#DC2626', DONE:'#059669' }
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const asDate = (value: string) => new Date(`${value}T00:00:00`)
const addDays = (date: Date, days: number) => { const next = new Date(date); next.setDate(next.getDate() + days); return next }
const differenceInDays = (start: Date, end: Date) => Math.round((end.getTime() - start.getTime()) / 86400000)

function taskRange(task: Task) {
  const end = task.plannedEndDate ?? task.dueDate
  const start = task.plannedStartDate ?? end
  return start && end ? { start:asDate(start), end:asDate(end) } : null
}

export function ProjectGanttView() {
  const { projects } = useProjectStore()
  const { tasks } = useTaskStore()
  const { prefs } = usePrefsStore()
  const project = projects.find(item => item.id === prefs.activeProjectId)
  const [anchorMonth, setAnchorMonth] = React.useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const rangeStart = anchorMonth
  const rangeEnd = new Date(anchorMonth.getFullYear(), anchorMonth.getMonth() + 3, 0)
  const totalDays = differenceInDays(rangeStart, rangeEnd) + 1
  const days = Array.from({ length:totalDays }, (_, index) => addDays(rangeStart, index))
  const plannedTasks = tasks.filter(task => task.projectId === project?.id && taskRange(task)).sort((a, b) => taskRange(a)!.start.getTime() - taskRange(b)!.start.getTime())
  const unplannedCount = tasks.filter(task => task.projectId === project?.id && !taskRange(task)).length
  const markers = [
    ...(project?.milestones ?? []).map(item => ({ id:item.id, date:asDate(item.date), label:item.title, color:'#7C3AED' })),
    ...(project ? [{ id:'target', date:asDate(project.targetDate), label:'Target date', color:'#DC2626' }] : []),
  ].filter(marker => marker.date >= rangeStart && marker.date <= rangeEnd)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const visibleToday = today >= rangeStart && today <= rangeEnd
  const pointPercent = (date: Date) => (differenceInDays(rangeStart, date) / totalDays) * 100

  return <main style={{ flex:1, overflow:'auto', padding:28, background:'#F4F7FB' }}>
    <div style={{ minWidth:1000, maxWidth:1500, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'end', gap:16, marginBottom:18 }}><div><div style={{ fontSize:11, fontWeight:800, letterSpacing:'.08em', color:'#4F46E5' }}>PROJECT PLAN</div><h1 style={{ margin:'5px 0 4px', color:'#172033', fontSize:26 }}>{project?.name ?? 'Select a project'}</h1><p style={{ margin:0, color:'#667085', fontSize:13 }}>Gantt uses planned task dates; a due date is shown as a one-day fallback.</p></div><div style={{ display:'flex', alignItems:'center', gap:8 }}><button type="button" onClick={() => setAnchorMonth(current => new Date(current.getFullYear(), current.getMonth() - 3, 1))} style={buttonStyle}>‹</button><strong style={{ minWidth:210, textAlign:'center', color:'#344054', fontSize:13 }}>{rangeStart.toLocaleDateString('en-US', { month:'short', year:'numeric' })} – {rangeEnd.toLocaleDateString('en-US', { month:'short', year:'numeric' })}</strong><button type="button" onClick={() => setAnchorMonth(current => new Date(current.getFullYear(), current.getMonth() + 3, 1))} style={buttonStyle}>›</button><button type="button" onClick={() => setAnchorMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} style={{ ...buttonStyle, width:'auto', padding:'0 10px', fontSize:11 }}>Today</button></div></div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:14 }}><span style={legendStyle}><i style={{ ...dotStyle, background:'#2563EB' }} />Progress</span><span style={legendStyle}><i style={{ ...dotStyle, background:'#7C3AED' }} />Milestone</span><span style={legendStyle}><i style={{ ...dotStyle, background:'#DC2626' }} />Target date</span><span style={{ color:'#667085', fontSize:11 }}>{unplannedCount} task(s) without a planned date are excluded.</span></div>
      <section style={{ border:'1px solid #E0E7FF', borderRadius:16, overflow:'hidden', background:'#FFFFFF', boxShadow:'0 2px 8px rgba(16,24,40,.04)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'270px minmax(700px, 1fr)', borderBottom:'1px solid #E5EAF2', background:'#F8FAFF' }}><div style={{ padding:'12px 16px', color:'#667085', fontSize:10, fontWeight:800, letterSpacing:'.08em' }}>TASK / ASSIGNEE</div><div style={{ position:'relative', height:54, borderLeft:'1px solid #E5EAF2' }}>{days.filter(date => date.getDate() === 1).map(date => <span key={dateKey(date)} style={{ position:'absolute', left:`${pointPercent(date)}%`, top:8, color:'#667085', fontSize:10, fontWeight:800 }}>{date.toLocaleDateString('en-US', { month:'short' })}</span>)}{markers.map(marker => <span key={marker.id} title={marker.label} style={{ position:'absolute', left:`${pointPercent(marker.date)}%`, bottom:6, width:8, height:8, borderRadius:'50%', background:marker.color, transform:'translateX(-50%)' }} />)}</div></div>
        {plannedTasks.length ? plannedTasks.map(task => { const range = taskRange(task)!; const clippedStart = range.start < rangeStart ? rangeStart : range.start; const clippedEnd = range.end > rangeEnd ? rangeEnd : range.end; const left = pointPercent(clippedStart); const width = Math.max(1, ((differenceInDays(clippedStart, clippedEnd) + 1) / totalDays) * 100); const color = colors[task.status]; return <div key={task.id} style={{ display:'grid', gridTemplateColumns:'270px minmax(700px, 1fr)', minHeight:62, borderBottom:'1px solid #F1F5F9' }}><div style={{ padding:'12px 16px' }}><strong style={{ display:'block', color:'#344054', fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{task.title}</strong><span style={{ color:'#98A2B3', fontSize:10 }}>{task.ownerId} · {task.estimatedHours ?? '—'}h est.{task.dependency?.length ? ` · ${task.dependency.length} dependency` : ''}</span></div><div style={{ position:'relative', borderLeft:'1px solid #EEF2F7', background:'repeating-linear-gradient(90deg, transparent, transparent calc(100% / 7 - 1px), #F3F5F8 calc(100% / 7 - 1px), #F3F5F8 calc(100% / 7))' }}>{visibleToday && <i style={{ position:'absolute', left:`${pointPercent(today)}%`, insetBlock:0, width:1, background:'#4F46E5', zIndex:2 }} />}{markers.map(marker => <i key={marker.id} title={marker.label} style={{ position:'absolute', left:`${pointPercent(marker.date)}%`, insetBlock:0, width:1, background:marker.color, opacity:.38 }} />)}<div title={`${dateKey(range.start)} → ${dateKey(range.end)} · ${task.progress}%`} style={{ position:'absolute', left:`${left}%`, top:20, width:`${width}%`, minWidth:7, height:19, borderRadius:6, background:`${color}33`, overflow:'hidden' }}><div style={{ height:'100%', width:`${task.progress}%`, background:color, borderRadius:6 }} /></div></div></div> }) : <div style={{ padding:42, textAlign:'center', color:'#98A2B3', fontSize:13 }}>ยังไม่มี Task ที่มี Planned Start/End หรือ Due Date ใน Project นี้</div>}
      </section>
    </div>
  </main>
}

const buttonStyle = { width:30, height:30, border:'1px solid #D8DEE9', borderRadius:8, cursor:'pointer', background:'#FFFFFF', color:'#475467', fontSize:20, lineHeight:1 } as const
const legendStyle = { display:'flex', alignItems:'center', gap:5, color:'#667085', fontSize:11, fontWeight:700 } as const
const dotStyle = { width:9, height:9, borderRadius:3 } as const

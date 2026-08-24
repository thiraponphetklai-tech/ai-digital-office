'use client'

import React from 'react'
import { usePrefsStore, useProjectStore, useTaskStore } from '@/store'
import { COMPANY_HOLIDAYS } from '@/lib/projectTimeline'

type CalendarEvent = { id: string; date: string; label: string; type: 'milestone' | 'holiday' | 'target' | 'due' }
const styleByType: Record<CalendarEvent['type'], { color: string; background: string; label: string }> = {
  milestone: { color:'#6D28D9', background:'#F5F3FF', label:'Milestone' },
  holiday: { color:'#B45309', background:'#FFFBEB', label:'Holiday' },
  target: { color:'#B91C1C', background:'#FEF2F2', label:'Target date' },
  due: { color:'#1D4ED8', background:'#EFF6FF', label:'Task due date' },
}
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const parseDate = (value: string) => new Date(`${value}T00:00:00`)

export function ProjectCalendarView() {
  const { projects } = useProjectStore()
  const { tasks } = useTaskStore()
  const { prefs } = usePrefsStore()
  const project = projects.find(item => item.id === prefs.activeProjectId)
  const [month, setMonth] = React.useState(() => new Date())
  const projectTasks = tasks.filter(task => task.projectId === project?.id && task.dueDate)
  const events: CalendarEvent[] = [
    ...COMPANY_HOLIDAYS.map(item => ({ id:`company-${item.date}`, date:item.date, label:item.name, type:'holiday' as const })),
    ...(project?.calendar?.holidays ?? []).map(item => ({ id:`project-${item.date}`, date:item.date, label:item.name, type:'holiday' as const })),
    ...(project?.milestones ?? []).map(item => ({ id:item.id, date:item.date, label:item.title, type:'milestone' as const })),
    ...(project ? [{ id:'target', date:project.targetDate, label:`Target: ${project.name}`, type:'target' as const }] : []),
    ...projectTasks.map(task => ({ id:`due-${task.id}`, date:task.dueDate!, label:task.title, type:'due' as const })),
  ]
  const eventsByDate = events.reduce<Record<string, CalendarEvent[]>>((groups, event) => ({ ...groups, [event.date]: [...(groups[event.date] ?? []), event] }), {})
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const gridStart = new Date(month.getFullYear(), month.getMonth(), 1 - firstDay.getDay())
  const todayKey = dateKey(new Date())
  const workingDays = project?.calendar?.workingDays ?? [1, 2, 3, 4, 5]
  const cells = Array.from({ length:42 }, (_, index) => { const date = new Date(gridStart); date.setDate(gridStart.getDate() + index); return date })

  return <main style={{ flex:1, overflowY:'auto', padding:28, background:'#F4F7FB' }}>
    <div style={{ maxWidth:1180, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'end', gap:16, marginBottom:20 }}><div><div style={{ fontSize:11, fontWeight:800, letterSpacing:'.08em', color:'#4F46E5' }}>PROJECT CALENDAR</div><h1 style={{ margin:'5px 0 4px', color:'#172033', fontSize:26 }}>{project?.name ?? 'Select a project'}</h1><p style={{ margin:0, color:'#667085', fontSize:13 }}>Milestones, holidays, target date, and task due dates in one monthly view.</p></div><div style={{ display:'flex', alignItems:'center', gap:8 }}><button type="button" onClick={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))} style={monthButton}>‹</button><strong style={{ minWidth:160, textAlign:'center', color:'#344054', fontSize:15 }}>{month.toLocaleDateString('en-US', { month:'long', year:'numeric' })}</strong><button type="button" onClick={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))} style={monthButton}>›</button><button type="button" onClick={() => setMonth(new Date())} style={{ ...monthButton, width:'auto', padding:'0 11px', fontSize:11 }}>Today</button></div></div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 }}>{(Object.keys(styleByType) as CalendarEvent['type'][]).map(type => <span key={type} style={{ display:'flex', alignItems:'center', gap:5, color:styleByType[type].color, fontSize:11, fontWeight:700 }}><i style={{ width:9, height:9, borderRadius:3, background:styleByType[type].color }} />{styleByType[type].label}</span>)}</div>
      <section style={{ overflow:'hidden', border:'1px solid #E0E7FF', borderRadius:16, background:'#FFFFFF', boxShadow:'0 2px 8px rgba(16,24,40,.04)' }}><div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', borderBottom:'1px solid #E5EAF2', background:'#F8FAFF' }}>{weekdays.map(day => <div key={day} style={{ padding:'10px 12px', color:'#667085', fontSize:10, fontWeight:800, letterSpacing:'.06em', textTransform:'uppercase' }}>{day}</div>)}</div><div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)' }}>{cells.map(date => { const key = dateKey(date); const dayEvents = eventsByDate[key] ?? []; const inMonth = date.getMonth() === month.getMonth(); const isToday = key === todayKey; const isWorkingDay = workingDays.includes(date.getDay()); return <div key={key} style={{ minHeight:130, padding:8, borderRight:date.getDay() < 6 ? '1px solid #EEF2F7' : 'none', borderBottom:'1px solid #EEF2F7', background:inMonth ? (isWorkingDay ? '#FFFFFF' : '#FAFBFD') : '#F8FAFC', opacity:inMonth ? 1 : .55 }}><span style={{ display:'grid', placeItems:'center', width:25, height:25, borderRadius:'50%', background:isToday ? '#4F46E5' : 'transparent', color:isToday ? '#FFFFFF' : '#667085', fontSize:11, fontWeight:800 }}>{date.getDate()}</span><div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:5 }}>{dayEvents.slice(0, 3).map(event => <div key={event.id} title={event.label} style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', padding:'3px 5px', borderRadius:4, background:styleByType[event.type].background, color:styleByType[event.type].color, fontSize:10, fontWeight:700 }}>{event.label}</div>)}{dayEvents.length > 3 && <span style={{ color:'#667085', fontSize:10, fontWeight:700 }}>+{dayEvents.length - 3} more</span>}</div></div> })}</div></section>
    </div>
  </main>
}

const monthButton = { width:30, height:30, border:'1px solid #D8DEE9', borderRadius:8, cursor:'pointer', background:'#FFFFFF', color:'#475467', fontSize:20, lineHeight:1 } as const

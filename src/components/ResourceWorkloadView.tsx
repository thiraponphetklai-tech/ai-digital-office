'use client'

import { usePrefsStore, useProjectStore, useResourceStore, useTaskStore } from '@/store'
import type { Task, TaskPriority } from '@/types'

const priorityHours: Record<TaskPriority, number> = { CRITICAL: 16, HIGH: 12, MEDIUM: 8, LOW: 4 }
const activeStatuses = new Set(['TODO', 'IN_PROGRESS', 'AT_RISK', 'BLOCKED'])

function assignedTo(task: Task, resourceId: string) {
  return (task.assigneeIds ?? [task.ownerId]).includes(resourceId)
}

export function ResourceWorkloadView() {
  const { tasks } = useTaskStore()
  const { resources } = useResourceStore()
  const { projects } = useProjectStore()
  const { prefs } = usePrefsStore()
  const project = projects.find(item => item.id === prefs.activeProjectId)
  const projectTasks = tasks.filter(task => task.projectId === project?.id)
  const projectResources = resources.filter(resource => resource.active && (project?.resourceIds ?? []).includes(resource.id))
  const activeTasks = projectTasks.filter(task => activeStatuses.has(task.status))

  const summaries = projectResources.map(resource => {
    const assignedTasks = projectTasks.filter(task => assignedTo(task, resource.id))
    const assignedActiveTasks = activeTasks.filter(task => assignedTo(task, resource.id))
    const plannedHours = assignedActiveTasks.reduce((sum, task) => sum + priorityHours[task.priority], 0)
    const dailyLoad = plannedHours / 5
    const capacityPercent = Math.round((dailyLoad / resource.capacityHoursPerDay) * 100)
    return { resource, assignedTasks, assignedActiveTasks, plannedHours, dailyLoad, capacityPercent, riskCount: assignedActiveTasks.filter(task => task.status === 'AT_RISK' || task.status === 'BLOCKED').length }
  }).sort((a, b) => b.capacityPercent - a.capacityPercent)

  const overloadedCount = summaries.filter(summary => summary.capacityPercent > 100).length
  const atCapacityCount = summaries.filter(summary => summary.capacityPercent >= 80 && summary.capacityPercent <= 100).length

  return <main style={{ flex:1, overflowY:'auto', padding:28, background:'#F4F7FB' }}>
    <div style={{ maxWidth:1100, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:16, alignItems:'end', marginBottom:22 }}><div><div style={{ fontSize:11, fontWeight:800, letterSpacing:'.08em', color:'#4F46E5' }}>RESOURCE WORKLOAD</div><h1 style={{ margin:'5px 0 4px', fontSize:26, color:'#172033' }}>{project?.name ?? 'Select a project'}</h1><p style={{ margin:0, color:'#667085', fontSize:13 }}>Planning load is estimated over the next 5 working days from active assigned tasks.</p></div><div style={{ padding:'9px 12px', border:'1px solid #DDE5F5', borderRadius:9, background:'#FFFFFF', color:'#667085', fontSize:11 }}>Capacity basis: Critical 16h · High 12h · Medium 8h · Low 4h</div></div>
      <section style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(150px, 1fr))', gap:12, marginBottom:18 }}>{[{ label:'Available players', value:projectResources.length, color:'#4F46E5', background:'#EEF2FF' }, { label:'Active assigned tasks', value:activeTasks.length, color:'#1D4ED8', background:'#EFF6FF' }, { label:'At capacity (80–100%)', value:atCapacityCount, color:'#B45309', background:'#FFFBEB' }, { label:'Over capacity', value:overloadedCount, color:'#B91C1C', background:'#FEF2F2' }].map(item => <div key={item.label} style={{ padding:'14px 16px', borderRadius:12, border:'1px solid #E0E7FF', background:'#FFFFFF' }}><strong style={{ display:'block', color:item.color, fontSize:25 }}>{item.value}</strong><span style={{ color:'#667085', fontSize:11, fontWeight:700 }}>{item.label}</span></div>)}</section>
      <section style={{ border:'1px solid #E0E7FF', borderRadius:16, overflow:'hidden', background:'#FFFFFF', boxShadow:'0 2px 8px rgba(16,24,40,.04)' }}><div style={{ display:'grid', gridTemplateColumns:'minmax(210px, 1.2fr) 1.6fr 100px 115px 90px', gap:14, padding:'12px 18px', background:'#F8FAFF', borderBottom:'1px solid #E5EAF2', color:'#667085', fontSize:10, fontWeight:800, letterSpacing:'.06em', textTransform:'uppercase' }}><span>Player</span><span>Planned daily load</span><span>Tasks</span><span>Risk tasks</span><span>Status</span></div>{summaries.length ? summaries.map(summary => { const { resource, assignedTasks, assignedActiveTasks, dailyLoad, capacityPercent, riskCount } = summary; const over = capacityPercent > 100; const near = !over && capacityPercent >= 80; const color = over ? '#DC2626' : near ? '#D97706' : '#059669'; const label = over ? `Over by ${(dailyLoad - resource.capacityHoursPerDay).toFixed(1)}h` : near ? 'Near capacity' : 'Available'; return <div key={resource.id} style={{ display:'grid', gridTemplateColumns:'minmax(210px, 1.2fr) 1.6fr 100px 115px 90px', gap:14, alignItems:'center', padding:'15px 18px', borderBottom:'1px solid #F2F4F7' }}><div><strong style={{ display:'block', color:'#344054', fontSize:13 }}>{resource.name}</strong><span style={{ color:'#667085', fontSize:11 }}>{resource.role}{resource.company ? ` · ${resource.company}` : ''}</span></div><div><div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, color:'#667085', fontSize:11 }}><span>{dailyLoad.toFixed(1)} / {resource.capacityHoursPerDay} hrs/day</span><strong style={{ color }}>{capacityPercent}%</strong></div><div style={{ height:8, borderRadius:5, background:'#EEF2F7', overflow:'hidden' }}><div style={{ height:'100%', width:`${Math.min(capacityPercent, 100)}%`, background:color, borderRadius:5 }} /></div></div><div><strong style={{ color:'#344054', fontSize:13 }}>{assignedActiveTasks.length}</strong><span style={{ display:'block', color:'#98A2B3', fontSize:10 }}>{assignedTasks.length} total</span></div><div style={{ color:riskCount ? '#B45309' : '#667085', fontWeight:700, fontSize:12 }}>{riskCount ? `${riskCount} needs attention` : 'None'}</div><span style={{ padding:'5px 7px', borderRadius:6, background:over ? '#FEF2F2' : near ? '#FFFBEB' : '#ECFDF5', color, fontSize:10, fontWeight:800, textAlign:'center' }}>{label}</span><div style={{ gridColumn:'1 / -1', padding:'0 0 2px', color:'#667085', fontSize:11 }}>{assignedActiveTasks.length ? <>Active: {assignedActiveTasks.map(task => task.title).join(' · ')}</> : 'No active tasks assigned'}</div></div> }) : <div style={{ padding:40, textAlign:'center', color:'#98A2B3', fontSize:13 }}>ยังไม่มี Player ใน Project — เพิ่มได้จาก Resources / Players</div>}</section>
    </div>
  </main>
}

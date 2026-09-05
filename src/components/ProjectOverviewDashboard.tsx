'use client'

import React from 'react'
import { usePrefsStore, useProjectStore, useTaskStore } from '@/store'
import type { TaskStatus } from '@/types'
import { getProjectTimeline } from '@/lib/projectTimeline'

const STATUS_STYLE: Record<TaskStatus, { label: string; color: string; background: string }> = {
  DONE: { label: 'Done', color: '#047857', background: '#ECFDF5' },
  IN_PROGRESS: { label: 'In progress', color: '#1D4ED8', background: '#EFF6FF' },
  AT_RISK: { label: 'At risk', color: '#B45309', background: '#FFFBEB' },
  BLOCKED: { label: 'Blocked', color: '#B91C1C', background: '#FEF2F2' },
  TODO: { label: 'To do', color: '#667085', background: '#F2F4F7' },
}

export function ProjectOverviewDashboard() {
  const { tasks } = useTaskStore()
  const { prefs } = usePrefsStore()
  const { projects } = useProjectStore()
  const project = projects.find(item => item.id === prefs.activeProjectId)
  const projectTasks = tasks.filter(task => task.projectId === project?.id)
  const done = projectTasks.filter(task => task.status === 'DONE').length
  const working = projectTasks.filter(task => task.status === 'IN_PROGRESS').length
  const attention = projectTasks.filter(task => task.status === 'AT_RISK' || task.status === 'BLOCKED')
  const metricTotal = project?.metrics?.reduce((sum, metric) => sum + metric.total, 0) ?? 0
  const metricCompleted = project?.metrics?.reduce((sum, metric) => sum + metric.completed, 0) ?? 0
  // Overall project completion follows the WBS. Deployment/operational metrics remain visible below as separate KPIs.
  const progress = projectTasks.length ? Number((projectTasks.reduce((sum, task) => sum + task.progress, 0) / projectTasks.length).toFixed(2)) : metricTotal ? Number(((metricCompleted / metricTotal) * 100).toFixed(2)) : 0
  const timeline = project ? getProjectTimeline(project) : null
  const scheduleVariance = timeline ? Number((progress - timeline.scheduleProgress).toFixed(2)) : 0
  const workstreams = [...new Set(projectTasks.map(task => task.teamId || 'general'))].map(teamId => {
    const teamTasks = projectTasks.filter(task => (task.teamId || 'general') === teamId)
    return {
      teamId,
      total: teamTasks.length,
      done: teamTasks.filter(task => task.status === 'DONE').length,
      progress: teamTasks.length ? Math.round(teamTasks.reduce((sum, task) => sum + task.progress, 0) / teamTasks.length) : 0,
    }
  })

  const aiSummary = attention.length > 0
    ? `พบ ${attention.length} งานที่ต้องติดตามเป็นพิเศษ โดยมี ${working} งานกำลังดำเนินการ แนะนำให้ติดตาม owner ของงานที่มีความเสี่ยงก่อน`
    : `ภาพรวมโครงการอยู่ในเกณฑ์ดี มีงานเสร็จแล้ว ${done} จาก ${projectTasks.length} งาน และกำลังดำเนินการ ${working} งาน`

  const kpis = [
    { label: 'Done', value: done, color: '#047857', background: '#ECFDF5' },
    { label: 'In progress', value: working, color: '#1D4ED8', background: '#EFF6FF' },
    { label: 'Need attention', value: attention.length, color: '#B45309', background: '#FFFBEB' },
    { label: 'Total tasks', value: projectTasks.length, color: '#475467', background: '#F2F4F7' },
  ]

  return (
    <main className="overview-dashboard" style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: 24, background: 'var(--color-main-bg)' }}>
      <section style={{ marginBottom: 20 }}>
        <div className="overview-hero" style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 16 }}> 
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', color: 'var(--color-main-primary)' }}>PROJECT OVERVIEW</div>
            <h1 style={{ margin: '5px 0 4px', fontSize: 26, color: 'var(--color-main-text)' }}>{project?.name ?? 'Select a project'}</h1>
            <p style={{ margin: 0, color: '#667085', fontSize: 13 }}>{project?.description ?? 'No project description available.'}</p>
          </div>
          <div className="overview-progress-card" style={{ minWidth: 250, color: '#FFFFFF', background: 'linear-gradient(135deg,var(--color-main-primary),#6A5BEE)', borderRadius: 16, padding: '16px 18px', boxShadow: '0 8px 20px rgba(76,63,224,.24)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 10 }}><span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em' }}>WBS COMPLETION</span><strong style={{ fontSize: 36, lineHeight: .9 }}>{progress}%</strong></div>
            <div style={{ height: 9, background: 'rgba(255,255,255,.26)', borderRadius: 5, overflow: 'hidden' }}><div style={{ width: `${progress}%`, height: '100%', background: '#FFFFFF', borderRadius: 5 }} /></div>
            <div style={{ marginTop: 8, fontSize: 11, opacity: .9 }}>{done} / {projectTasks.length} WBS tasks completed</div>
          </div>
        </div>
      </section>

      <section className="overview-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 12 }}> 
        {kpis.map(kpi => <div key={kpi.label} style={{ background: kpi.background, borderRadius: 12, padding: '15px 16px', border: '1px solid var(--color-main-border)' }}><div style={{ fontSize: 28, fontWeight: 800, color: kpi.color }}>{kpi.value}</div><div style={{ fontSize: 11, fontWeight: 650, color: kpi.color }}>{kpi.label}</div></div>)}
      </section>

      {project?.metrics?.length ? <section aria-label="Deployment KPIs" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 12 }}>{project.metrics.map(metric => { const metricProgress = Number(((metric.completed / metric.total) * 100).toFixed(2)); return <div key={metric.label} style={{ padding: '13px 16px', borderRadius: 12, background: 'var(--color-main-surface)', border: '1px solid var(--color-main-border)' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12 }}><strong>{metric.label} <span style={{ color:'#98A2B3', fontSize:10, fontWeight:700 }}>DEPLOYMENT KPI</span></strong><strong style={{ color: '#047857' }}>{metricProgress}%</strong></div><div style={{ margin: '7px 0', color: '#475467', fontSize: 12 }}>{metric.completed.toLocaleString()} / {metric.total.toLocaleString()} {metric.unit ?? 'เครื่อง'}</div><div style={{ height: 6, background: '#EAF6EF', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${metricProgress}%`, height: '100%', background: '#10B981' }} /></div>{metric.detail && <div style={{ marginTop: 8, color: '#667085', fontSize: 11 }}>{metric.detail}</div>}</div> })}</section> : null}

      {timeline && <section style={{ marginBottom: 12, padding: '15px 16px', borderRadius: 12, background: 'var(--color-main-surface)', border: '1px solid var(--color-main-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}><div><div style={{ fontSize: 10, fontWeight: 800, color: '#4F46E5', letterSpacing: '.08em' }}>PROJECT SCHEDULE</div><strong style={{ fontSize: 13, color: '#172033' }}>Working-day calendar</strong></div><span style={{ padding: '5px 8px', borderRadius: 6, background: scheduleVariance >= 0 ? '#ECFDF5' : '#FFFBEB', color: scheduleVariance >= 0 ? '#047857' : '#B45309', fontSize: 11, fontWeight: 800 }}>{scheduleVariance >= 0 ? `Ahead of schedule ${scheduleVariance}%` : `Behind schedule ${Math.abs(scheduleVariance)}%`}</span></div>
        <div className="overview-schedule-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}> 
          <div><div style={{ fontSize: 11, color: '#667085' }}>Elapsed</div><strong style={{ color: '#172033' }}>{timeline.elapsedWorkingDays} / {timeline.totalWorkingDays} วันทำการ</strong></div>
          <div><div style={{ fontSize: 11, color: '#667085' }}>Remaining</div><strong style={{ color: timeline.isOverdue ? '#B91C1C' : '#172033' }}>{timeline.isOverdue ? 'Overdue' : `${timeline.remainingWorkingDays} วันทำการ`}</strong></div>
          <div><div style={{ fontSize: 11, color: '#667085' }}>Schedule progress</div><strong style={{ color: '#4F46E5' }}>{timeline.scheduleProgress}%</strong></div>
          <div><div style={{ fontSize: 11, color: '#667085' }}>WBS progress</div><strong style={{ color: '#047857' }}>{progress}%</strong></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}><div><div style={{ display: 'flex', justifyContent: 'space-between', color: '#667085', fontSize: 10, marginBottom: 4 }}><span>Schedule</span><span>{timeline.scheduleProgress}%</span></div><div style={{ height: 6, background: '#EEF2FF', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${timeline.scheduleProgress}%`, height: '100%', background: '#6366F1' }} /></div></div><div><div style={{ display: 'flex', justifyContent: 'space-between', color: '#667085', fontSize: 10, marginBottom: 4 }}><span>Work</span><span>{progress}%</span></div><div style={{ height: 6, background: '#EAF6EF', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${progress}%`, height: '100%', background: '#10B981' }} /></div></div></div>
      </section>}

      <section style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 20, padding: '13px 16px', borderRadius: 12, background: 'var(--color-main-primary-soft)', border: '1px solid var(--color-main-border-strong)' }}>
        <span style={{ fontSize: 17 }}>🤖</span>
        <div><div style={{ fontSize: 10, color: '#6D28D9', fontWeight: 800, letterSpacing: '.08em', marginBottom: 4 }}>AI PROJECT SUMMARY</div><div style={{ fontSize: 12, color: '#5B21B6', lineHeight: 1.5 }}>{aiSummary}</div></div>
      </section>

      <section className="overview-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}> 
        <div style={cardStyle}>
          <h2 style={headingStyle}>Workstream summary</h2>
          {workstreams.map(workstream => <div key={workstream.teamId} style={{ marginTop: 14 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}><strong style={{ color: '#344054' }}>{workstream.teamId}</strong><span style={{ color: '#667085' }}>{workstream.done}/{workstream.total} done · {workstream.progress}%</span></div><div style={{ height: 7, background: '#EEF2FF', borderRadius: 5, overflow: 'hidden' }}><div style={{ height: '100%', width: `${workstream.progress}%`, background: '#4F46E5' }} /></div></div>)}
          {!workstreams.length && <p style={{ color: '#98A2B3', fontSize: 12 }}>No workstreams yet.</p>}
        </div>
        <div style={cardStyle}>
          <h2 style={headingStyle}>Risks & follow-up</h2>
          {attention.length ? attention.map(task => <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid #F2F4F7' }}><div><strong style={{ display: 'block', fontSize: 12, color: '#344054' }}>{task.title}</strong><span style={{ fontSize: 11, color: '#667085' }}>{task.blocker || task.description || 'Needs review'}</span></div><span style={{ whiteSpace: 'nowrap', padding: '4px 7px', borderRadius: 6, fontSize: 10, fontWeight: 700, color: STATUS_STYLE[task.status].color, background: STATUS_STYLE[task.status].background }}>{STATUS_STYLE[task.status].label}</span></div>) : <p style={{ color: '#047857', fontSize: 12 }}>No active risks or blockers.</p>}
        </div>
      </section>
    </main>
  )
}

const cardStyle = { background: 'var(--color-main-surface)', border: '1px solid var(--color-main-border)', borderRadius: 14, padding: 18, boxShadow: '0 2px 8px rgba(31,36,48,.04)' }
const headingStyle = { margin: 0, fontSize: 13, color: 'var(--color-main-text)' }

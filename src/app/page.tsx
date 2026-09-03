'use client'
import React, { useRef, useEffect } from 'react'
import {
  useTaskStore, useEventStore, useOfficeStore, useProjectStore,
  usePrefsStore, useChatStore,
} from '@/store'
import { ProjectHub } from '@/components/ProjectHub'
import { ApiDataHydrator } from '@/components/ApiDataHydrator'
import dynamic from 'next/dynamic'
import { ChatPanel } from '@/components/ChatPanel'
import { MockAgentService } from '@/services/mockAgent'
import { TaskBoard } from '@/components/board/TaskBoard'
import { ProjectOverviewDashboard } from '@/components/ProjectOverviewDashboard'
import { ProjectTimeline } from '@/components/ProjectTimeline'
import { ProjectResourcesDialog } from '@/components/ProjectResourcesDialog'
import { ResourceWorkloadView } from '@/components/ResourceWorkloadView'
import { ProjectCalendarView } from '@/components/ProjectCalendarView'
import { ProjectGanttView } from '@/components/ProjectGanttView'
import { UserManagementDialog } from '@/components/UserManagementDialog'

// OfficeScene ใช้ Three.js — ต้อง dynamic import (ไม่รัน SSR)
const OfficeScene = dynamic(
  () => import('@/components/office3d/OfficeScene').then(m => m.OfficeScene),
  { ssr: false, loading: () => (
    <div style={{ width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'#6B7280',fontSize:13 }}>
      Loading 3D scene...
    </div>
  )}
)

// ── Design tokens (light, colorful) ──────────────────────────────
const T = {
  // App shell
  bg:        '#F0F4FF',
  surface:   '#FFFFFF',
  surfaceAlt:'#F8FAFF',
  border:    '#E0E7FF',
  borderMid: '#C7D2FE',

  // Brand
  indigo:    '#4F46E5',
  indigoBg:  '#EEF2FF',
  purple:    '#7C3AED',
  purpleBg:  '#F5F3FF',
  blue:      '#2563EB',
  blueBg:    '#EFF6FF',

  // Semantic
  green:     '#059669',
  greenBg:   '#ECFDF5',
  greenText: '#065F46',
  amber:     '#D97706',
  amberBg:   '#FFFBEB',
  amberText: '#92400E',
  red:       '#DC2626',
  redBg:     '#FEF2F2',
  redText:   '#991B1B',
  sky:       '#0284C7',
  skyBg:     '#F0F9FF',

  // Text
  text:      '#111827',
  textSub:   '#6B7280',
  textMuted: '#9CA3AF',
}

// ── Status desk config ────────────────────────────────────────────
const DESK: Record<string, { bg: string; border: string; dot: string; label: string; text: string }> = {
  DONE:        { bg:'#ECFDF5', border:'#6EE7B7', dot:'#059669', label:'#065F46', text:'#059669' },
  IN_PROGRESS: { bg:'#EFF6FF', border:'#93C5FD', dot:'#2563EB', label:'#1E3A8A', text:'#2563EB' },
  BLOCKED:     { bg:'#FEF2F2', border:'#FCA5A5', dot:'#DC2626', label:'#7F1D1D', text:'#DC2626' },
  AT_RISK:     { bg:'#FFFBEB', border:'#FCD34D', dot:'#D97706', label:'#78350F', text:'#D97706' },
  TODO:        { bg:'#F9FAFB', border:'#D1D5DB', dot:'#9CA3AF', label:'#4B5563', text:'#6B7280' },
}

const LEGEND = [
  { label:'Done',        dot:'#059669' },
  { label:'In Progress', dot:'#2563EB' },
  { label:'At Risk',     dot:'#D97706' },
  { label:'Blocked',     dot:'#DC2626' },
  { label:'Todo',        dot:'#9CA3AF' },
]

const EVENT_ICON: Record<string, string> = {
  'task.blocked':        '🔴',
  'task.completed':      '✅',
  'task.updated':        '🔵',
  'task.stale':          '🟡',
  'task.overdue':        '🔴',
  'ai.review_started':   '🤖',
  'ai.review_completed': '✨',
  'ai.risk_detected':    '⚠️',
  'line.report_sent':    '📊',
  'followup.created':    '📨',
}

// ── Topbar ────────────────────────────────────────────────────────
function Topbar({ onOpenProjectHub }: { onOpenProjectHub: () => void }) {
  const { stats } = useTaskStore()
  const { projects, updateProject } = useProjectStore()
  const { prefs, toggleDnd } = usePrefsStore()
  const [showLineUpdate, setShowLineUpdate] = React.useState(false)
  const [showProjectSettings, setShowProjectSettings] = React.useState(false)
  const [showResources, setShowResources] = React.useState(false)
  const [showUsers, setShowUsers] = React.useState(false)
  const [currentUser, setCurrentUser] = React.useState<{ displayName: string; systemRole: string } | null>(null)
  React.useEffect(() => { void fetch('/api/auth/me').then(response => response.ok ? response.json() : null).then(data => setCurrentUser(data?.user ?? null)) }, [])
  const [targetDateDraft, setTargetDateDraft] = React.useState('')
  const [workingDaysDraft, setWorkingDaysDraft] = React.useState<number[]>([])
  const [holidaysDraft, setHolidaysDraft] = React.useState<{ date: string; name: string }[]>([])
  const [holidayDateDraft, setHolidayDateDraft] = React.useState('')
  const [holidayNameDraft, setHolidayNameDraft] = React.useState('')
  const [milestonesDraft, setMilestonesDraft] = React.useState<{ id: string; title: string; date: string; status: 'UPCOMING' | 'ON_TRACK' | 'AT_RISK' | 'COMPLETED'; owner?: string }[]>([])
  const [milestoneTitleDraft, setMilestoneTitleDraft] = React.useState('')
  const [milestoneDateDraft, setMilestoneDateDraft] = React.useState('')
  const [milestoneOwnerDraft, setMilestoneOwnerDraft] = React.useState('')
  const [settingsError, setSettingsError] = React.useState('')
  const [isSavingSettings, setIsSavingSettings] = React.useState(false)
  const [lineUpdateState, setLineUpdateState] = React.useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [lineUpdateError, setLineUpdateError] = React.useState('')
  const activeProject = projects.find(project => project.id === prefs.activeProjectId)

  async function sendLineUpdate() {
    if (!activeProject) return
    setLineUpdateState('sending')
    setLineUpdateError('')
    try {
      const response = await fetch('/api/line/manual-project-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: activeProject.id }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Unable to send the LINE update.')
      setLineUpdateState('sent')
    } catch (error) {
      setLineUpdateError(error instanceof Error ? error.message : 'Unable to send the LINE update.')
      setLineUpdateState('failed')
    }
  }

  function openLineUpdate() {
    setLineUpdateState('idle')
    setLineUpdateError('')
    setShowLineUpdate(true)
  }

  function openProjectSettings() {
    if (!activeProject) return
    setTargetDateDraft(activeProject.targetDate)
    setWorkingDaysDraft(activeProject.calendar?.workingDays ?? [1, 2, 3, 4, 5])
    setHolidaysDraft(activeProject.calendar?.holidays ?? [])
    setHolidayDateDraft('')
    setHolidayNameDraft('')
    setMilestonesDraft(activeProject.milestones ?? [])
    setMilestoneTitleDraft('')
    setMilestoneDateDraft('')
    setMilestoneOwnerDraft('')
    setSettingsError('')
    setShowProjectSettings(true)
  }

  function toggleWorkingDay(day: number) {
    setWorkingDaysDraft(current => current.includes(day) ? current.filter(item => item !== day) : [...current, day].sort())
  }

  function addProjectHoliday() {
    if (!holidayDateDraft || !holidayNameDraft.trim()) return
    if (holidaysDraft.some(holiday => holiday.date === holidayDateDraft)) {
      setSettingsError('มีวันหยุดในวันที่เลือกแล้ว')
      return
    }
    setHolidaysDraft(current => [...current, { date: holidayDateDraft, name: holidayNameDraft.trim() }].sort((a, b) => a.date.localeCompare(b.date)))
    setHolidayDateDraft('')
    setHolidayNameDraft('')
    setSettingsError('')
  }

  function addMilestone() {
    if (!milestoneTitleDraft.trim() || !milestoneDateDraft) return
    setMilestonesDraft(current => [...current, { id: `milestone-${Date.now()}`, title: milestoneTitleDraft.trim(), date: milestoneDateDraft, status: 'UPCOMING' as const, owner: milestoneOwnerDraft.trim() || undefined }].sort((a, b) => a.date.localeCompare(b.date)))
    setMilestoneTitleDraft('')
    setMilestoneDateDraft('')
    setMilestoneOwnerDraft('')
  }

  async function saveProjectSettings() {
    if (!activeProject) return
    if (workingDaysDraft.length === 0) {
      setSettingsError('กรุณาเลือกอย่างน้อย 1 วันทำงาน')
      return
    }
    if (targetDateDraft < activeProject.startDate) {
      setSettingsError('Target date ต้องไม่ก่อนวันเริ่มโครงการ')
      return
    }

    setIsSavingSettings(true)
    setSettingsError('')
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(activeProject.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDate: targetDateDraft, calendar: { workingDays: workingDaysDraft, holidays: holidaysDraft }, milestones: milestonesDraft }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Unable to save project settings.')
      updateProject(activeProject.id, result)
      setShowProjectSettings(false)
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Unable to save project settings.')
    } finally {
      setIsSavingSettings(false)
    }
  }

  return (
    <>
    <header style={{
      height: 52, background: T.surface,
      borderBottom: `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center',
      padding: '0 20px', gap: 12, flexShrink: 0,
      boxShadow: '0 1px 8px #4F46E510',
    }}>
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap: 9 }}>
        <div style={{
          width:34, height:34, borderRadius:10,
          background:'linear-gradient(135deg,#4F46E5,#7C3AED)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:13, fontWeight:800, color:'#fff',
          boxShadow:'0 2px 8px #4F46E540',
        }}>AI</div>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:T.text, lineHeight:1 }}>Digital Office</div>
          <div style={{ fontSize:10, color:T.indigo, fontWeight:500 }}>AI Project Manager</div>
        </div>
        <span style={{
          fontSize:10, color:T.indigo, background:T.indigoBg,
          border:`1px solid ${T.borderMid}`, borderRadius:6, padding:'1px 7px', fontWeight:600,
        }}>v2.0</span>
      </div>

      <button onClick={onOpenProjectHub} title="กลับไปเลือกโครงการ" style={{
        display:'flex', alignItems:'center', gap:6, background:'transparent', border:`1px solid ${T.border}`,
        borderRadius:8, padding:'6px 10px', color:T.indigo, cursor:'pointer', fontSize:11, fontWeight:700,
      }}>← All Projects</button>

      {/* Project pill */}
      <div style={{
        display:'flex', alignItems:'center', gap:8,
        background:T.indigoBg, border:`1.5px solid ${T.borderMid}`,
        borderRadius:20, padding:'6px 16px', cursor:'pointer',
      }}>
        <span style={{ width:8, height:8, borderRadius:'50%', background:T.indigo }} />
        <span style={{ fontSize:13, fontWeight:600, color:T.indigo }}>{activeProject?.name ?? 'Select a project'}</span>
        <span style={{ color:T.textMuted, fontSize:10 }}>▾</span>
      </div>

      <button onClick={openProjectSettings} disabled={!activeProject} style={{
        border:`1px solid ${T.border}`, borderRadius:8, padding:'6px 10px', background:T.surface, color:T.indigo,
        cursor: activeProject ? 'pointer' : 'not-allowed', fontSize:11, fontWeight:700, opacity: activeProject ? 1 : .5,
      }}>Project Settings</button>

      <button onClick={() => setShowResources(true)} disabled={!activeProject} style={{
        border:`1px solid ${T.border}`, borderRadius:8, padding:'6px 10px', background:T.surface, color:T.indigo,
        cursor: activeProject ? 'pointer' : 'not-allowed', fontSize:11, fontWeight:700, opacity: activeProject ? 1 : .5,
      }}>Resources / Players</button>

      <button onClick={openLineUpdate} disabled={!activeProject} style={{
        border:'1px solid #A7F3D0', borderRadius:8, padding:'6px 10px', background:'#F0FDF4', color:'#047857',
        cursor: activeProject ? 'pointer' : 'not-allowed', fontSize:11, fontWeight:700, opacity: activeProject ? 1 : .5,
      }}>Update LINE</button>
      {currentUser?.systemRole === 'SYSTEM_ADMIN' && <button onClick={() => setShowUsers(true)} style={{ border:'1px solid #C7D2FE', borderRadius:8, padding:'6px 10px', background:'#EEF2FF', color:'#4338CA', cursor:'pointer', fontSize:11, fontWeight:700 }}>Users</button>}

      <div style={{ flex:1 }} />

      {/* Alert pills */}
      {stats.blocked > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:6, background:T.redBg, border:`1px solid #FCA5A5`, borderRadius:20, padding:'5px 14px' }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:T.red }} />
          <span style={{ fontSize:11, color:T.red, fontWeight:600 }}>{stats.blocked} blocked</span>
        </div>
      )}
      {stats.risk > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:6, background:T.amberBg, border:`1px solid #FCD34D`, borderRadius:20, padding:'5px 14px' }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:T.amber }} />
          <span style={{ fontSize:11, color:T.amber, fontWeight:600 }}>{stats.risk} at risk</span>
        </div>
      )}

      {/* AI status */}
      {currentUser && <button onClick={() => { void fetch('/api/auth/logout', { method:'POST' }).finally(() => window.location.reload()) }} style={{ border:'1px solid #E4E7EC', borderRadius:8, padding:'5px 9px', background:'#FFFFFF', color:'#667085', cursor:'pointer', fontSize:11, fontWeight:700 }} title={`Signed in as ${currentUser.displayName}`}>Sign out</button>}

      <button onClick={() => toggleDnd(2)} style={{
        display:'flex', alignItems:'center', gap:6,
        background: prefs.dndMode ? T.amberBg : T.greenBg,
        border:`1px solid ${prefs.dndMode ? '#FCD34D' : '#6EE7B7'}`,
        borderRadius:20, padding:'5px 14px', cursor:'pointer',
      }}>
        <span style={{ width:7, height:7, borderRadius:'50%', background: prefs.dndMode ? T.amber : T.green }} />
        <span style={{ fontSize:11, color: prefs.dndMode ? T.amber : T.green, fontWeight:600 }}>
          {prefs.dndMode ? 'DND on' : 'AI online'}
        </span>
      </button>
    </header>
    {showResources && activeProject && <ProjectResourcesDialog projectId={activeProject.id} onClose={() => setShowResources(false)} />}
    {showUsers && <UserManagementDialog onClose={() => setShowUsers(false)} />}
    {showProjectSettings && activeProject && (
      <div style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(15,23,42,.38)', display:'grid', placeItems:'center', padding:20 }}>
        <section role="dialog" aria-modal="true" aria-labelledby="project-settings-title" style={{ width:'min(620px, 100%)', maxHeight:'calc(100vh - 40px)', overflowY:'auto', background:'#FFFFFF', borderRadius:16, padding:24, boxShadow:'0 24px 64px rgba(15,23,42,.26)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', gap:16 }}>
            <div><div style={{ fontSize:11, fontWeight:800, letterSpacing:'.08em', color:T.indigo }}>PROJECT SETTINGS</div><h2 id="project-settings-title" style={{ margin:'7px 0 4px', fontSize:20 }}>Schedule & Calendar</h2><p style={{ margin:0, color:T.textSub, fontSize:12 }}>{activeProject.name}</p></div>
            <button type="button" onClick={() => setShowProjectSettings(false)} aria-label="Close" style={{ width:28, height:28, border:'1px solid #E5EAF2', borderRadius:7, background:'#FFFFFF', cursor:'pointer', color:'#667085', fontSize:20, lineHeight:1 }}>×</button>
          </div>
          <div style={{ marginTop:20 }}>
            <label style={{ display:'block', color:'#475467', fontSize:12, fontWeight:700 }}>Target date<input type="date" min={activeProject.startDate} value={targetDateDraft} onChange={event => setTargetDateDraft(event.target.value)} style={{ display:'block', width:'100%', marginTop:6, border:'1px solid #D8DEE9', borderRadius:8, padding:'9px 10px', color:'#172033', background:'#FFFFFF', fontSize:13 }} /></label>
            <div style={{ marginTop:18 }}><div style={{ color:'#475467', fontSize:12, fontWeight:700, marginBottom:8 }}>Working days</div><div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>{[['อา.', 0], ['จ.', 1], ['อ.', 2], ['พ.', 3], ['พฤ.', 4], ['ศ.', 5], ['ส.', 6]].map(([label, day]) => <button key={String(day)} type="button" onClick={() => toggleWorkingDay(Number(day))} style={{ border:`1px solid ${workingDaysDraft.includes(Number(day)) ? '#A5B4FC' : '#D8DEE9'}`, borderRadius:8, padding:'7px 11px', cursor:'pointer', background:workingDaysDraft.includes(Number(day)) ? '#EEF2FF' : '#FFFFFF', color:workingDaysDraft.includes(Number(day)) ? '#4338CA' : '#667085', fontSize:12, fontWeight:700 }}>{label}</button>)}</div><p style={{ margin:'8px 0 0', color:'#98A2B3', fontSize:11 }}>ตัดวันหยุดบริษัทและวันหยุดเฉพาะ Project ออกจากการคำนวณวันทำการอัตโนมัติ</p></div>
            <div style={{ marginTop:20, paddingTop:18, borderTop:'1px solid #EEF2F7' }}><div style={{ color:'#475467', fontSize:12, fontWeight:700 }}>Project holidays</div><div style={{ display:'grid', gridTemplateColumns:'150px 1fr auto', gap:8, marginTop:9 }}><input type="date" value={holidayDateDraft} onChange={event => setHolidayDateDraft(event.target.value)} style={{ border:'1px solid #D8DEE9', borderRadius:8, padding:'8px', fontSize:12 }} /><input value={holidayNameDraft} onChange={event => setHolidayNameDraft(event.target.value)} placeholder="เช่น Change freeze" style={{ border:'1px solid #D8DEE9', borderRadius:8, padding:'8px', fontSize:12 }} /><button type="button" onClick={addProjectHoliday} style={{ border:'none', borderRadius:8, padding:'8px 11px', cursor:'pointer', background:'#EEF2FF', color:'#4338CA', fontSize:12, fontWeight:800 }}>+ Add</button></div>
              <div style={{ marginTop:10 }}>{holidaysDraft.length ? holidaysDraft.map(holiday => <div key={holiday.date} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'8px 0', borderBottom:'1px solid #F2F4F7', fontSize:12 }}><span><strong style={{ color:'#344054' }}>{new Date(`${holiday.date}T00:00:00`).toLocaleDateString('th-TH')}</strong><span style={{ color:'#667085' }}> · {holiday.name}</span></span><button type="button" onClick={() => setHolidaysDraft(current => current.filter(item => item.date !== holiday.date))} style={{ border:'none', background:'transparent', color:'#B91C1C', cursor:'pointer', fontSize:11, fontWeight:700 }}>Remove</button></div>) : <p style={{ margin:'10px 0 0', color:'#98A2B3', fontSize:11 }}>ยังไม่มีวันหยุดเฉพาะโครงการ</p>}</div>
            </div>
            <div style={{ marginTop:20, paddingTop:18, borderTop:'1px solid #EEF2F7' }}><div style={{ color:'#475467', fontSize:12, fontWeight:700 }}>Milestones</div><div style={{ display:'grid', gridTemplateColumns:'1fr 150px 120px auto', gap:8, marginTop:9 }}><input value={milestoneTitleDraft} onChange={event => setMilestoneTitleDraft(event.target.value)} placeholder="Milestone name" style={{ border:'1px solid #D8DEE9', borderRadius:8, padding:'8px', fontSize:12 }} /><input type="date" min={activeProject.startDate} max={targetDateDraft} value={milestoneDateDraft} onChange={event => setMilestoneDateDraft(event.target.value)} style={{ border:'1px solid #D8DEE9', borderRadius:8, padding:'8px', fontSize:12 }} /><input value={milestoneOwnerDraft} onChange={event => setMilestoneOwnerDraft(event.target.value)} placeholder="Owner (optional)" style={{ border:'1px solid #D8DEE9', borderRadius:8, padding:'8px', fontSize:12 }} /><button type="button" onClick={addMilestone} style={{ border:'none', borderRadius:8, padding:'8px 11px', cursor:'pointer', background:'#EEF2FF', color:'#4338CA', fontSize:12, fontWeight:800 }}>+ Add</button></div>
              <div style={{ marginTop:10 }}>{milestonesDraft.length ? milestonesDraft.map(milestone => <div key={milestone.id} style={{ display:'grid', gridTemplateColumns:'1fr 120px auto', alignItems:'center', gap:8, padding:'9px 0', borderBottom:'1px solid #F2F4F7', fontSize:12 }}><span><strong style={{ color:'#344054' }}>{new Date(`${milestone.date}T00:00:00`).toLocaleDateString('th-TH')}</strong><span style={{ color:'#667085' }}> · {milestone.title}{milestone.owner ? ` · ${milestone.owner}` : ''}</span></span><select value={milestone.status} onChange={event => setMilestonesDraft(current => current.map(item => item.id === milestone.id ? { ...item, status: event.target.value as typeof item.status } : item))} style={{ border:'1px solid #D8DEE9', borderRadius:6, padding:'5px', color:'#475467', background:'#FFFFFF', fontSize:11 }}><option value="UPCOMING">Upcoming</option><option value="ON_TRACK">On track</option><option value="AT_RISK">At risk</option><option value="COMPLETED">Completed</option></select><button type="button" onClick={() => setMilestonesDraft(current => current.filter(item => item.id !== milestone.id))} style={{ border:'none', background:'transparent', color:'#B91C1C', cursor:'pointer', fontSize:11, fontWeight:700 }}>Remove</button></div>) : <p style={{ margin:'10px 0 0', color:'#98A2B3', fontSize:11 }}>ยังไม่มี Milestone</p>}</div>
            </div>
          </div>
          {settingsError && <p style={{ margin:'16px 0 0', color:'#B91C1C', fontSize:12 }}>{settingsError}</p>}
          <div style={{ display:'flex', justifyContent:'end', gap:8, marginTop:22 }}><button type="button" disabled={isSavingSettings} onClick={() => setShowProjectSettings(false)} style={{ border:'1px solid #D8DEE9', borderRadius:8, padding:'9px 14px', cursor:isSavingSettings ? 'not-allowed' : 'pointer', background:'#FFFFFF', color:'#475467', fontSize:12, fontWeight:700, opacity:isSavingSettings ? .6 : 1 }}>Cancel</button><button type="button" disabled={isSavingSettings} onClick={saveProjectSettings} style={{ border:'none', borderRadius:8, padding:'9px 14px', cursor:isSavingSettings ? 'not-allowed' : 'pointer', background:'linear-gradient(135deg,#335CFF,#6D5CE7)', color:'#FFFFFF', fontSize:12, fontWeight:800, opacity:isSavingSettings ? .7 : 1 }}>{isSavingSettings ? 'Saving...' : 'Save Schedule'}</button></div>
        </section>
      </div>
    )}
    {showLineUpdate && activeProject && (
      <div style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(15,23,42,.38)', display:'grid', placeItems:'center', padding:20 }}>
        <section role="dialog" aria-modal="true" aria-labelledby="line-update-title" style={{ width:'min(440px, 100%)', background:'#FFFFFF', borderRadius:16, padding:24, boxShadow:'0 24px 64px rgba(15,23,42,.26)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', gap:16 }}>
            <div><div style={{ fontSize:11, fontWeight:800, letterSpacing:'.08em', color:'#059669' }}>LINE UPDATE</div><h2 id="line-update-title" style={{ margin:'7px 0 8px', fontSize:20 }}>Send project update?</h2></div>
            <button type="button" onClick={() => setShowLineUpdate(false)} aria-label="Close" style={{ width:28, height:28, border:'1px solid #E5EAF2', borderRadius:7, background:'#FFFFFF', cursor:'pointer', color:'#667085', fontSize:20, lineHeight:1 }}>×</button>
          </div>
          <p style={{ margin:'0 0 12px', color:'#475467', fontSize:13, lineHeight:1.6 }}>จะส่งรายงานความคืบหน้าล่าสุดไปยัง LINE Group กลาง (Mock)</p>
          <div style={{ padding:'12px 14px', borderRadius:10, background:'#F0FDF4', border:'1px solid #BBF7D0' }}><strong style={{ display:'block', color:'#166534', fontSize:14 }}>{activeProject.name}</strong><span style={{ color:'#15803D', fontSize:11 }}>{activeProject.code ?? activeProject.id}</span></div>
          {lineUpdateState === 'idle' && <p style={{ margin:'14px 0 0', color:'#98A2B3', fontSize:11, lineHeight:1.5 }}>รายงานจะถูกส่งไปยัง LINE Group กลางที่ตั้งค่าไว้ในระบบ</p>}
          {lineUpdateState === 'sending' && <p style={{ margin:'14px 0 0', color:'#0369A1', fontSize:12, fontWeight:700 }}>กำลังส่งรายงานไป LINE Group...</p>}
          {lineUpdateState === 'sent' && <p style={{ margin:'14px 0 0', color:'#047857', fontSize:12, fontWeight:700 }}>ส่งรายงานเข้า LINE Group สำเร็จแล้ว</p>}
          {lineUpdateState === 'failed' && <p style={{ margin:'14px 0 0', color:'#B91C1C', fontSize:12, lineHeight:1.5 }}>{lineUpdateError}</p>}
          <div style={{ display:'flex', justifyContent:'end', gap:8, marginTop:22 }}>
            <button type="button" onClick={() => setShowLineUpdate(false)} disabled={lineUpdateState === 'sending'} style={{ border:'1px solid #D8DEE9', borderRadius:8, padding:'9px 14px', cursor:lineUpdateState === 'sending' ? 'not-allowed' : 'pointer', background:'#FFFFFF', color:'#475467', fontSize:12, fontWeight:700, opacity:lineUpdateState === 'sending' ? .6 : 1 }}>{lineUpdateState === 'sent' ? 'Close' : 'Cancel'}</button>
            {lineUpdateState !== 'sent' && <button type="button" onClick={sendLineUpdate} disabled={lineUpdateState === 'sending'} style={{ border:'none', borderRadius:8, padding:'9px 14px', cursor:lineUpdateState === 'sending' ? 'not-allowed' : 'pointer', background:'linear-gradient(135deg,#059669,#16A34A)', color:'#FFFFFF', fontSize:12, fontWeight:800, opacity:lineUpdateState === 'sending' ? .7 : 1 }}>{lineUpdateState === 'sending' ? 'Sending...' : lineUpdateState === 'failed' ? 'Try Again' : 'Send Update'}</button>}
          </div>
        </section>
      </div>
    )}
    </>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────
function Sidebar({ view, onViewChange }: { view: 'office'|'board'|'timeline'|'calendar'|'gantt'|'resources'; onViewChange: (v:'office'|'board'|'timeline'|'calendar'|'gantt'|'resources')=>void }) {
  const navItems = [
    { icon:'▦', label:'Project Overview', key:'office' as const },
    { icon:'☰', label:'Task Board',     key:'board'  as const },
    { icon:'◫', label:'Timeline',       key:'timeline' as const },
    { icon:'▣', label:'Calendar',       key:'calendar' as const },
    { icon:'▤', label:'Gantt / Project Plan', key:'gantt' as const },
  ]
  const bottomItems = [{ icon:'◎', label:'Resource Workload', key:'resources' as const }, { icon:'⊞', label:'Reports', key:null }]
  return (
    <nav style={{
      width:58, background:T.surface,
      borderRight:`1px solid ${T.border}`,
      display:'flex', flexDirection:'column', alignItems:'center',
      padding:'10px 0', gap:4, flexShrink:0,
    }}>
      {navItems.map(item => (
        <button key={item.label} title={item.label}
          onClick={() => item.key && onViewChange(item.key)}
          style={{
            width:40, height:40, borderRadius:10,
            background: item.key === view ? T.indigo : 'transparent',
            color: item.key === view ? '#fff' : T.textMuted,
            border:'none', cursor: item.key ? 'pointer' : 'default', fontSize:17,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow: item.key === view ? '0 2px 8px #4F46E540' : 'none',
            transition:'all .15s',
          }}>{item.icon}</button>
      ))}
      <a href="/worksheet" title="Work Sheet" style={{
        width:40, height:40, borderRadius:10, background:'transparent', color:T.textMuted,
        textDecoration:'none', fontSize:17, display:'flex', alignItems:'center', justifyContent:'center',
      }}>▦</a>
      <div style={{ width:28, height:1, background:T.border, margin:'6px 0' }} />
      {bottomItems.map(item => (
        <button key={item.label} title={item.label} onClick={() => item.key && onViewChange(item.key)} style={{
          width:40, height:40, borderRadius:10, background:item.key === view ? T.indigo : 'transparent',
          color:item.key === view ? '#FFFFFF' : T.textMuted, border:'none', cursor:item.key ? 'pointer' : 'default', fontSize:17,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>{item.icon}</button>
      ))}
      <div style={{ flex:1 }} />
      <div style={{ width:28, height:1, background:T.border, margin:'6px 0' }} />
      <button title="Settings" style={{ width:40,height:40,borderRadius:10,background:'transparent',color:T.textMuted,border:'none',cursor:'pointer',fontSize:17,display:'flex',alignItems:'center',justifyContent:'center' }}>⚙</button>
      <div style={{
        width:32, height:32, borderRadius:'50%',
        background:'linear-gradient(135deg,#4F46E5,#7C3AED)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:11, fontWeight:700, color:'#fff', cursor:'pointer',
        boxShadow:'0 2px 6px #4F46E540',
      }}>TL</div>
    </nav>
  )
}

// ── 3D Office Panel ───────────────────────────────────────────────
function Panel3D() {
  const { viewMode, setViewMode, aiRobotActive, setAiRobotActive } = useOfficeStore()
  const { tasks } = useTaskStore()
  const { receiveAiMessage } = useChatStore()
  const activeProjectId = usePrefsStore(s => s.prefs.activeProjectId)

  // MockAgentService — Phase 2 จะ swap เป็น RealAgentService
  const agent = React.useMemo(() => new MockAgentService({
    onMessage:     (text, qr) => receiveAiMessage(activeProjectId, text, qr),
    onTyping:      () => {},
    onRobotActive: (active) => setAiRobotActive(active),
  }), [activeProjectId, receiveAiMessage, setAiRobotActive])

  function handleReview() {
    if (aiRobotActive) return
    const agentTasks = tasks.map(t => ({
      id:      t.id,
      title:   t.title,
      status:  t.status,
      blocker: t.blocker,
      owner:   t.ownerId,
      dueDate: t.dueDate,
    }))
    agent.startReview(agentTasks)
  }

  return (
    <div style={{ flex:1, background:T.bg, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Toolbar */}
      <div style={{
        height:44, background:T.surface,
        borderBottom:`1px solid ${T.border}`,
        display:'flex', alignItems:'center', padding:'0 16px', gap:8, flexShrink:0,
      }}>
        <span style={{ fontSize:10,fontWeight:700,letterSpacing:'.1em',color:T.textMuted,textTransform:'uppercase' }}>Digital Office</span>
        <div style={{ width:1,height:16,background:T.border }} />

        {([
          { key:'all',       label:'⬡ All Zones' },
          { key:'attention', label:'⚠ Attention'  },
          { key:'focus',     label:'🔍 Focus'      },
        ] as const).map(m => (
          <button key={m.key} onClick={() => setViewMode(m.key)} style={{
            fontSize:12, padding:'5px 14px', borderRadius:20, cursor:'pointer', fontWeight:500,
            background: viewMode===m.key
              ? (m.key==='attention' ? T.amberBg : T.indigoBg)
              : 'transparent',
            border:`1.5px solid ${viewMode===m.key
              ? (m.key==='attention' ? '#FCD34D' : T.borderMid)
              : T.border}`,
            color: viewMode===m.key
              ? (m.key==='attention' ? T.amber : T.indigo)
              : T.textSub,
            transition:'all .15s',
          }}>{m.label}</button>
        ))}

        <div style={{ flex:1 }} />

        <span style={{
          fontSize:11, fontWeight:600, padding:'4px 12px', borderRadius:10,
          background:T.indigoBg, border:`1px solid ${T.borderMid}`, color:T.indigo,
        }}>
          {viewMode==='all' ? 'Overview' : viewMode==='attention' ? 'Attention filter' : 'Focus mode'}
        </span>

        <button onClick={handleReview} disabled={aiRobotActive} style={{
          fontSize:12, padding:'6px 18px', borderRadius:20, cursor: aiRobotActive ? 'not-allowed' : 'pointer',
          background: aiRobotActive
            ? T.surfaceAlt
            : 'linear-gradient(135deg,#4F46E5,#7C3AED)',
          border: aiRobotActive ? `1px solid ${T.border}` : 'none',
          color: aiRobotActive ? T.textMuted : '#fff',
          fontWeight:700, boxShadow: aiRobotActive ? 'none' : '0 2px 10px #4F46E550',
          opacity: aiRobotActive ? 0.7 : 1, transition:'all .2s',
        }}>
          {aiRobotActive ? '🤖 Scanning...' : '🤖 AI Review'}
        </button>
      </div>

      {/* 3D Scene */}
      <div style={{ flex:1, position:'relative', overflow:'hidden', background:'#F0F4FF', minHeight:0 }}>
        <OfficeScene />

        {/* Legend overlay */}
        <div style={{ position:'absolute',bottom:12,left:0,right:0,display:'flex',justifyContent:'center',gap:16,pointerEvents:'none' }}>
          {LEGEND.map(s => (
            <div key={s.label} style={{ display:'flex',alignItems:'center',gap:5,fontSize:11,color:T.textSub,fontWeight:500,background:'rgba(255,255,255,0.85)',padding:'3px 10px',borderRadius:20,border:`1px solid ${T.border}` }}>
              <span style={{ width:8,height:8,borderRadius:'50%',background:s.dot }} />
              {s.label}
            </div>
          ))}
        </div>

        {/* Drag hint */}
        <div style={{ position:'absolute',top:10,right:14,fontSize:10,color:T.textMuted,background:'rgba(255,255,255,0.85)',padding:'3px 10px',borderRadius:10,border:`1px solid ${T.border}`,pointerEvents:'none' }}>
          🖱 Drag to rotate · Scroll to zoom
        </div>
      </div>
    </div>
  )
}

// ── Project Pulse ─────────────────────────────────────────────────
function ProjectPulse() {
  const { stats } = useTaskStore()
  const kpis = [
    { value:stats.done,    label:'Done',        bg:T.greenBg,  border:'#6EE7B7', color:T.green,  text:T.greenText },
    { value:stats.working, label:'In Progress',  bg:T.blueBg,   border:'#93C5FD', color:T.blue,   text:'#1E40AF' },
    { value:stats.risk,    label:'At Risk',      bg:T.amberBg,  border:'#FCD34D', color:T.amber,  text:T.amberText },
    { value:stats.blocked, label:'Blocked',      bg:T.redBg,    border:'#FCA5A5', color:T.red,    text:T.redText },
  ]
  return (
    <div style={{ borderBottom:`1px solid ${T.border}`, padding:'14px 16px', flexShrink:0, background:T.surface }}>
      <SectionTitle color={T.indigo} icon="📊">Project Pulse</SectionTitle>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {kpis.map(k => (
          <div key={k.label} style={{
            background:k.bg, border:`1.5px solid ${k.border}`,
            borderRadius:12, padding:'10px 14px',
            boxShadow:`0 2px 8px ${k.border}40`,
          }}>
            <div style={{ fontSize:28,fontWeight:800,color:k.color,lineHeight:1,marginBottom:2 }}>{k.value}</div>
            <div style={{ fontSize:10,color:k.text,fontWeight:600 }}>{k.label}</div>
          </div>
        ))}
      </div>
      {/* Progress */}
      <div style={{ marginTop:12 }}>
        <div style={{ display:'flex',justifyContent:'space-between',fontSize:11,color:T.textSub,marginBottom:6,fontWeight:500 }}>
          <span>Overall progress</span>
          <span style={{ color:T.indigo,fontWeight:700 }}>{stats.progress}%</span>
        </div>
        <div style={{ height:8,background:T.indigoBg,borderRadius:4,overflow:'hidden',border:`1px solid ${T.borderMid}` }}>
          <div style={{
            height:'100%', width:`${stats.progress}%`,
            background:'linear-gradient(90deg,#4F46E5,#7C3AED)',
            borderRadius:4, transition:'width .6s ease',
          }} />
        </div>
      </div>
    </div>
  )
}

// ── Event Stream ──────────────────────────────────────────────────
function EventStream() {
  const { events } = useEventStore()
  const activeProjectId = usePrefsStore(s => s.prefs.activeProjectId)
  const projectEvents = events.filter(event => event.projectId === activeProjectId)
  return (
    <div style={{ height:210, flexShrink:0, display:'flex',flexDirection:'column',overflow:'hidden',borderBottom:`1px solid ${T.border}`,background:T.surfaceAlt }}>
      <div style={{ padding:'12px 16px 0',flexShrink:0 }}>
        <SectionTitle color={T.sky} icon="⚡">Event Stream</SectionTitle>
      </div>
      <div style={{ flex:1,overflowY:'auto',padding:'0 10px 10px' }}>
        {projectEvents.map((ev, i) => (
          <div key={ev.id} style={{
            display:'flex', alignItems:'flex-start', gap:10,
            padding:'8px 10px', borderRadius:10, marginBottom:3, cursor:'pointer',
            background: i===0 ? T.indigoBg : 'transparent',
            border: i===0 ? `1px solid ${T.borderMid}` : '1px solid transparent',
            transition:'all .1s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background=T.indigoBg; e.currentTarget.style.borderColor=T.borderMid }}
            onMouseLeave={e => { e.currentTarget.style.background=i===0?T.indigoBg:'transparent'; e.currentTarget.style.borderColor=i===0?T.borderMid:'transparent' }}
          >
            <span style={{ fontSize:14,flexShrink:0,marginTop:1 }}>{EVENT_ICON[ev.type]??'📌'}</span>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontFamily:'monospace',fontSize:9,color:T.textMuted,marginBottom:2,fontWeight:600,letterSpacing:'.02em' }}>{ev.type}</div>
              <div style={{ fontSize:11,color:T.text,lineHeight:1.4,fontWeight:500 }}>{ev.message}</div>
            </div>
            <div style={{ fontSize:9,color:T.textMuted,flexShrink:0,marginTop:2,fontWeight:500 }}>
              {new Date(ev.timestamp).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})}
            </div>
          </div>
        ))}
        {projectEvents.length === 0 && (
          <div style={{ padding:'28px 12px', textAlign:'center', color:T.textMuted, fontSize:11, lineHeight:1.5 }}>
            ยังไม่มีกิจกรรมในโครงการนี้<br />อัปเดต task หรือใช้ AI Agent เพื่อเริ่มบันทึก activity
          </div>
        )}
      </div>
    </div>
  )
}


// ── Shared ────────────────────────────────────────────────────────
function SectionTitle({ children, color, icon }: { children: React.ReactNode; color: string; icon?: string }) {
  return (
    <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:10 }}>
      {icon && <span style={{ fontSize:13 }}>{icon}</span>}
      <span style={{ fontSize:10,fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',color:color }}>{children}</span>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────
export default function AIDigitalOffice() {
  const [view, setView] = React.useState<'office' | 'board' | 'timeline' | 'calendar' | 'gantt' | 'resources'>('office')
  const [showHub, setShowHub] = React.useState(true)

  if (showHub) {
    return <><ApiDataHydrator /><ProjectHub onOpenWorkspace={() => setShowHub(false)} /></>
  }

  return (
    <>
      <ApiDataHydrator />
      <style>{`
        @keyframes pulseDesk {
          0%,100% { box-shadow:0 2px 10px #FCA5A560; }
          50%      { box-shadow:0 2px 20px #EF444480; }
        }
        @keyframes pulseBot {
          0%,100% { box-shadow:0 4px 14px #05996930; }
          50%      { box-shadow:0 4px 22px #05996960; }
        }
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:#C7D2FE; border-radius:2px; }
        input::placeholder { color:#9CA3AF; }
      `}</style>

      <div style={{
        height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden',
        fontFamily:'Arial, sans-serif', fontSize:13, color:T.text, background:T.bg,
      }}>
        <Topbar onOpenProjectHub={() => setShowHub(true)} />
        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
          <Sidebar view={view} onViewChange={setView} />
          <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
            {view === 'board' ? (
              <TaskBoard />
            ) : view === 'timeline' ? (
              <ProjectTimeline />
            ) : view === 'calendar' ? (
              <ProjectCalendarView />
            ) : view === 'gantt' ? (
              <ProjectGanttView />
            ) : view === 'resources' ? (
              <ResourceWorkloadView />
            ) : (
              <>
                <ProjectOverviewDashboard />
                <div style={{
                  width:380, flexShrink:0, display:'flex', flexDirection:'column', overflow:'hidden',
                  background:T.surface, borderLeft:`1px solid ${T.border}`,
                  boxShadow:'-2px 0 12px #4F46E510',
                }}>
                  <EventStream />
                  <div style={{ flex:1, minHeight:0 }}><ChatPanel height="100%" /></div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

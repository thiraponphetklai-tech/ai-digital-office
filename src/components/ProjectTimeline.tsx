'use client'

import { usePrefsStore, useProjectStore } from '@/store'
import type { MilestoneStatus } from '@/types'

const statusStyle: Record<MilestoneStatus, { label: string; color: string; background: string }> = {
  COMPLETED: { label: 'Completed', color: '#047857', background: '#ECFDF5' },
  ON_TRACK: { label: 'On track', color: '#1D4ED8', background: '#EFF6FF' },
  AT_RISK: { label: 'At risk', color: '#B45309', background: '#FFFBEB' },
  UPCOMING: { label: 'Upcoming', color: '#667085', background: '#F2F4F7' },
}

export function ProjectTimeline() {
  const { projects } = useProjectStore()
  const { prefs } = usePrefsStore()
  const project = projects.find(item => item.id === prefs.activeProjectId)
  const milestones = [...(project?.milestones ?? [])].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <main style={{ flex: 1, overflowY: 'auto', padding: 28, background: 'var(--color-main-bg)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', color: '#4F46E5' }}>PROJECT TIMELINE</div>
          <h1 style={{ margin: '5px 0 4px', fontSize: 26, color: '#172033' }}>{project?.name ?? 'Select a project'}</h1>
          <p style={{ margin: 0, color: '#667085', fontSize: 13 }}>Milestones are managed from Project Settings and stored locally for this mock.</p>
        </div>
        <section style={{ background: 'var(--color-main-surface)', border: '1px solid var(--color-main-border)', borderRadius: 16, padding: '8px 22px', boxShadow: '0 2px 8px rgba(31,36,48,.04)' }}>
          {milestones.length ? milestones.map((milestone, index) => {
            const style = statusStyle[milestone.status]
            return <div key={milestone.id} style={{ display: 'grid', gridTemplateColumns: '105px 28px 1fr auto', gap: 12, alignItems: 'stretch', minHeight: 92 }}>
              <div style={{ paddingTop: 25, color: '#667085', fontSize: 12, fontWeight: 700 }}>{new Date(`${milestone.date}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}><span style={{ width: 14, height: 14, flexShrink: 0, marginTop: 24, borderRadius: '50%', background: style.color, border: '3px solid #FFFFFF', boxShadow: `0 0 0 2px ${style.color}` }} />{index < milestones.length - 1 && <span style={{ width: 2, flex: 1, marginTop: 8, background: '#DDE5F5' }} />}</div>
              <div style={{ padding: '19px 0 18px' }}><strong style={{ display: 'block', color: '#172033', fontSize: 14 }}>{milestone.title}</strong>{milestone.description && <p style={{ margin: '5px 0 0', color: '#667085', fontSize: 12 }}>{milestone.description}</p>}{milestone.owner && <span style={{ display: 'inline-block', marginTop: 7, color: '#667085', fontSize: 11 }}>Owner: {milestone.owner}</span>}</div>
              <div style={{ paddingTop: 22 }}><span style={{ whiteSpace: 'nowrap', padding: '5px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, color: style.color, background: style.background }}>{style.label}</span></div>
            </div>
          }) : <div style={{ padding: '40px 0', color: '#98A2B3', textAlign: 'center', fontSize: 13 }}>ยังไม่มี Milestone — เพิ่มได้จาก Project Settings</div>}
        </section>
      </div>
    </main>
  )
}

'use client'

import React from 'react'
import { useProjectStore, useResourceStore } from '@/store'
import type { ResourceType } from '@/types'

interface ProjectResourcesDialogProps {
  projectId: string
  onClose: () => void
}

export function ProjectResourcesDialog({ projectId, onClose }: ProjectResourcesDialogProps) {
  const { projects, updateProject } = useProjectStore()
  const { resources, addResource } = useResourceStore()
  const project = projects.find(item => item.id === projectId)
  const [name, setName] = React.useState('')
  const [type, setType] = React.useState<ResourceType>('EMPLOYEE')
  const [role, setRole] = React.useState('')
  const [company, setCompany] = React.useState('')
  const [capacity, setCapacity] = React.useState(8)
  const projectResourceIds = project?.resourceIds ?? []

  function toggleProjectResource(resourceId: string) {
    if (!project) return
    const resourceIds = projectResourceIds.includes(resourceId)
      ? projectResourceIds.filter(id => id !== resourceId)
      : [...projectResourceIds, resourceId]
    updateProject(project.id, { resourceIds })
  }

  function addPlayer() {
    if (!project || !name.trim() || !role.trim()) return
    const id = `resource-${Date.now()}`
    addResource({ id, name: name.trim(), type, role: role.trim(), company: type === 'VENDOR' ? company.trim() || undefined : undefined, capacityHoursPerDay: Math.max(1, capacity), active: true })
    updateProject(project.id, { resourceIds: [...projectResourceIds, id] })
    setName('')
    setRole('')
    setCompany('')
    setCapacity(8)
  }

  return <div style={{ position:'fixed', inset:0, zIndex:60, background:'rgba(15,23,42,.38)', display:'grid', placeItems:'center', padding:20 }}>
    <section role="dialog" aria-modal="true" aria-labelledby="resources-title" style={{ width:'min(650px, 100%)', maxHeight:'calc(100vh - 40px)', overflowY:'auto', background:'#FFFFFF', borderRadius:16, padding:24, boxShadow:'0 24px 64px rgba(15,23,42,.26)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:16 }}><div><div style={{ fontSize:11, fontWeight:800, letterSpacing:'.08em', color:'#4F46E5' }}>PROJECT RESOURCES</div><h2 id="resources-title" style={{ margin:'7px 0 4px', fontSize:20, color:'#172033' }}>Resources / Players</h2><p style={{ margin:0, color:'#667085', fontSize:12 }}>{project?.name}</p></div><button type="button" onClick={onClose} aria-label="Close" style={closeStyle}>×</button></div>
      <div style={{ marginTop:20, padding:'16px', background:'#F8FAFF', border:'1px solid #E0E7FF', borderRadius:12 }}><strong style={{ color:'#344054', fontSize:13 }}>Add player</strong><div style={{ display:'grid', gridTemplateColumns:'1fr 130px', gap:8, marginTop:10 }}><input value={name} onChange={event => setName(event.target.value)} placeholder="Name" style={inputStyle} /><select value={type} onChange={event => setType(event.target.value as ResourceType)} style={inputStyle}><option value="EMPLOYEE">Employee</option><option value="VENDOR">Vendor</option></select><input value={role} onChange={event => setRole(event.target.value)} placeholder="Role / capability" style={inputStyle} />{type === 'VENDOR' ? <input value={company} onChange={event => setCompany(event.target.value)} placeholder="Company" style={inputStyle} /> : <label style={{ ...inputStyle, display:'flex', alignItems:'center', gap:7 }}>Capacity<input type="number" min="1" max="24" value={capacity} onChange={event => setCapacity(Number(event.target.value))} style={{ width:50, border:'none', outline:'none', background:'transparent' }} />hrs/day</label>}</div><button type="button" onClick={addPlayer} style={{ marginTop:10, border:'none', borderRadius:8, padding:'8px 12px', cursor:'pointer', background:'#4F46E5', color:'#FFFFFF', fontSize:12, fontWeight:800 }}>+ Add Player to Project</button></div>
      <div style={{ marginTop:20 }}><div style={{ color:'#475467', fontSize:12, fontWeight:800, marginBottom:8 }}>Resource directory — select resources available to this project</div>{resources.map(resource => <label key={resource.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 4px', borderBottom:'1px solid #F2F4F7', cursor:'pointer' }}><input type="checkbox" checked={projectResourceIds.includes(resource.id)} onChange={() => toggleProjectResource(resource.id)} /><div style={{ flex:1 }}><strong style={{ display:'block', color:'#344054', fontSize:13 }}>{resource.name}</strong><span style={{ color:'#667085', fontSize:11 }}>{resource.role}{resource.company ? ` · ${resource.company}` : ''} · {resource.capacityHoursPerDay} hrs/day</span></div><span style={{ padding:'4px 7px', borderRadius:6, color:resource.type === 'VENDOR' ? '#6D28D9' : '#1D4ED8', background:resource.type === 'VENDOR' ? '#F5F3FF' : '#EFF6FF', fontSize:10, fontWeight:800 }}>{resource.type}</span></label>)}</div>
      <div style={{ display:'flex', justifyContent:'end', marginTop:20 }}><button type="button" onClick={onClose} style={{ border:'none', borderRadius:8, padding:'9px 14px', cursor:'pointer', background:'#4F46E5', color:'#FFFFFF', fontSize:12, fontWeight:800 }}>Done</button></div>
    </section>
  </div>
}

const inputStyle = { width:'100%', border:'1px solid #D8DEE9', borderRadius:8, padding:'8px', color:'#344054', background:'#FFFFFF', fontSize:12 } as const
const closeStyle = { width:28, height:28, border:'1px solid #E5EAF2', borderRadius:7, background:'#FFFFFF', cursor:'pointer', color:'#667085', fontSize:20, lineHeight:1 } as const

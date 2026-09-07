'use client'

import React, { useEffect, useState } from 'react'

type LineGroup = { id: string; name: string; recipientIdMasked: string; active: boolean; selected: boolean }
type LineConfigStatus = { configured: boolean; recipientIdMasked: string | null; source: 'database' | 'environment' | null; updatedAt: string | null; groups?: LineGroup[]; webhookUrl?: string | null }

export function LineSettingsDialog({ projectId, projectName, onClose }: { projectId: string; projectName: string; onClose: () => void }) {
  const [status, setStatus] = useState<LineConfigStatus | null>(null)
  const [channelAccessToken, setChannelAccessToken] = useState('')
  const [channelSecret, setChannelSecret] = useState('')
  const [recipientId, setRecipientId] = useState('')
  const [groupName, setGroupName] = useState('')
  const [groupId, setGroupId] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState('')
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [findingGroups, setFindingGroups] = useState(false)
  const [discoveryMessage, setDiscoveryMessage] = useState('')

  async function load() {
    setError('')
    const response = await fetch(`/api/admin/line-settings?projectId=${encodeURIComponent(projectId)}`)
    const data = await response.json().catch(() => ({})) as LineConfigStatus & { error?: string }
    if (!response.ok) return setError(data.error ?? 'Unable to load LINE configuration.')
    setStatus(data)
  }

  useEffect(() => { void load() }, [])

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setNotice(''); setError(''); setSaving(true)
    try {
      const response = await fetch('/api/admin/line-settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelAccessToken: channelAccessToken || undefined, channelSecret: channelSecret || undefined, recipientId: recipientId || undefined }),
      })
      const data = await response.json().catch(() => ({})) as LineConfigStatus & { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Unable to save LINE configuration.')
      setStatus(data); setChannelAccessToken(''); setChannelSecret(''); setRecipientId('')
      setNotice('LINE configuration was saved securely.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save LINE configuration.')
    } finally {
      setSaving(false)
    }
  }

  async function loadPreview() {
    setError(''); setLoadingPreview(true)
    try {
      const response = await fetch(`/api/admin/line-settings/preview?projectId=${encodeURIComponent(projectId)}`)
      const data = await response.json().catch(() => ({})) as { text?: string; error?: string }
      if (!response.ok || !data.text) throw new Error(data.error ?? 'Unable to generate preview.')
      setPreview(data.text)
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : 'Unable to generate preview.')
    } finally {
      setLoadingPreview(false)
    }
  }

  async function manageGroup(body: Record<string, string>, method: 'POST' | 'DELETE' = 'POST') {
    setError(''); setNotice('')
    const query = method === 'DELETE' ? `?groupId=${encodeURIComponent(body.groupId)}` : ''
    const response = await fetch(`/api/admin/line-settings${query}`, { method, headers: { 'Content-Type': 'application/json' }, body: method === 'POST' ? JSON.stringify({ ...body, projectId }) : undefined })
    const data = await response.json().catch(() => ({})) as LineConfigStatus & { error?: string }
    if (!response.ok) return setError(data.error ?? 'Unable to update LINE groups.')
    setStatus(data); setGroupName(''); setGroupId(''); setNotice('LINE group list was updated.')
  }

  async function discoverGroups() {
    setNotice(''); setError(''); setDiscoveryMessage('กำลังตรวจรายการกลุ่มที่ webhook ค้นพบ…'); setFindingGroups(true)
    try {
      const response = await fetch(`/api/admin/line-settings?projectId=${encodeURIComponent(projectId)}`)
      const data = await response.json().catch(() => ({})) as LineConfigStatus & { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'Unable to refresh LINE groups.')
      setStatus(data)
      const count = data.groups?.length ?? 0
      setDiscoveryMessage(count ? `พบ ${count} กลุ่มแล้ว เลือก Use เพื่อกำหนดเป็นปลายทางหลัก` : 'ยังไม่พบกลุ่ม: เชิญ Bot เข้ากลุ่ม ส่งข้อความ 1 ข้อความ แล้วกดค้นหาอีกครั้ง')
    } catch (discoveryError) {
      setDiscoveryMessage('')
      setError(discoveryError instanceof Error ? discoveryError.message : 'Unable to refresh LINE groups.')
    } finally { setFindingGroups(false) }
  }

  return <div style={overlay}><section role="dialog" aria-modal="true" aria-labelledby="line-settings-title" style={dialog}>
    <div style={header}><div><div style={eyebrow}>SYSTEM ADMIN</div><h2 id="line-settings-title" style={title}>LINE integration</h2><p style={subtitle}>ตั้งค่า token และกลุ่มปลายทางสำหรับรายงานโครงการใน LINE</p></div><button onClick={onClose} aria-label="Close LINE settings" style={closeButton}>×</button></div>
    <div style={statusCard}><strong style={{ color: status?.configured ? '#047857' : '#B45309' }}>{status?.configured ? 'Configured' : 'Not configured'}</strong><span>{status?.configured ? `Recipient: ${status.groups?.find(group => group.selected)?.recipientIdMasked ?? status.recipientIdMasked}${status.updatedAt ? ` · updated ${new Date(status.updatedAt).toLocaleString('th-TH')}` : ''}` : 'ยังไม่มี LINE configuration ที่พร้อมใช้งาน'}</span></div>
    <div style={{ marginTop:14, padding:'12px', border:'1px solid #DDE5F5', borderRadius:10 }}><div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}><strong style={{ fontSize:12, color:'#344054' }}>LINE Groups for this project</strong><button type="button" disabled={findingGroups} onClick={() => void discoverGroups()} style={{ ...secondary, opacity:findingGroups ? .65 : 1 }}>{findingGroups ? 'Searching…' : '↻ Find Group ID from LINE'}</button></div><p style={{ ...helper, marginTop:8 }}>เลือก Use เพื่อกำหนดกลุ่มเฉพาะ {projectName}; จะไม่เปลี่ยนกลุ่มของโปรเจคอื่น<br/>ตั้ง Webhook URL: <code>{status?.webhookUrl ?? 'APP_BASE_URL is not configured'}</code></p>{discoveryMessage && <p style={{ margin:'0 0 9px', padding:'8px 10px', borderRadius:7, background:'#ECFDF5', color:'#047857', fontSize:12, lineHeight:1.45 }}>{discoveryMessage}</p>}<div style={{ display:'grid', gap:7, marginTop:9 }}>{status?.groups?.map(group => <div key={group.id} style={{ display:'flex', gap:7, alignItems:'center', fontSize:12 }}><span style={{ flex:1 }}>{group.selected ? '✓ ' : ''}{group.name} · {group.recipientIdMasked}</span><button type="button" onClick={() => void manageGroup({ selectedGroupId: group.id })} style={secondary}>Use</button><button type="button" onClick={() => void manageGroup({ groupId: group.id }, 'DELETE')} style={secondary}>Remove</button></div>)}</div><div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:7, marginTop:10 }}><input value={groupName} onChange={event => setGroupName(event.target.value)} placeholder="Group name" style={input}/><input value={groupId} onChange={event => setGroupId(event.target.value)} placeholder="Group ID (C...)" style={input}/><button type="button" disabled={!groupName || !groupId} onClick={() => void manageGroup({ name: groupName, recipientId: groupId })} style={primary}>Add</button></div></div>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, marginTop:14, padding:'10px 12px', border:'1px solid #DDE5F5', borderRadius:10, background:'#F8FAFF' }}><span style={{ color:'#475467', fontSize:12 }}>Preview รายงานของ {projectName} โดยไม่ส่ง LINE</span><button type="button" onClick={() => void loadPreview()} disabled={loadingPreview} style={{ ...secondary, padding:'7px 10px', opacity:loadingPreview ? .65 : 1 }}>{loadingPreview ? 'Loading...' : 'Preview project update'}</button></div>{preview && <pre style={previewStyle}>{preview}</pre>}
    <form onSubmit={save} style={{ marginTop:18 }}><p style={helper}>เพื่อความปลอดภัย ระบบจะไม่แสดงค่าเดิมอีกครั้ง หากต้องการเปลี่ยนเฉพาะช่องใด ให้กรอกเฉพาะช่องนั้น</p><label style={label}>LINE Channel access token<input type="password" autoComplete="off" value={channelAccessToken} onChange={event => setChannelAccessToken(event.target.value)} placeholder={status?.configured ? 'Leave blank to keep the current token' : 'Paste a new channel access token'} style={input} /></label><label style={label}>LINE Channel secret (Webhook verification)<input type="password" autoComplete="off" value={channelSecret} onChange={event => setChannelSecret(event.target.value)} placeholder="From LINE Developers Console → Basic settings" style={input} /></label><label style={label}>Legacy Recipient ID (optional)<input autoComplete="off" value={recipientId} onChange={event => setRecipientId(event.target.value)} placeholder={status?.recipientIdMasked ?? 'Use LINE Groups above'} style={input} /></label>{notice && <p style={success}>{notice}</p>}{error && <p style={failure}>{error}</p>}<div style={{ display:'flex', justifyContent:'end', gap:8, marginTop:20 }}><button type="button" onClick={onClose} disabled={saving} style={secondary}>Cancel</button><button type="submit" disabled={saving || (!channelAccessToken && !channelSecret && !recipientId)} style={{ ...primary, opacity:saving || (!channelAccessToken && !channelSecret && !recipientId) ? .65 : 1 }}>{saving ? 'Saving...' : 'Save LINE settings'}</button></div></form>
  </section></div>
}

const overlay: React.CSSProperties = { position:'fixed', inset:0, zIndex:100, background:'rgba(15,23,42,.45)', display:'grid', placeItems:'center', padding:20 }
const dialog: React.CSSProperties = { width:'min(520px, 100%)', maxHeight:'calc(100vh - 40px)', overflowY:'auto', background:'#fff', borderRadius:16, padding:24, boxShadow:'0 24px 64px rgba(15,23,42,.26)', fontFamily:'Arial,sans-serif' }
const header: React.CSSProperties = { display:'flex', justifyContent:'space-between', gap:16 }
const eyebrow: React.CSSProperties = { color:'#4C3FE0', fontSize:11, fontWeight:800, letterSpacing:'.08em' }
const title: React.CSSProperties = { margin:'6px 0 4px', fontSize:20, color:'#1F2430' }
const subtitle: React.CSSProperties = { margin:0, color:'#667085', fontSize:12, lineHeight:1.5 }
const closeButton: React.CSSProperties = { border:'1px solid #D8DEE9', borderRadius:7, width:30, height:30, background:'#fff', color:'#667085', fontSize:20, cursor:'pointer' }
const statusCard: React.CSSProperties = { display:'grid', gap:4, marginTop:18, padding:'12px 14px', border:'1px solid #DDE5F5', borderRadius:10, background:'#F8FAFF', fontSize:12, color:'#667085' }
const helper: React.CSSProperties = { margin:'0 0 14px', color:'#667085', fontSize:12, lineHeight:1.5 }
const label: React.CSSProperties = { display:'block', marginTop:12, color:'#475467', fontSize:12, fontWeight:700 }
const input: React.CSSProperties = { display:'block', width:'100%', marginTop:6, border:'1px solid #D8DEE9', borderRadius:8, padding:'10px 11px', color:'#172033', background:'#fff', fontSize:13, boxSizing:'border-box' }
const success: React.CSSProperties = { margin:'14px 0 0', color:'#047857', fontSize:12, fontWeight:700 }
const failure: React.CSSProperties = { margin:'14px 0 0', color:'#B91C1C', fontSize:12, lineHeight:1.5 }
const previewStyle: React.CSSProperties = { maxHeight:220, overflow:'auto', margin:'10px 0 0', padding:12, borderRadius:10, background:'#172033', color:'#EAF6F5', fontFamily:'ui-monospace, monospace', fontSize:11, lineHeight:1.55, whiteSpace:'pre-wrap' }
const primary: React.CSSProperties = { border:'none', borderRadius:8, padding:'9px 13px', background:'#4C3FE0', color:'#fff', cursor:'pointer', fontSize:12, fontWeight:800 }
const secondary: React.CSSProperties = { border:'1px solid #D8DEE9', borderRadius:8, padding:'9px 13px', background:'#fff', color:'#475467', cursor:'pointer', fontSize:12, fontWeight:700 }

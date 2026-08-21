'use client'
import React, { useRef, useEffect } from 'react'
import {
  useTaskStore, useEventStore, useOfficeStore,
  usePrefsStore, useChatStore,
} from '@/store'
import { MOCK_PROJECT } from '@/data/mockData'

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
function Topbar() {
  const { stats } = useTaskStore()
  const { prefs, toggleDnd } = usePrefsStore()

  return (
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

      {/* Project pill */}
      <div style={{
        display:'flex', alignItems:'center', gap:8,
        background:T.indigoBg, border:`1.5px solid ${T.borderMid}`,
        borderRadius:20, padding:'6px 16px', cursor:'pointer',
      }}>
        <span style={{ width:8, height:8, borderRadius:'50%', background:T.indigo }} />
        <span style={{ fontSize:13, fontWeight:600, color:T.indigo }}>{MOCK_PROJECT.name}</span>
        <span style={{ color:T.textMuted, fontSize:10 }}>▾</span>
      </div>

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
  )
}

// ── Sidebar ───────────────────────────────────────────────────────
function Sidebar() {
  const navItems = [
    { icon:'⬡', label:'Office',   active:true  },
    { icon:'☰', label:'Tasks',    active:false },
    { icon:'◫', label:'Timeline', active:false },
  ]
  const bottomItems = [
    { icon:'◎', label:'Team'    },
    { icon:'⊞', label:'Reports' },
  ]
  return (
    <nav style={{
      width:58, background:T.surface,
      borderRight:`1px solid ${T.border}`,
      display:'flex', flexDirection:'column', alignItems:'center',
      padding:'12px 0', gap:4, flexShrink:0,
    }}>
      {navItems.map(item => (
        <button key={item.label} title={item.label} style={{
          width:40, height:40, borderRadius:10,
          background: item.active ? T.indigo : 'transparent',
          color: item.active ? '#fff' : T.textMuted,
          border:'none', cursor:'pointer', fontSize:17,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow: item.active ? '0 2px 8px #4F46E540' : 'none',
          transition:'all .15s',
        }}>{item.icon}</button>
      ))}
      <div style={{ width:28, height:1, background:T.border, margin:'6px 0' }} />
      {bottomItems.map(item => (
        <button key={item.label} title={item.label} style={{
          width:40, height:40, borderRadius:10, background:'transparent',
          color:T.textMuted, border:'none', cursor:'pointer', fontSize:17,
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
  const { zones, viewMode, setViewMode, aiRobotActive, setAiRobotActive } = useOfficeStore()
  const { tasks } = useTaskStore()
  const { pushEvent } = useEventStore()
  const { receiveAiMessage } = useChatStore()

  function handleReview() {
    setAiRobotActive(true)
    pushEvent({ type:'ai.review_started', projectId:'phoenix', message:'AI กำลัง scan ทุก zone...', color:T.indigo })
    setTimeout(() => {
      const blocked = tasks.filter(t => t.status === 'BLOCKED')
      const atRisk  = tasks.filter(t => t.status === 'AT_RISK')
      blocked.forEach(t => pushEvent({ type:'ai.risk_detected', projectId:'phoenix', taskId:t.id, message:`${t.title} — BLOCKED`, color:T.red }))
      atRisk.forEach(t  => pushEvent({ type:'ai.risk_detected', projectId:'phoenix', taskId:t.id, message:`${t.title} — AT_RISK`,  color:T.amber }))
      pushEvent({ type:'ai.review_completed', projectId:'phoenix', message:`พบ ${blocked.length} blocked, ${atRisk.length} at risk`, color:T.green })
      receiveAiMessage(
        `สแกนเสร็จแล้วครับ 🔍\n\n` +
        `🔴 Blocked ${blocked.length} งาน: ${blocked.map(t=>t.title).join(', ')}\n` +
        `🟠 At Risk ${atRisk.length} งาน: ${atRisk.map(t=>t.title).join(', ')}\n\n` +
        `อยากให้ follow-up UAT ก่อนไหมครับ?`,
        ['Follow-up UAT ✓', 'ดูรายละเอียด']
      )
      setAiRobotActive(false)
    }, 2000)
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

      {/* Scene */}
      <div style={{ flex:1, position:'relative', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
        {/* Grid */}
        <div style={{
          position:'absolute', inset:0,
          backgroundImage:`linear-gradient(${T.border} 1px,transparent 1px),linear-gradient(90deg,${T.border} 1px,transparent 1px)`,
          backgroundSize:'36px 36px',
        }} />

        {/* Colored zone blobs */}
        <div style={{ position:'absolute',width:280,height:280,borderRadius:'50%',background:'#EEF2FF',top:'5%',left:'10%',filter:'blur(60px)',opacity:.8 }} />
        <div style={{ position:'absolute',width:220,height:220,borderRadius:'50%',background:'#F0FDF4',bottom:'10%',right:'15%',filter:'blur(60px)',opacity:.8 }} />
        <div style={{ position:'absolute',width:180,height:180,borderRadius:'50%',background:'#FEF2F2',top:'20%',right:'25%',filter:'blur(60px)',opacity:.6 }} />

        <div style={{ position:'relative', zIndex:1 }}>
          <p style={{ textAlign:'center',fontSize:10,color:T.textMuted,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:28,fontWeight:600 }}>
            {MOCK_PROJECT.name} — Digital Office
          </p>

          {/* Zones */}
          <div style={{ display:'flex', gap:40, alignItems:'flex-end' }}>
            {zones.map(zone => {
              const hasIssue = zone.desks.some(d => d.status==='BLOCKED'||d.status==='AT_RISK')
              const dimmed   = viewMode==='attention' && !hasIssue
              return (
                <div key={zone.id} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:10,opacity:dimmed?.1:1,transition:'opacity .5s' }}>
                  {/* Zone badge */}
                  <div style={{
                    fontSize:9,fontWeight:800,letterSpacing:'.12em',textTransform:'uppercase',
                    color:T.indigo, background:T.indigoBg,
                    border:`1.5px solid ${T.borderMid}`,
                    borderRadius:8, padding:'3px 12px',
                  }}>{zone.label}</div>

                  {/* Desks */}
                  <div style={{ display:'flex', gap:10 }}>
                    {zone.desks.map(desk => {
                      const s = DESK[desk.status] ?? DESK.TODO
                      return (
                        <div key={desk.id} title={`${desk.name} — ${desk.status}`} style={{
                          width:72, height:62, borderRadius:14,
                          background:s.bg, border:`2px solid ${s.border}`,
                          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                          gap:5, cursor:'pointer', transition:'all .2s',
                          boxShadow:`0 2px 10px ${s.border}60`,
                          animation: desk.status==='BLOCKED' ? 'pulseDesk 2s infinite' : 'none',
                        }}>
                          <span style={{ width:10,height:10,borderRadius:'50%',background:s.dot }} />
                          <span style={{ fontSize:10,color:s.label,fontWeight:700 }}>{desk.name}</span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Zone floor line */}
                  <div style={{ width:'100%',height:2,background:`linear-gradient(90deg,transparent,${T.borderMid},transparent)`,borderRadius:1 }} />
                </div>
              )
            })}
          </div>

          {/* AI Robot */}
          <div style={{ position:'absolute',bottom:-12,right:-90,display:'flex',flexDirection:'column',alignItems:'center',gap:5 }}>
            <div style={{
              width:40,height:44,background:T.surface,
              border:`2px solid ${aiRobotActive ? T.green : T.indigo}`,
              borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:20,boxShadow:`0 4px 14px ${aiRobotActive?T.green:T.indigo}30`,
              animation: aiRobotActive ? 'pulseBot 1s infinite' : 'none',
              transition:'all .3s',
            }}>🤖</div>
            <span style={{ fontSize:9,fontWeight:800,letterSpacing:'.06em',color:aiRobotActive?T.green:T.indigo }}>
              {aiRobotActive?'SCANNING':'AI AGENT'}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div style={{ position:'absolute',bottom:12,left:0,right:0,display:'flex',justifyContent:'center',gap:18 }}>
          {LEGEND.map(s => (
            <div key={s.label} style={{ display:'flex',alignItems:'center',gap:5,fontSize:11,color:T.textSub,fontWeight:500 }}>
              <span style={{ width:8,height:8,borderRadius:'50%',background:s.dot }} />
              {s.label}
            </div>
          ))}
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
  return (
    <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden',borderBottom:`1px solid ${T.border}`,background:T.surfaceAlt }}>
      <div style={{ padding:'12px 16px 0',flexShrink:0 }}>
        <SectionTitle color={T.sky} icon="⚡">Event Stream</SectionTitle>
      </div>
      <div style={{ flex:1,overflowY:'auto',padding:'0 10px 10px' }}>
        {events.map((ev, i) => (
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
      </div>
    </div>
  )
}

// ── Chat Panel ────────────────────────────────────────────────────
function ChatPanel() {
  const { messages, isTyping, sendMessage } = useChatStore()
  const { prefs } = usePrefsStore()
  const [input, setInput] = React.useState('')
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, isTyping])

  function send() {
    const val = input.trim()
    if (!val) return
    sendMessage(val)
    setInput('')
  }

  return (
    <div style={{ height:340,flexShrink:0,display:'flex',flexDirection:'column',background:T.surface }}>
      <div style={{ padding:'10px 16px 8px',borderBottom:`1px solid ${T.border}`,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between' }}>
        <SectionTitle color={T.green} icon="💬">LINE / AI Chat</SectionTitle>
        <span style={{
          fontSize:10,fontWeight:600,padding:'3px 10px',borderRadius:10,
          background: prefs.dndMode ? T.amberBg : T.greenBg,
          color: prefs.dndMode ? T.amber : T.green,
        }}>
          {prefs.dndMode ? '🔕 DND' : '🟢 Live'}
        </span>
      </div>

      <div ref={bodyRef} style={{ flex:1,overflowY:'auto',padding:'10px 14px',display:'flex',flexDirection:'column',gap:8 }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ alignSelf: msg.role==='me'?'flex-end':'flex-start', maxWidth:'86%' }}>
            {msg.role==='ai' && (
              <div style={{ fontSize:9,color:T.purple,marginBottom:3,marginLeft:2,fontWeight:700,letterSpacing:'.04em' }}>AI AGENT</div>
            )}
            <div style={{
              padding:'11px 15px', fontSize:13, lineHeight:1.65,
              borderRadius: msg.role==='me' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
              ...(msg.role==='me'
                ? { background:'linear-gradient(135deg,#4F46E5,#7C3AED)', color:'#fff', boxShadow:'0 2px 10px #4F46E540' }
                : { background:T.purpleBg, border:`1.5px solid #DDD6FE`, color:'#4C1D95' }),
            }}>
              {msg.text.split('\n').map((l,i,arr) => (
                <React.Fragment key={i}>{l}{i<arr.length-1&&<br/>}</React.Fragment>
              ))}
            </div>
            {msg.quickReplies && (
              <div style={{ display:'flex',gap:6,marginTop:6,flexWrap:'wrap' }}>
                {msg.quickReplies.map(qr => (
                  <button key={qr} onClick={() => sendMessage(qr)} style={{
                    fontSize:11,padding:'5px 13px',borderRadius:20,
                    background:T.indigoBg,border:`1.5px solid ${T.borderMid}`,
                    color:T.indigo,cursor:'pointer',fontWeight:600,transition:'all .1s',
                  }}>{qr}</button>
                ))}
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div style={{ alignSelf:'flex-start' }}>
            <div style={{ fontSize:9,color:T.purple,marginBottom:3,fontWeight:700 }}>AI AGENT</div>
            <div style={{ padding:'11px 15px',background:T.purpleBg,border:`1.5px solid #DDD6FE`,borderRadius:'4px 14px 14px 14px',color:T.textMuted,fontSize:13 }}>
              กำลังพิมพ์...
            </div>
          </div>
        )}
      </div>

      <div style={{ display:'flex',gap:8,padding:'8px 14px',borderTop:`1px solid ${T.border}`,flexShrink:0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==='Enter'&&send()}
          placeholder="พิมพ์คำสั่ง หรือถาม AI..."
          style={{
            flex:1, background:T.surfaceAlt, border:`1.5px solid ${T.borderMid}`,
            borderRadius:22, padding:'10px 18px', fontSize:13,
            color:T.text, outline:'none',
          }}
        />
        <button onClick={send} style={{
          width:40,height:40,borderRadius:'50%',
          background:'linear-gradient(135deg,#4F46E5,#7C3AED)',
          border:'none',color:'#fff',cursor:'pointer',fontSize:15,
          boxShadow:'0 2px 8px #4F46E550',
          display:'flex',alignItems:'center',justifyContent:'center',
        }}>➤</button>
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
  return (
    <>
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
        <Topbar />
        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
          <Sidebar />
          <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
            <Panel3D />
            {/* Right column */}
            <div style={{
              width:380, flexShrink:0, display:'flex', flexDirection:'column', overflow:'hidden',
              background:T.surface, borderLeft:`1px solid ${T.border}`,
              boxShadow:'-2px 0 12px #4F46E510',
            }}>
              <ProjectPulse />
              <EventStream />
              <ChatPanel />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

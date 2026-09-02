'use client'
import React, { useRef, useEffect, useState } from 'react'
import { useChatStore, usePrefsStore } from '@/store'

// ── Types ─────────────────────────────────────────────────────────
interface ConfirmDialog {
  message: string
  onConfirm: () => void
}

// ── Flex Message Card ─────────────────────────────────────────────
function FlexCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#F7F8FC',
      border: '1px solid #E1E6F0',
      borderRadius: 12,
      padding: '11px 12px',
      marginTop: 3,
    }}>
      {children}
    </div>
  )
}

// ── AI Review Result Card ─────────────────────────────────────────
function AIReviewCard({ text, onConfirm }: { text: string; onConfirm: (action: string) => void }) {
  const lines = text.split('\n').filter(Boolean)
  const hasBlocked = lines.some(l => l.includes('Blocked'))
  const hasRisk    = lines.some(l => l.includes('At Risk'))

  return (
    <FlexCard>
      <div style={{ fontSize:10, fontWeight:800, color:'#335CFF', letterSpacing:'.08em', marginBottom:8 }}>
        🤖 AI REVIEW RESULT
      </div>
      {lines.map((line, i) => (
        <div key={i} style={{ fontSize:12, color:'#344054', lineHeight:1.55, marginBottom:3 }}>
          {line}
        </div>
      ))}
      {(hasBlocked || hasRisk) && (
        <div style={{ display:'flex', gap:6, marginTop:9, flexWrap:'wrap' }}>
          <button
            onClick={() => onConfirm('follow-up-uat')}
            style={{
              fontSize:11, padding:'6px 10px', borderRadius:8, cursor:'pointer',
              background:'linear-gradient(135deg,#335CFF,#6D5CE7)',
              border:'none', color:'#fff', fontWeight:600,
              boxShadow:'0 5px 12px rgba(51,92,255,.20)',
            }}>
            Follow-up UAT ✓
          </button>
          <button
            onClick={() => onConfirm('view-detail')}
            style={{
              fontSize:11, padding:'6px 10px', borderRadius:8, cursor:'pointer',
              background:'#F7F8FC', border:'1px solid #D8DEE9',
              color:'#344054', fontWeight:650,
            }}>
            ดูรายละเอียด
          </button>
        </div>
      )}
    </FlexCard>
  )
}

// ── Risk Alert Card ───────────────────────────────────────────────
function RiskAlertCard({ task, blocker, onFollowUp }: {
  task: string; blocker: string; onFollowUp: () => void
}) {
  return (
    <FlexCard>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        <span style={{ fontSize:16 }}>⚠️</span>
        <div>
          <div style={{ fontSize:10, fontWeight:800, color:'#DC2626', letterSpacing:'.06em' }}>RISK DETECTED</div>
          <div style={{ fontSize:12, fontWeight:650, color:'#172033' }}>{task}</div>
        </div>
      </div>
      <div style={{ fontSize:11, color:'#667085', marginBottom:10, lineHeight:1.5 }}>
        Blocker: <span style={{ color:'#DC2626', fontWeight:600 }}>{blocker}</span>
      </div>
      <button onClick={onFollowUp} style={{
        fontSize:11, padding:'6px 10px', borderRadius:8, cursor:'pointer',
        background:'#FFF5F5', border:'1px solid #FECACA',
        color:'#DC2626', fontWeight:600,
      }}>
        🔔 Follow-up owner
      </button>
    </FlexCard>
  )
}

// ── Confirm Dialog ────────────────────────────────────────────────
function ConfirmDialogBox({ dialog, onClose }: {
  dialog: ConfirmDialog; onClose: () => void
}) {
  return (
    <div style={{
      position:'absolute', bottom:78, left:12, right:12, zIndex:50,
      background:'#fff', border:'1px solid #D8DEE9',
      borderRadius:14, padding:'13px 14px',
      boxShadow:'0 16px 40px rgba(16,24,40,.14)',
    }}>
      <div style={{ fontSize:12, color:'#344054', marginBottom:12, lineHeight:1.55 }}>
        {dialog.message}
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => { dialog.onConfirm(); onClose() }} style={{
          flex:1, fontSize:12, padding:'8px 0', borderRadius:9, cursor:'pointer',
          background:'linear-gradient(135deg,#335CFF,#6D5CE7)',
          border:'none', color:'#fff', fontWeight:600,
          boxShadow:'0 5px 12px rgba(51,92,255,.18)',
        }}>
          ยืนยัน ✓
        </button>
        <button onClick={onClose} style={{
          flex:1, fontSize:12, padding:'8px 0', borderRadius:9, cursor:'pointer',
          background:'#F8FAFC', border:'1px solid #E4E7EC',
          color:'#667085', fontWeight:600,
        }}>
          ยกเลิก
        </button>
      </div>
    </div>
  )
}

// ── DND Controls ──────────────────────────────────────────────────
function DNDBar({ onClose }: { onClose: () => void }) {
  const { toggleDnd } = usePrefsStore()
  const opts = [
    { label:'2 ชั่วโมง', hours:2 },
    { label:'4 ชั่วโมง', hours:4 },
    { label:'จนกว่าจะยกเลิก', hours:undefined },
  ]
  return (
    <div style={{
      position:'absolute', bottom:78, left:12, right:12, zIndex:50,
      background:'#fff', border:'1px solid #FDE68A',
      borderRadius:14, padding:'12px 13px',
      boxShadow:'0 16px 40px rgba(16,24,40,.14)',
    }}>
      <div style={{ fontSize:11, fontWeight:700, color:'#D97706', marginBottom:10 }}>
        🔕 เลือกระยะเวลา DND
      </div>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {opts.map(o => (
          <button key={o.label} onClick={() => { toggleDnd(o.hours); onClose() }} style={{
            fontSize:11, padding:'6px 10px', borderRadius:8, cursor:'pointer',
            background:'#FFFBEB', border:'1px solid #FDE68A',
            color:'#D97706', fontWeight:600,
          }}>
            {o.label}
          </button>
        ))}
        <button onClick={onClose} style={{
          fontSize:11, padding:'6px 10px', borderRadius:8, cursor:'pointer',
          background:'#F8FAFC', border:'1px solid #E4E7EC', color:'#9CA3AF',
        }}>
          ยกเลิก
        </button>
      </div>
    </div>
  )
}

// ── Main ChatPanel ────────────────────────────────────────────────
export function ChatPanel({ height = 340 }: { height?: number | string }) {
  const { messages, isTyping, sendMessage, receiveAiMessage, setTyping } = useChatStore()
  const { prefs, toggleDnd }  = usePrefsStore()
  const activeProjectId = prefs.activeProjectId

  const [input,   setInput]   = useState('')
  const [chatMode, setChatMode] = useState<'line' | 'ai'>('ai')
  const [confirm, setConfirm] = useState<ConfirmDialog | null>(null)
  const [showDnd, setShowDnd] = useState(false)
  const bodyRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, isTyping])

  async function askAssistant(message: string) {
    setTyping(true)
    try {
      const history = messages.slice(-8).filter(item => item.role === 'me' || item.role === 'ai').map(item => ({ role: item.role === 'me' ? 'user' as const : 'assistant' as const, content: item.text }))
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: activeProjectId, message, history }),
      })
      const result = await response.json().catch(() => ({})) as { answer?: string; error?: string }
      if (!response.ok || !result.answer) throw new Error(result.error || 'AI assistant is temporarily unavailable.')
      receiveAiMessage(result.answer)
    } catch (error) {
      receiveAiMessage(error instanceof Error ? error.message : 'AI assistant is temporarily unavailable.')
    }
  }

  function send() {
    const val = input.trim()
    if (!val || isTyping) return
    sendMessage(val)
    setInput('')
    void askAssistant(val)
  }

  function handleQuickReply(qr: string) {
    if (isTyping) return
    sendMessage(qr)
    void askAssistant(qr)
  }

  const isAIReview = (text: string) =>
    text.includes('Blocked') && text.includes('At Risk')

  return (
    <div style={{ height, flexShrink:0, display:'flex', flexDirection:'column',
      background:'#fff', position:'relative' }}>

      {/* Header */}
      <div style={{ padding:'9px 14px 8px', borderBottom:'1px solid #E5EAF2',
        flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, background: chatMode === 'line' ? '#ECFDF3' : '#F5F3FF', borderRadius:9, padding:3 }}>
          <button onClick={() => setChatMode('line')} style={{
            fontSize:10, padding:'5px 8px', borderRadius:7, cursor:'pointer', border:'none', fontWeight:750,
            background: chatMode === 'line' ? '#12B76A' : 'transparent', color: chatMode === 'line' ? '#FFFFFF' : '#067647',
          }}>LINE Chat</button>
          <button onClick={() => setChatMode('ai')} style={{
            fontSize:10, padding:'5px 8px', borderRadius:7, cursor:'pointer', border:'none', fontWeight:750,
            background: chatMode === 'ai' ? '#7C3AED' : 'transparent', color: chatMode === 'ai' ? '#FFFFFF' : '#6D28D9',
          }}>🤖 AI Assistant</button>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={() => receiveAiMessage('ผมช่วยสรุปงาน, ติดตามงาน, จัดลำดับความสำคัญ และจำลองการส่ง follow-up ได้ครับ') } style={{
            fontSize:10, padding:'4px 8px', borderRadius:8, cursor:'pointer',
            background:'#EEF2FF', border:'1px solid #C7D2FE', color:'#4F46E5', fontWeight:650,
          }}>🤖 Help</button>
          <button onClick={() => setInput('สร้าง task: ')} style={{
            fontSize:10, padding:'4px 8px', borderRadius:8, cursor:'pointer',
            background:'#ECFDF5', border:'1px solid #A7F3D0', color:'#047857', fontWeight:650,
          }}>＋ Task</button>
          {prefs.dndMode ? (
            <button onClick={() => toggleDnd()} style={{
              fontSize:10, padding:'4px 8px', borderRadius:8, cursor:'pointer',
              background:'#FFFBEB', border:'1px solid #FDE68A', color:'#B54708', fontWeight:650,
            }}>🔔 เปิดแจ้งเตือน</button>
          ) : (
            <button onClick={() => setShowDnd(true)} style={{
              fontSize:10, padding:'4px 8px', borderRadius:8, cursor:'pointer',
              background:'#F8FAFC', border:'1px solid #E4E7EC', color:'#667085', fontWeight:600,
            }}>🔕 DND</button>
          )}
        </div>
      </div>

      {chatMode === 'ai' ? (
        <div style={{ display:'flex', gap:6, padding:'7px 12px', overflowX:'auto', borderBottom:'1px solid #E9D5FF', background:'#FAF5FF', flexShrink:0 }}>
          {[
            ['📅 นัดหมายหัวหน้า', 'นัดหมายหัวหน้าเพื่ออัปเดตโครงการ'],
            ['＋ สร้าง Task', 'สร้าง task: '],
            ['💬 ปรึกษาปัญหา', 'ช่วยวิเคราะห์ปัญหาของ project นี้'],
            ['🔔 ติดตาม Owner', 'ติดตามงานกับ owner ที่ยังค้างอยู่'],
          ].map(([label, prompt]) => (
            <button key={label} onClick={() => setInput(prompt)} style={{
              whiteSpace:'nowrap', fontSize:10, padding:'5px 8px', borderRadius:8, cursor:'pointer',
              background:'#FFFFFF', border:'1px solid #DDD6FE', color:'#6D28D9', fontWeight:650,
            }}>{label}</button>
          ))}
        </div>
      ) : (
        <div style={{ padding:'8px 12px', borderBottom:'1px solid #BBF7D0', background:'#F0FDF4', color:'#067647', fontSize:10, fontWeight:650, flexShrink:0 }}>
          LINE Chat สำหรับรับข้อความและติดตามงานกับทีม
        </div>
      )}

      {/* Messages */}
      <div ref={bodyRef} style={{ flex:1, overflowY:'auto', padding:'10px 12px',
        display:'flex', flexDirection:'column', gap:9, background:'#FCFCFD' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            alignSelf: msg.role === 'me' ? 'flex-end' : 'flex-start',
            maxWidth: '86%',
          }}>
            {msg.role === 'ai' && (
              <div style={{ fontSize:9,color:'#667085',marginBottom:4,
                marginLeft:3,fontWeight:800,letterSpacing:'.06em' }}>AI AGENT</div>
            )}

            {/* AI Review result → Flex card */}
            {msg.role === 'ai' && isAIReview(msg.text) ? (
              <AIReviewCard
                text={msg.text}
                onConfirm={handleQuickReply}
              />
            ) : (
              <div style={{
                padding:'9px 12px', fontSize:12, lineHeight:1.55,
                borderRadius: msg.role === 'me' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                ...(msg.role === 'me'
                  ? { background:'linear-gradient(135deg,#335CFF,#5B68E8)', color:'#fff',
                      boxShadow:'0 5px 14px rgba(51,92,255,.18)' }
                  : { background:'#FFFFFF', border:'1px solid #E1E6F0', color:'#344054', boxShadow:'0 1px 2px rgba(16,24,40,.03)' }),
              }}>
                {msg.text.split('\n').map((l, i, arr) => (
                  <React.Fragment key={i}>
                    {l}{i < arr.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Quick replies (non-review messages) */}
            {msg.quickReplies && !isAIReview(msg.text) && (
              <div style={{ display:'flex', gap:6, marginTop:6, flexWrap:'wrap' }}>
                {msg.quickReplies.map(qr => (
                  <button key={qr} onClick={() => handleQuickReply(qr)} style={{
                    fontSize:11, padding:'5px 10px', borderRadius:8, cursor:'pointer',
                    background:'#F7F8FC', border:'1px solid #D8DEE9',
                    color:'#344054', fontWeight:650, transition:'all .1s',
                  }}>{qr}</button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div style={{ alignSelf:'flex-start' }}>
            <div style={{ fontSize:9,color:'#667085',marginBottom:4,fontWeight:800,letterSpacing:'.06em' }}>AI AGENT</div>
            <div style={{ padding:'9px 12px', background:'#FFFFFF',
              border:'1px solid #E1E6F0', borderRadius:'4px 12px 12px 12px',
              color:'#98A2B3', fontSize:12, boxShadow:'0 1px 2px rgba(16,24,40,.03)' }}>
              กำลังพิมพ์...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ display:'flex', gap:8, padding:'8px 12px',
        borderTop:'1px solid #E5EAF2', flexShrink:0, background:'#FFFFFF' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="พิมพ์คำสั่ง หรือถาม AI..."
          style={{
            flex:1, background:'#F8FAFC', border:'1px solid #D8DEE9',
            borderRadius:10, padding:'9px 12px', fontSize:12,
            color:'#172033', outline:'none', boxShadow:'inset 0 1px 2px rgba(16,24,40,.03)',
          }}
        />
        <button onClick={send} style={{
          width:38, height:38, borderRadius:10, border:'none', cursor:'pointer',
          background:'linear-gradient(135deg,#335CFF,#6D5CE7)',
          color:'#fff', fontSize:16, display:'flex', alignItems:'center',
          justifyContent:'center', boxShadow:'0 5px 14px rgba(51,92,255,.22)',
          flexShrink:0,
        }}>➤</button>
      </div>

      {/* Confirm dialog overlay */}
      {confirm && (
        <ConfirmDialogBox
          dialog={confirm}
          onClose={() => setConfirm(null)}
        />
      )}

      {/* DND picker overlay */}
      {showDnd && <DNDBar onClose={() => setShowDnd(false)} />}
    </div>
  )
}

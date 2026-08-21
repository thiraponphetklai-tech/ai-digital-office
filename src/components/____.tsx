'use client'
import React, { useRef, useEffect, useState } from 'react'
import { useChatStore, usePrefsStore, useTaskStore, useEventStore } from '@/store'
import { MockAgentService } from '@/services/mockAgent'

// ── Types ─────────────────────────────────────────────────────────
interface ConfirmDialog {
  message: string
  onConfirm: () => void
}

// ── Flex Message Card ─────────────────────────────────────────────
function FlexCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#F5F3FF',
      border: '1.5px solid #DDD6FE',
      borderRadius: 14,
      padding: '10px 14px',
      marginTop: 4,
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
      <div style={{ fontSize:11, fontWeight:700, color:'#7C3AED', letterSpacing:'.06em', marginBottom:8 }}>
        🤖 AI REVIEW RESULT
      </div>
      {lines.map((line, i) => (
        <div key={i} style={{ fontSize:12, color:'#4C1D95', lineHeight:1.6, marginBottom:2 }}>
          {line}
        </div>
      ))}
      {(hasBlocked || hasRisk) && (
        <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
          <button
            onClick={() => onConfirm('follow-up-uat')}
            style={{
              fontSize:11, padding:'5px 12px', borderRadius:20, cursor:'pointer',
              background:'linear-gradient(135deg,#4F46E5,#7C3AED)',
              border:'none', color:'#fff', fontWeight:600,
              boxShadow:'0 2px 6px #4F46E540',
            }}>
            Follow-up UAT ✓
          </button>
          <button
            onClick={() => onConfirm('view-detail')}
            style={{
              fontSize:11, padding:'5px 12px', borderRadius:20, cursor:'pointer',
              background:'#EEF2FF', border:'1.5px solid #C7D2FE',
              color:'#4F46E5', fontWeight:600,
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
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:8 }}>
        <span style={{ fontSize:16 }}>⚠️</span>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:'#DC2626' }}>RISK DETECTED</div>
          <div style={{ fontSize:12, fontWeight:600, color:'#1F2937' }}>{task}</div>
        </div>
      </div>
      <div style={{ fontSize:11, color:'#6B7280', marginBottom:10 }}>
        Blocker: <span style={{ color:'#DC2626', fontWeight:600 }}>{blocker}</span>
      </div>
      <button onClick={onFollowUp} style={{
        fontSize:11, padding:'5px 14px', borderRadius:20, cursor:'pointer',
        background:'#FEF2F2', border:'1.5px solid #FCA5A5',
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
      position:'absolute', bottom:90, left:12, right:12, zIndex:50,
      background:'#fff', border:'1.5px solid #C7D2FE',
      borderRadius:16, padding:'14px 16px',
      boxShadow:'0 8px 24px #4F46E520',
    }}>
      <div style={{ fontSize:12, color:'#1F2937', marginBottom:12, lineHeight:1.5 }}>
        {dialog.message}
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => { dialog.onConfirm(); onClose() }} style={{
          flex:1, fontSize:12, padding:'7px 0', borderRadius:20, cursor:'pointer',
          background:'linear-gradient(135deg,#4F46E5,#7C3AED)',
          border:'none', color:'#fff', fontWeight:600,
          boxShadow:'0 2px 6px #4F46E530',
        }}>
          ยืนยัน ✓
        </button>
        <button onClick={onClose} style={{
          flex:1, fontSize:12, padding:'7px 0', borderRadius:20, cursor:'pointer',
          background:'#F9FAFB', border:'1.5px solid #E5E7EB',
          color:'#6B7280', fontWeight:500,
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
      position:'absolute', bottom:90, left:12, right:12, zIndex:50,
      background:'#fff', border:'1.5px solid #FCD34D',
      borderRadius:16, padding:'12px 14px',
      boxShadow:'0 8px 24px #D9770620',
    }}>
      <div style={{ fontSize:11, fontWeight:700, color:'#D97706', marginBottom:10 }}>
        🔕 เลือกระยะเวลา DND
      </div>
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {opts.map(o => (
          <button key={o.label} onClick={() => { toggleDnd(o.hours); onClose() }} style={{
            fontSize:11, padding:'5px 12px', borderRadius:20, cursor:'pointer',
            background:'#FFFBEB', border:'1.5px solid #FCD34D',
            color:'#D97706', fontWeight:600,
          }}>
            {o.label}
          </button>
        ))}
        <button onClick={onClose} style={{
          fontSize:11, padding:'5px 12px', borderRadius:20, cursor:'pointer',
          background:'#F9FAFB', border:'1.5px solid #E5E7EB', color:'#9CA3AF',
        }}>
          ยกเลิก
        </button>
      </div>
    </div>
  )
}

// ── Main ChatPanel ────────────────────────────────────────────────
export function ChatPanel() {
  const { messages, isTyping, sendMessage, receiveAiMessage } = useChatStore()
  const { prefs, toggleDnd }  = usePrefsStore()
  const { pushEvent }          = useEventStore()
  const { tasks }              = useTaskStore()

  const [input,   setInput]   = useState('')
  const [confirm, setConfirm] = useState<ConfirmDialog | null>(null)
  const [showDnd, setShowDnd] = useState(false)
  const bodyRef  = useRef<HTMLDivElement>(null)

  // Agent instance — shared across renders
  const agent = React.useMemo(() => new MockAgentService({
    onMessage:     (text, qr) => receiveAiMessage(text, qr),
    onTyping:      () => {},
    onRobotActive: () => {},
  }), [])

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, isTyping])

  function send() {
    const val = input.trim()
    if (!val) return
    // Show user message immediately
    sendMessage(val)
    setInput('')
    // Route to AI agent
    const agentTasks = tasks.map(t => ({
      id: t.id, title: t.title, status: t.status,
      blocker: t.blocker, owner: t.ownerId, dueDate: t.dueDate,
    }))
    agent.handleCommand(val, agentTasks)
  }

  function handleQuickReply(qr: string) {
    if (qr.startsWith('Follow-up')) {
      setConfirm({
        message: `ยืนยันส่ง follow-up หา owner ของ UAT?\nAI จะส่งข้อความ friendly ให้ทันที`,
        onConfirm: () => {
          sendMessage(qr)
          // Use agent for follow-up
          const uatTask = tasks.find(t => t.title.includes('UAT'))
          if (uatTask) {
            agent.sendFollowUp({
              id: uatTask.id, title: uatTask.title,
              status: uatTask.status, blocker: uatTask.blocker,
              owner: 'Somchai', dueDate: uatTask.dueDate,
            })
          }
        },
      })
    } else if (qr === 'ทำอยู่ครับ') {
      sendMessage(qr)
      receiveAiMessage('โอเคครับ ขอบคุณที่แจ้งนะครับ 😊\nถ้ามีอะไรติดขัดแจ้งได้เลยครับ 👍')
    } else if (qr === 'ติดปัญหา') {
      sendMessage(qr)
      receiveAiMessage('เข้าใจแล้วครับ ติดปัญหาอะไรครับ?\nบอกได้เลย AI จะช่วย update status ให้', ['รอ Vendor API', 'รอ Review', 'อื่นๆ'])
    } else if (qr === 'เสร็จแล้ว') {
      sendMessage(qr)
      receiveAiMessage('เยี่ยมเลยครับ! 🎉\nให้ผม update status เป็น Done ไหมครับ?', ['Update Done ✓', 'ยังไม่ต้อง'])
    } else {
      sendMessage(qr)
      const agentTasks = tasks.map(t => ({
        id: t.id, title: t.title, status: t.status,
        blocker: t.blocker, owner: t.ownerId, dueDate: t.dueDate,
      }))
      agent.handleCommand(qr, agentTasks)
    }
  }

  const isAIReview = (text: string) =>
    text.includes('Blocked') && text.includes('At Risk')

  return (
    <div style={{ height:340, flexShrink:0, display:'flex', flexDirection:'column',
      background:'#fff', position:'relative' }}>

      {/* Header */}
      <div style={{ padding:'10px 16px 8px', borderBottom:'1px solid #E0E7FF',
        flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <span style={{ width:5,height:5,borderRadius:'50%',background:'#059669',
            boxShadow:'0 0 5px #05966980' }} />
          <span style={{ fontSize:10,fontWeight:800,letterSpacing:'.1em',
            textTransform:'uppercase',color:'#059669' }}>LINE / AI Chat</span>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {prefs.dndMode ? (
            <button onClick={() => toggleDnd()} style={{
              fontSize:10, padding:'3px 10px', borderRadius:10, cursor:'pointer',
              background:'#FFFBEB', border:'1px solid #FCD34D', color:'#D97706', fontWeight:600,
            }}>🔔 เปิดแจ้งเตือน</button>
          ) : (
            <button onClick={() => setShowDnd(true)} style={{
              fontSize:10, padding:'3px 10px', borderRadius:10, cursor:'pointer',
              background:'#F9FAFB', border:'1px solid #E5E7EB', color:'#6B7280', fontWeight:500,
            }}>🔕 DND</button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={bodyRef} style={{ flex:1, overflowY:'auto', padding:'10px 14px',
        display:'flex', flexDirection:'column', gap:8 }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            alignSelf: msg.role === 'me' ? 'flex-end' : 'flex-start',
            maxWidth: '88%',
          }}>
            {msg.role === 'ai' && (
              <div style={{ fontSize:9,color:'#7C3AED',marginBottom:3,
                marginLeft:2,fontWeight:700,letterSpacing:'.04em' }}>AI AGENT</div>
            )}

            {/* AI Review result → Flex card */}
            {msg.role === 'ai' && isAIReview(msg.text) ? (
              <AIReviewCard
                text={msg.text}
                onConfirm={handleQuickReply}
              />
            ) : (
              <div style={{
                padding:'10px 14px', fontSize:13, lineHeight:1.6,
                borderRadius: msg.role === 'me' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                ...(msg.role === 'me'
                  ? { background:'linear-gradient(135deg,#4F46E5,#7C3AED)', color:'#fff',
                      boxShadow:'0 2px 8px #4F46E540' }
                  : { background:'#F5F3FF', border:'1.5px solid #DDD6FE', color:'#4C1D95' }),
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
                    fontSize:11, padding:'5px 13px', borderRadius:20, cursor:'pointer',
                    background:'#EEF2FF', border:'1.5px solid #C7D2FE',
                    color:'#4F46E5', fontWeight:600, transition:'all .1s',
                  }}>{qr}</button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div style={{ alignSelf:'flex-start' }}>
            <div style={{ fontSize:9,color:'#7C3AED',marginBottom:3,fontWeight:700 }}>AI AGENT</div>
            <div style={{ padding:'10px 14px', background:'#F5F3FF',
              border:'1.5px solid #DDD6FE', borderRadius:'4px 14px 14px 14px',
              color:'#9CA3AF', fontSize:13 }}>
              กำลังพิมพ์...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ display:'flex', gap:8, padding:'8px 14px',
        borderTop:'1px solid #E0E7FF', flexShrink:0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="พิมพ์คำสั่ง หรือถาม AI..."
          style={{
            flex:1, background:'#F8FAFF', border:'1.5px solid #C7D2FE',
            borderRadius:22, padding:'9px 16px', fontSize:13,
            color:'#1F2937', outline:'none',
          }}
        />
        <button onClick={send} style={{
          width:40, height:40, borderRadius:'50%', border:'none', cursor:'pointer',
          background:'linear-gradient(135deg,#4F46E5,#7C3AED)',
          color:'#fff', fontSize:16, display:'flex', alignItems:'center',
          justifyContent:'center', boxShadow:'0 2px 8px #4F46E550',
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

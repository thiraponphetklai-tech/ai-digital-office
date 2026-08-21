// ─────────────────────────────────────────────────────────────────
//  AI Digital Office — Mock AI Agent Service
//  src/services/mockAgent.ts
//
//  Interface เดียวกับ Real AI Agent ใน Phase 2
//  Phase 2 แค่ swap class นี้ด้วย RealAgentService
//  โดยไม่ต้องแก้ UI เลย
// ─────────────────────────────────────────────────────────────────

import { eventBus } from '@/lib/eventBus'
import type { AppEvent } from '@/types'

// ─── Helper ───────────────────────────────────────────────────────

function uid() {
  return `e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function emit(partial: Omit<AppEvent, 'id' | 'timestamp'>) {
  eventBus.emit({
    ...partial,
    id:        uid(),
    timestamp: new Date().toISOString(),
  })
}

function wait(ms: number) {
  return new Promise(res => setTimeout(res, ms))
}

// ─── Types ────────────────────────────────────────────────────────

export interface AgentTask {
  id:      string
  title:   string
  status:  string
  blocker?: string
  owner:   string
  dueDate?: string
}

export interface ReviewResult {
  blocked:  AgentTask[]
  atRisk:   AgentTask[]
  stale:    AgentTask[]
  summary:  string
}

export interface AgentCallbacks {
  onMessage:  (text: string, quickReplies?: string[]) => void
  onTyping:   (show: boolean) => void
  onRobotActive: (active: boolean) => void
}

// ─────────────────────────────────────────────────────────────────
//  MockAgentService
// ─────────────────────────────────────────────────────────────────

export class MockAgentService {
  private projectId = 'phoenix'
  private cb: AgentCallbacks

  constructor(callbacks: AgentCallbacks) {
    this.cb = callbacks
  }

  // ── 1. Full AI Review flow ────────────────────────────────────
  async startReview(tasks: AgentTask[]): Promise<ReviewResult> {
    const { onMessage, onTyping, onRobotActive } = this.cb

    // Step 1 — robot activates
    onRobotActive(true)
    emit({
      type: 'ai.review_started',
      projectId: this.projectId,
      message: 'AI เริ่ม review Project Phoenix...',
      color: '#4F46E5',
    })

    onTyping(true)
    await wait(1000)
    onTyping(false)
    onMessage('กำลัง scan งานทั้งหมดนะครับ... 🔍')

    // Step 2 — scan each task
    await wait(1200)
    const blocked = tasks.filter(t => t.status === 'BLOCKED')
    const atRisk  = tasks.filter(t => t.status === 'AT_RISK')
    const stale   = tasks.filter(t => t.status === 'IN_PROGRESS')
      .filter(t => !t.blocker)
      .slice(0, 1) // mock: first IN_PROGRESS as stale

    // Emit risk events per task
    for (const t of blocked) {
      await wait(600)
      emit({
        type: 'ai.risk_detected',
        projectId: this.projectId,
        taskId: t.id,
        message: `${t.title} — BLOCKED: ${t.blocker ?? 'ไม่ระบุ'}`,
        color: '#EF4444',
      })
    }

    for (const t of atRisk) {
      await wait(400)
      emit({
        type: 'ai.risk_detected',
        projectId: this.projectId,
        taskId: t.id,
        message: `${t.title} — AT_RISK`,
        color: '#F59E0B',
      })
    }

    // Step 3 — AI sends friendly result
    await wait(800)
    onTyping(true)
    await wait(1400)
    onTyping(false)

    const resultText = this.buildReviewMessage(blocked, atRisk, stale)
    const replies = blocked.length > 0
      ? ['Follow-up UAT ✓', 'ดูรายละเอียด']
      : ['ดูรายละเอียด']
    onMessage(resultText, replies)

    // Step 4 — review complete
    await wait(500)
    emit({
      type: 'ai.review_completed',
      projectId: this.projectId,
      message: `Review เสร็จ — พบ ${blocked.length} blocked, ${atRisk.length} at risk`,
      color: '#059669',
    })

    onRobotActive(false)

    return { blocked, atRisk, stale, summary: resultText }
  }

  // ── 2. Follow-up flow ─────────────────────────────────────────
  async sendFollowUp(task: AgentTask): Promise<void> {
    const { onMessage, onTyping } = this.cb

    emit({
      type: 'followup.created',
      projectId: this.projectId,
      taskId: task.id,
      message: `Follow-up ส่งหา ${task.owner} (${task.title})`,
      color: '#7C3AED',
    })

    onTyping(true)
    await wait(1000)
    onTyping(false)

    onMessage(
      `ส่ง follow-up หา ${task.owner} แล้วครับ ✅\n\n` +
      `ข้อความที่ส่ง:\n` +
      `"สวัสดีครับ ${task.owner} 👋\n` +
      `งาน ${task.title} เป็นยังไงบ้างครับ?\n` +
      `มีอะไรติดขัดให้ช่วยไหมครับ?"\n\n` +
      `จะแจ้งให้ทราบเมื่อ ${task.owner} ตอบกลับครับ`,
      ['ดูงานทั้งหมด']
    )
  }

  // ── 3. Handle LINE command ────────────────────────────────────
  async handleCommand(text: string, tasks: AgentTask[]): Promise<void> {
    const { onMessage, onTyping } = this.cb
    const lower = text.toLowerCase()

    onTyping(true)
    await wait(900)
    onTyping(false)

    // Intent detection (mock)
    if (lower.includes('สรุป') || lower.includes('report') || lower.includes('phoenix')) {
      const blocked = tasks.filter(t => t.status === 'BLOCKED')
      const atRisk  = tasks.filter(t => t.status === 'AT_RISK')
      const done    = tasks.filter(t => t.status === 'DONE')
      const working = tasks.filter(t => t.status === 'IN_PROGRESS')

      onMessage(
        `📊 สรุป Project Phoenix\n\n` +
        `✅ เสร็จแล้ว ${done.length} งาน\n` +
        `🔵 กำลังทำ ${working.length} งาน\n` +
        `🟠 เสี่ยง ${atRisk.length} งาน\n` +
        `🔴 ติดปัญหา ${blocked.length} งาน\n\n` +
        (blocked.length > 0
          ? `⚠️ ที่น่าเป็นห่วงคือ ${blocked[0].title} — ${blocked[0].blocker}\n` +
            `ถ้าไม่ปลด blocker วันนี้ Go-live อาจช้า 2-3 วันครับ`
          : `ภาพรวมดีครับ ไม่มี blocker`),
        blocked.length > 0 ? ['Follow-up UAT ✓', 'Escalate'] : ['ดูรายละเอียด']
      )

    } else if (lower.includes('ปัญหา') || lower.includes('risk') || lower.includes('block')) {
      const issues = tasks.filter(t => t.status === 'BLOCKED' || t.status === 'AT_RISK')
      if (issues.length === 0) {
        onMessage('ตอนนี้ไม่มี task ที่มีปัญหาครับ 🎉 ทุกอย่างดำเนินไปตามแผน')
      } else {
        onMessage(
          `พบ ${issues.length} งานที่มีปัญหาครับ:\n\n` +
          issues.map(t =>
            `${t.status === 'BLOCKED' ? '🔴' : '🟠'} ${t.title}` +
            (t.blocker ? `\n   ↳ ${t.blocker}` : '')
          ).join('\n\n'),
          ['Follow-up ทั้งหมด', 'ดูรายละเอียด']
        )
      }

    } else if (lower.includes('follow') || lower.includes('ติดตาม')) {
      onMessage(
        'จะส่ง follow-up ให้ทุก task ที่ค้างนะครับ\n\nยืนยันดำเนินการไหมครับ?',
        ['ยืนยัน ✓', 'ยกเลิก']
      )

    } else if (lower.includes('dnd') || lower.includes('หยุด') || lower.includes('เงียบ')) {
      onMessage(
        'เข้าใจแล้วครับ 🔕\nจะหยุดแจ้งเตือนชั่วคราว\n\nต้องการหยุดนานแค่ไหนครับ?',
        ['2 ชั่วโมง', '4 ชั่วโมง', 'จนกว่าจะบอก']
      )

    } else {
      // Default — general reply
      const replies = [
        'ได้เลยครับ กำลังดำเนินการให้',
        'รับทราบครับ มีอะไรให้ช่วยเพิ่มเติมไหม?',
        'เข้าใจแล้วครับ จะติดตามให้นะครับ 👍',
        'โอเคครับ ถ้ามีอะไรเพิ่มเติมแจ้งได้เลยนะครับ',
      ]
      onMessage(replies[Math.floor(Math.random() * replies.length)])
    }

    // Log to event stream
    emit({
      type: 'line.command_received',
      projectId: this.projectId,
      message: `Manager: "${text.slice(0, 45)}${text.length > 45 ? '…' : ''}"`,
      color: '#059669',
    })
  }

  // ── 4. Stale task follow-up ───────────────────────────────────
  async checkStaleAndFollowUp(tasks: AgentTask[]): Promise<void> {
    const { onMessage, onTyping } = this.cb
    // Mock: tasks with IN_PROGRESS that haven't updated (simulate)
    const stale = tasks.filter(t => t.status === 'IN_PROGRESS').slice(0, 1)
    if (stale.length === 0) return

    onTyping(true)
    await wait(800)
    onTyping(false)

    const t = stale[0]
    emit({
      type: 'task.stale',
      projectId: this.projectId,
      taskId: t.id,
      message: `${t.title} ไม่มี update มา 2 วัน`,
      color: '#F59E0B',
    })

    onMessage(
      `สวัสดีครับ 👋\n` +
      `งาน "${t.title}" ไม่มีการอัปเดตมา 2 วันแล้วครับ\n\n` +
      `ตอนนี้เป็นยังไงบ้างครับ? มีอะไรติดขัดไหม?`,
      ['ทำอยู่ครับ', 'ติดปัญหา', 'เสร็จแล้ว']
    )
  }

  // ── Private helpers ───────────────────────────────────────────

  private buildReviewMessage(
    blocked: AgentTask[],
    atRisk:  AgentTask[],
    stale:   AgentTask[]
  ): string {
    const lines: string[] = ['สแกนเสร็จแล้วครับ 🔍\n']

    if (blocked.length > 0) {
      lines.push(`🔴 Blocked ${blocked.length} งาน:`)
      blocked.forEach(t => lines.push(`   • ${t.title}${t.blocker ? ` — ${t.blocker}` : ''}`))
    }

    if (atRisk.length > 0) {
      lines.push(`\n🟠 At Risk ${atRisk.length} งาน:`)
      atRisk.forEach(t => lines.push(`   • ${t.title}`))
    }

    if (blocked.length === 0 && atRisk.length === 0) {
      lines.push('✅ ทุกงานเป็นปกติครับ ไม่มีปัญหา')
    } else {
      lines.push('\nอยากให้ follow-up UAT ก่อนไหมครับ?')
    }

    return lines.join('\n')
  }
}

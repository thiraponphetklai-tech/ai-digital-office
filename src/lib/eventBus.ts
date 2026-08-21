// ─────────────────────────────────────────────────────────────────
//  AI Digital Office — Event Bus
//  src/lib/eventBus.ts
//
//  Pub/Sub แยกออกจาก Zustand store
//  Store subscribe ผ่าน eventBus — ไม่ใช่ call store โดยตรง
//
//  Features:
//    - Typed subscribers per event type
//    - Throttle: กัน LINE notification spam (max 1 ต่อ 5 นาที)
//    - Smart grouping: รวม events ชนิดเดียวกันส่งครั้งเดียว
// ─────────────────────────────────────────────────────────────────

import type { EventType, AppEvent } from '@/types'

// ─── Types ────────────────────────────────────────────────────────

type EventHandler = (event: AppEvent) => void

interface ThrottleRecord {
  lastSent: number
  count:    number
}

// ─── Event Bus Class ──────────────────────────────────────────────

class EventBus {
  private handlers = new Map<EventType | '*', Set<EventHandler>>()
  private throttleMap = new Map<string, ThrottleRecord>()
  private pendingGroup = new Map<EventType, AppEvent[]>()
  private groupTimer: ReturnType<typeof setTimeout> | null = null

  // LINE notification throttle: 5 นาทีต่อ event type ต่อ task
  private readonly LINE_THROTTLE_MS = 5 * 60 * 1000
  // Smart group window: รอ 500ms แล้วค่อย flush grouped events
  private readonly GROUP_WINDOW_MS = 500

  // ─── Subscribe ─────────────────────────────────────────────────

  on(type: EventType | '*', handler: EventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    this.handlers.get(type)!.add(handler)

    // คืน unsubscribe function
    return () => {
      this.handlers.get(type)?.delete(handler)
    }
  }

  // ─── Publish ───────────────────────────────────────────────────

  emit(event: AppEvent): void {
    // 1. Notify wildcard subscribers (event store, audit log)
    this.handlers.get('*')?.forEach(h => h(event))

    // 2. Notify type-specific subscribers
    this.handlers.get(event.type)?.forEach(h => h(event))
  }

  // ─── Emit with LINE throttle check ────────────────────────────
  //     ใช้กับ events ที่อาจ trigger LINE notification

  emitWithThrottle(event: AppEvent): { emitted: boolean; throttled: boolean } {
    const key = `${event.type}:${event.taskId ?? event.projectId}`
    const now  = Date.now()
    const rec  = this.throttleMap.get(key)

    if (rec && now - rec.lastSent < this.LINE_THROTTLE_MS) {
      // Throttled — อัปเดต count แต่ไม่ส่ง LINE
      this.throttleMap.set(key, { lastSent: rec.lastSent, count: rec.count + 1 })
      // ยัง emit event ปกติ (dashboard update) แต่ไม่ทำ LINE action
      this.emit({ ...event, payload: { ...event.payload, _throttled: true } })
      return { emitted: true, throttled: true }
    }

    // Not throttled — ส่งปกติ
    this.throttleMap.set(key, { lastSent: now, count: 1 })
    this.emit(event)
    return { emitted: true, throttled: false }
  }

  // ─── Smart Group Emit ──────────────────────────────────────────
  //     รวม events ชนิดเดียวกันใน window 500ms → emit ครั้งเดียว
  //     เช่น task.updated x5 ใน 500ms → emit 1 grouped event

  emitGrouped(event: AppEvent): void {
    const existing = this.pendingGroup.get(event.type) ?? []
    this.pendingGroup.set(event.type, [...existing, event])

    // Reset timer
    if (this.groupTimer) clearTimeout(this.groupTimer)
    this.groupTimer = setTimeout(() => {
      this.flushGroups()
    }, this.GROUP_WINDOW_MS)
  }

  private flushGroups(): void {
    this.pendingGroup.forEach((events, type) => {
      if (events.length === 1) {
        // Single event — emit ปกติ
        this.emit(events[0])
      } else {
        // Multiple events — emit grouped summary
        const summary: AppEvent = {
          ...events[events.length - 1],
          id:      `grouped-${Date.now()}`,
          message: `${events.length} ${type} events`,
          payload: { grouped: true, count: events.length, events },
        }
        this.emit(summary)
      }
    })
    this.pendingGroup.clear()
    this.groupTimer = null
  }

  // ─── Helpers ───────────────────────────────────────────────────

  resetThrottle(eventType: EventType, taskId?: string): void {
    const key = `${eventType}:${taskId ?? ''}`
    this.throttleMap.delete(key)
  }

  clearAll(): void {
    this.handlers.clear()
    this.throttleMap.clear()
    this.pendingGroup.clear()
    if (this.groupTimer) clearTimeout(this.groupTimer)
  }
}

// ─── Singleton export ─────────────────────────────────────────────
//     ทั้ง app ใช้ instance เดียวกัน

export const eventBus = new EventBus()

// ─────────────────────────────────────────────────────────────────
//  AI Digital Office — Visual State Mapper
//  src/lib/visualStateMapper.ts
//
//  หลักการ: Three.js ห้าม interpret business logic เอง
//  ทุก status change ต้องผ่าน mapper นี้ก่อนเสมอ
//
//  Business State → Visual State → Three.js Rendering
// ─────────────────────────────────────────────────────────────────

import type { DeskState, RiskLevel, TaskStatus, VisualState } from '@/types'

// ─── Task Status → Visual State ───────────────────────────────────

export function mapStatusToVisual(taskId: string, status: TaskStatus): VisualState {
  const map: Record<TaskStatus, Omit<VisualState, 'taskId'>> = {
    TODO: {
      avatarState:  'IDLE',
      deskState:    'DIM',
      screenState:  'OFF',
      alertState:   'NONE',
    },
    IN_PROGRESS: {
      avatarState:  'WORKING',
      deskState:    'ACTIVE',
      screenState:  'ON',
      alertState:   'NONE',
    },
    BLOCKED: {
      avatarState:  'WAITING',
      deskState:    'BLOCKED',
      screenState:  'WARNING',
      alertState:   'RED',
    },
    AT_RISK: {
      avatarState:  'WORKING',
      deskState:    'RISK',
      screenState:  'ON',
      alertState:   'YELLOW',
    },
    DONE: {
      avatarState:  'IDLE',
      deskState:    'DONE',
      screenState:  'OFF',
      alertState:   'NONE',
    },
  }
  return { taskId, ...map[status] }
}

// ─── Visual State → CSS/Color config (ใช้กับ div และ Three.js) ───

export interface DeskVisualConfig {
  bg:     string
  border: string
  dot:    string
  label:  string
  // Three.js (Step 4)
  meshColor:   string
  emissive:    string
  glowColor:   string
  pulseAnim:   boolean
}

export function getDeskConfig(deskState: DeskState): DeskVisualConfig {
  const map: Record<DeskState, DeskVisualConfig> = {
    DIM: {
      bg: '#F9FAFB', border: '#D1D5DB', dot: '#9CA3AF', label: '#4B5563',
      meshColor: '#D1D5DB', emissive: '#000000', glowColor: '#9CA3AF', pulseAnim: false,
    },
    ACTIVE: {
      bg: '#EFF6FF', border: '#93C5FD', dot: '#2563EB', label: '#1E3A8A',
      meshColor: '#3B82F6', emissive: '#1D4ED8', glowColor: '#60A5FA', pulseAnim: false,
    },
    BLOCKED: {
      bg: '#FEF2F2', border: '#FCA5A5', dot: '#DC2626', label: '#7F1D1D',
      meshColor: '#EF4444', emissive: '#B91C1C', glowColor: '#F87171', pulseAnim: true,
    },
    RISK: {
      bg: '#FFFBEB', border: '#FCD34D', dot: '#D97706', label: '#78350F',
      meshColor: '#F59E0B', emissive: '#B45309', glowColor: '#FCD34D', pulseAnim: true,
    },
    DONE: {
      bg: '#ECFDF5', border: '#6EE7B7', dot: '#059669', label: '#065F46',
      meshColor: '#10B981', emissive: '#047857', glowColor: '#34D399', pulseAnim: false,
    },
  }
  return map[deskState]
}

// ─── Risk Level → Notification priority ──────────────────────────

export function shouldNotifyLine(risk: RiskLevel): boolean {
  return risk === 'HIGH' || risk === 'CRITICAL'
}

export function getNotificationPriority(risk: RiskLevel): 'immediate' | 'digest' | 'silent' {
  switch (risk) {
    case 'CRITICAL': return 'immediate'
    case 'HIGH':     return 'immediate'
    case 'MEDIUM':   return 'digest'
    default:         return 'silent'
  }
}

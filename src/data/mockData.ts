// ─────────────────────────────────────────────────────────────────
//  AI Digital Office — Mock Seed Data
//  src/data/mockData.ts
//
//  ใช้ในช่วง Phase 1 (frontend prototype)
//  Step 9 จะแทนด้วย REST API calls
// ─────────────────────────────────────────────────────────────────

import type {
  Task, Employee, Project, OfficeZone,
  AppEvent, ChatMessage, UserPrefs,
} from '@/types'

// ─── Employees ───────────────────────────────────────────────────

export const MOCK_EMPLOYEES: Employee[] = [
  { id: 'u1', name: 'Somchai',  role: 'EMPLOYEE',  teamId: 't1', projectIds: ['phoenix'], avatar: 'SC' },
  { id: 'u2', name: 'Nida',     role: 'EMPLOYEE',  teamId: 't1', projectIds: ['phoenix'], avatar: 'ND' },
  { id: 'u3', name: 'Patchara', role: 'EMPLOYEE',  teamId: 't2', projectIds: ['phoenix'], avatar: 'PC' },
  { id: 'u4', name: 'Krit',     role: 'TEAM_LEAD', teamId: 't1', projectIds: ['phoenix'], avatar: 'KR' },
  { id: 'u5', name: 'Manager',  role: 'MANAGER',   teamId: 'tm', projectIds: ['phoenix'], avatar: 'MG' },
]

// ─── Project ─────────────────────────────────────────────────────

export const MOCK_PROJECT: Project = {
  id: 'phoenix',
  name: 'Project Phoenix',
  description: 'Core platform modernization',
  teamIds: ['t1', 't2', 't3'],
  memberIds: ['u1', 'u2', 'u3', 'u4', 'u5'],
  startDate: '2026-07-01',
  targetDate: '2026-09-30',
  status: 'ACTIVE',
}

export const MOCK_DIGITAL_OFFICE_PROJECT: Project = {
  id: 'ai-digital-office',
  name: 'AI Digital Office Platform',
  code: 'ADO-2026',
  description: 'Multi-project AI project management platform with 3D office and work sheets.',
  teamIds: ['product', 'engineering'],
  memberIds: ['u5'],
  startDate: '2026-08-01',
  targetDate: '2026-10-31',
  status: 'ACTIVE',
}

export const MOCK_BITLOCKER_PROJECT: Project = {
  id: 'bitlocker-migration',
  name: 'BitLocker Migration',
  code: 'BLM-2026',
  description: 'ย้ายการเข้ารหัสดิสก์ด้วย BitLocker จำนวน 10,000 เครื่อง: Branch 6,500 เครื่อง และ HQ 3,500 เครื่อง — ดำเนินการแล้ว 9,980 เครื่อง (99.8%)',
  teamIds: ['endpoint', 'security', 'support'],
  memberIds: ['u1', 'u2', 'u4', 'u5'],
  startDate: '2026-07-15',
  targetDate: '2026-08-31',
  status: 'ACTIVE',
}

// ─── Tasks ───────────────────────────────────────────────────────

export const MOCK_TASKS: Task[] = [
  {
    id: 'T-001', projectId: 'phoenix', title: 'Dashboard UI',
    ownerId: 'u1', teamId: 't1',
    status: 'DONE', priority: 'HIGH', progress: 100,
    riskLevel: 'NONE',
    dueDate: '2026-08-15',
    lastUpdatedAt: '2026-08-15T14:00:00+07:00',
    completedAt:   '2026-08-15T14:00:00+07:00',
  },
  {
    id: 'T-002', projectId: 'phoenix', title: 'Payment API',
    ownerId: 'u1', teamId: 't1',
    status: 'IN_PROGRESS', priority: 'HIGH', progress: 80,
    riskLevel: 'LOW',
    dueDate: '2026-08-22',
    lastUpdatedAt: '2026-08-19T10:30:00+07:00',
  },
  {
    id: 'T-003', projectId: 'phoenix', title: 'UAT Testing',
    ownerId: 'u3', teamId: 't2',
    status: 'BLOCKED', priority: 'CRITICAL', progress: 72,
    riskLevel: 'HIGH',
    blocker: 'Waiting Vendor API',
    dueDate: '2026-08-20',
    lastUpdatedAt: '2026-08-17T09:00:00+07:00',
    aiSummary: 'UAT blocked by Vendor API dependency. High risk to Go-live.',
    aiRiskAssessment: 'Go-live delay estimated 3 days if not resolved today.',
  },
  {
    id: 'T-004', projectId: 'phoenix', title: 'Auth Service',
    ownerId: 'u2', teamId: 't1',
    status: 'AT_RISK', priority: 'HIGH', progress: 60,
    riskLevel: 'MEDIUM',
    dueDate: '2026-08-20',
    lastUpdatedAt: '2026-08-18T16:00:00+07:00',
  },
  {
    id: 'T-005', projectId: 'phoenix', title: 'Backend API',
    ownerId: 'u3', teamId: 't2',
    status: 'IN_PROGRESS', priority: 'MEDIUM', progress: 55,
    riskLevel: 'LOW',
    dueDate: '2026-08-25',
    lastUpdatedAt: '2026-08-19T08:00:00+07:00',
  },
  {
    id: 'T-006', projectId: 'phoenix', title: 'Deploy Pipeline',
    ownerId: 'u4', teamId: 't3',
    status: 'DONE', priority: 'MEDIUM', progress: 100,
    riskLevel: 'NONE',
    dueDate: '2026-08-10',
    lastUpdatedAt: '2026-08-10T17:00:00+07:00',
    completedAt:   '2026-08-10T17:00:00+07:00',
  },
  {
    id: 'T-007', projectId: 'phoenix', title: 'QA Automation',
    ownerId: 'u2', teamId: 't3',
    status: 'TODO', priority: 'LOW', progress: 0,
    riskLevel: 'NONE',
    dueDate: '2026-09-01',
    lastUpdatedAt: '2026-08-01T09:00:00+07:00',
  },
  {
    id: 'BLM-001', projectId: 'bitlocker-migration', title: 'สำรวจและจัดกลุ่มอุปกรณ์ 10,000 เครื่อง',
    description: 'ตรวจสอบ inventory, TPM, encryption readiness และจัดกลุ่ม Branch 6,500 เครื่อง กับ HQ 3,500 เครื่อง',
    ownerId: 'u4', teamId: 'endpoint',
    status: 'DONE', priority: 'HIGH', progress: 100,
    riskLevel: 'NONE', dueDate: '2026-07-22',
    lastUpdatedAt: '2026-07-22T16:00:00+07:00', completedAt: '2026-07-22T16:00:00+07:00',
  },
  {
    id: 'BLM-002', projectId: 'bitlocker-migration', title: 'ตั้งค่า BitLocker Policy และ Recovery Key',
    description: 'กำหนด encryption policy, escrow recovery key และตรวจสอบการเชื่อมต่อกับระบบจัดการอุปกรณ์',
    ownerId: 'u2', teamId: 'security',
    status: 'DONE', priority: 'CRITICAL', progress: 100,
    riskLevel: 'NONE', dueDate: '2026-07-29',
    lastUpdatedAt: '2026-07-29T17:00:00+07:00', completedAt: '2026-07-29T17:00:00+07:00',
  },
  {
    id: 'BLM-003', projectId: 'bitlocker-migration', title: 'ทดสอบ Pilot Group',
    description: 'ทดสอบการเข้ารหัสและการกู้คืนข้อมูลกับกลุ่มนำร่องก่อน rollout เต็มรูปแบบ',
    ownerId: 'u1', teamId: 'endpoint',
    status: 'DONE', priority: 'HIGH', progress: 100,
    riskLevel: 'NONE', dueDate: '2026-08-04',
    lastUpdatedAt: '2026-08-04T16:00:00+07:00', completedAt: '2026-08-04T16:00:00+07:00',
  },
  {
    id: 'BLM-004', projectId: 'bitlocker-migration', title: 'Rollout อุปกรณ์ Branch 6,500 เครื่อง',
    description: 'ดำเนินการ BitLocker สำหรับอุปกรณ์สาขา ครบ 6,500 เครื่อง',
    ownerId: 'u1', teamId: 'endpoint',
    status: 'DONE', priority: 'CRITICAL', progress: 100,
    riskLevel: 'NONE', dueDate: '2026-08-18',
    lastUpdatedAt: '2026-08-18T18:00:00+07:00', completedAt: '2026-08-18T18:00:00+07:00',
  },
  {
    id: 'BLM-005', projectId: 'bitlocker-migration', title: 'Rollout อุปกรณ์ HQ 3,500 เครื่อง',
    description: 'ดำเนินการ BitLocker ที่สำนักงานใหญ่ สำเร็จ 3,480 จาก 3,500 เครื่อง เหลือ 20 เครื่อง',
    ownerId: 'u4', teamId: 'endpoint',
    status: 'IN_PROGRESS', priority: 'CRITICAL', progress: 99,
    riskLevel: 'LOW', dueDate: '2026-08-29',
    lastUpdatedAt: '2026-08-21T10:00:00+07:00',
  },
  {
    id: 'BLM-006', projectId: 'bitlocker-migration', title: 'แก้ไข Exception 20 เครื่องที่เหลือ',
    description: 'ติดตามอุปกรณ์ที่ offline, TPM ไม่พร้อม หรือรอผู้ใช้นำเครื่องเข้าระบบ เพื่อให้ครบ 10,000 เครื่อง',
    ownerId: 'u2', teamId: 'support',
    status: 'IN_PROGRESS', priority: 'HIGH', progress: 0,
    riskLevel: 'MEDIUM', dueDate: '2026-08-31',
    lastUpdatedAt: '2026-08-21T10:00:00+07:00',
  },
  {
    id: 'BLM-007', projectId: 'bitlocker-migration', title: 'ตรวจสอบ Compliance และปิดโครงการ',
    description: 'ตรวจสอบรายงาน compliance, recovery key และสรุปผลการย้ายระบบ 9,980 จาก 10,000 เครื่อง หรือ 99.8%',
    ownerId: 'u5', teamId: 'security',
    status: 'TODO', priority: 'HIGH', progress: 0,
    riskLevel: 'LOW', dueDate: '2026-08-31',
    lastUpdatedAt: '2026-08-21T10:00:00+07:00',
  },
  {
    id: 'ADO-001', projectId: 'ai-digital-office', title: 'Project Hub & Multi-project Setup',
    description: 'สร้างหน้า Project Hub และฟอร์มตั้งค่าโครงการใหม่ เพื่อรองรับหลายโครงการในระบบเดียว',
    ownerId: 'u5', teamId: 'product',
    status: 'DONE', priority: 'HIGH', progress: 100,
    riskLevel: 'NONE',
    dueDate: '2026-08-21',
    lastUpdatedAt: '2026-08-21T09:00:00+07:00',
    completedAt: '2026-08-21T09:00:00+07:00',
  },
  {
    id: 'ADO-002', projectId: 'ai-digital-office', title: 'Project-scoped Kanban and WBS',
    description: 'กรอง Kanban และ WBS ให้แสดงเฉพาะงานของโครงการที่ผู้ใช้เลือก',
    ownerId: 'u5', teamId: 'engineering',
    status: 'DONE', priority: 'HIGH', progress: 100,
    riskLevel: 'NONE',
    dueDate: '2026-08-21',
    lastUpdatedAt: '2026-08-21T09:00:00+07:00',
    completedAt: '2026-08-21T09:00:00+07:00',
  },
  {
    id: 'ADO-003', projectId: 'ai-digital-office', title: 'Work Sheet and CSV Export',
    description: 'เพิ่มตารางข้อมูลงานแบบพื้นฐานและส่งออก CSV ที่เปิดภาษาไทยใน Excel ได้',
    ownerId: 'u5', teamId: 'engineering',
    status: 'DONE', priority: 'HIGH', progress: 100,
    riskLevel: 'NONE',
    dueDate: '2026-08-21',
    lastUpdatedAt: '2026-08-21T09:00:00+07:00',
    completedAt: '2026-08-21T09:00:00+07:00',
  },
  {
    id: 'ADO-004', projectId: 'ai-digital-office', title: 'Project Selector and Return to Project Hub',
    description: 'เพิ่มตัวเลือกสลับโครงการใน workspace และปุ่มกลับไปหน้า Project Hub',
    ownerId: 'u5', teamId: 'product',
    status: 'IN_PROGRESS', priority: 'HIGH', progress: 40,
    riskLevel: 'LOW',
    dueDate: '2026-08-28',
    lastUpdatedAt: '2026-08-21T09:00:00+07:00',
  },
  {
    id: 'ADO-005', projectId: 'ai-digital-office', title: 'Project-scoped KPI and Event Stream',
    description: 'คำนวณ KPI และกรอง Event Stream ให้สัมพันธ์กับโครงการที่กำลังเปิดอยู่',
    ownerId: 'u5', teamId: 'engineering',
    status: 'TODO', priority: 'HIGH', progress: 0,
    riskLevel: 'MEDIUM',
    dueDate: '2026-08-29',
    lastUpdatedAt: '2026-08-21T09:00:00+07:00',
  },
  {
    id: 'ADO-006', projectId: 'ai-digital-office', title: 'Blocked Task Validation and Blocker Editing',
    description: 'บังคับกรอกเหตุผลก่อนเปลี่ยนงานเป็น Blocked และรองรับการแก้ไขหรือล้าง blocker',
    ownerId: 'u5', teamId: 'engineering',
    status: 'TODO', priority: 'HIGH', progress: 0,
    riskLevel: 'MEDIUM',
    dueDate: '2026-09-02',
    lastUpdatedAt: '2026-08-21T09:00:00+07:00',
  },
  {
    id: 'ADO-007', projectId: 'ai-digital-office', title: 'Local Storage Persistence for Mock Data',
    description: 'เก็บข้อมูล mock ของโครงการ งาน และ project ที่เลือกไว้ใน localStorage หลัง refresh',
    ownerId: 'u5', teamId: 'engineering',
    status: 'TODO', priority: 'HIGH', progress: 0,
    riskLevel: 'MEDIUM',
    dueDate: '2026-09-05',
    lastUpdatedAt: '2026-08-21T09:00:00+07:00',
  },
  {
    id: 'ADO-008', projectId: 'ai-digital-office', title: 'Project-aware AI Review and Chat Context',
    description: 'ให้ AI Review, Chat และ event ใช้ข้อมูลของโครงการปัจจุบันแทน Phoenix ที่ fix ไว้',
    ownerId: 'u5', teamId: 'engineering',
    status: 'TODO', priority: 'MEDIUM', progress: 0,
    riskLevel: 'LOW',
    dueDate: '2026-09-09',
    lastUpdatedAt: '2026-08-21T09:00:00+07:00',
  },
  {
    id: 'ADO-009', projectId: 'ai-digital-office', title: 'Dynamic 3D Office Layout per Project',
    description: 'สร้าง 3D office layout, zone และ desk ตามทีมและงานของแต่ละโครงการ',
    ownerId: 'u5', teamId: 'engineering',
    status: 'TODO', priority: 'MEDIUM', progress: 0,
    riskLevel: 'MEDIUM',
    dueDate: '2026-09-19',
    lastUpdatedAt: '2026-08-21T09:00:00+07:00',
  },
  {
    id: 'ADO-010', projectId: 'ai-digital-office', title: 'Reset Demo State and End-to-End Smoke Test',
    description: 'เพิ่มปุ่ม reset ข้อมูล demo และทดสอบ flow ตั้งแต่สร้างโครงการจนถึง export งาน',
    ownerId: 'u5', teamId: 'product',
    status: 'TODO', priority: 'MEDIUM', progress: 0,
    riskLevel: 'LOW',
    dueDate: '2026-09-23',
    lastUpdatedAt: '2026-08-21T09:00:00+07:00',
  },
]

// ─── Office Zones (3D layout mapping) ────────────────────────────

export const MOCK_ZONES: OfficeZone[] = [
  {
    id: 'product', label: 'Product', teamId: 't1',
    desks: [
      { id: 'd1', taskId: 'T-001', name: 'Dashboard', status: 'DONE',        ownerId: 'u1' },
      { id: 'd2', taskId: 'T-002', name: 'Payment',   status: 'IN_PROGRESS', ownerId: 'u1' },
    ],
  },
  {
    id: 'technology', label: 'Technology', teamId: 't2',
    desks: [
      { id: 'd3', taskId: 'T-003', name: 'UAT',     status: 'BLOCKED',     ownerId: 'u3' },
      { id: 'd4', taskId: 'T-004', name: 'Auth',    status: 'AT_RISK',     ownerId: 'u2' },
      { id: 'd5', taskId: 'T-005', name: 'API',     status: 'IN_PROGRESS', ownerId: 'u3' },
    ],
  },
  {
    id: 'operations', label: 'Operations', teamId: 't3',
    desks: [
      { id: 'd6', taskId: 'T-006', name: 'Deploy', status: 'DONE', ownerId: 'u4' },
      { id: 'd7', taskId: 'T-007', name: 'QA',     status: 'TODO', ownerId: 'u2' },
    ],
  },
]

// ─── Events (seed) ───────────────────────────────────────────────

export const MOCK_EVENTS: AppEvent[] = [
  {
    id: 'e1', type: 'task.blocked', projectId: 'phoenix', taskId: 'T-003',
    timestamp: '2026-08-19T10:30:00+07:00',
    message: 'UAT — Waiting Vendor API',
    color: '#DC2626',
    payload: { reason: 'Waiting Vendor API', risk: 'HIGH' },
  },
  {
    id: 'e2', type: 'ai.review_started', projectId: 'phoenix',
    timestamp: '2026-08-19T10:25:00+07:00',
    message: 'AI scanning Technology zone',
    color: '#4F46E5',
  },
  {
    id: 'e3', type: 'ai.risk_detected', projectId: 'phoenix', taskId: 'T-004',
    timestamp: '2026-08-19T10:25:00+07:00',
    message: 'Auth — deadline tomorrow',
    color: '#D97706',
    payload: { risk: 'MEDIUM', taskTitle: 'Auth Service' },
  },
  {
    id: 'e4', type: 'task.completed', projectId: 'phoenix', taskId: 'T-001',
    timestamp: '2026-08-19T09:42:00+07:00',
    message: 'Dashboard — Somchai',
    color: '#059669',
  },
  {
    id: 'e5', type: 'task.updated', projectId: 'phoenix', taskId: 'T-002',
    timestamp: '2026-08-19T09:10:00+07:00',
    message: 'Payment API — 80% progress',
    color: '#5BA0DC',
    payload: { progress: 80 },
  },
  {
    id: 'e6', type: 'line.report_sent', projectId: 'phoenix',
    timestamp: '2026-08-19T08:00:00+07:00',
    message: 'Daily report → Manager',
    color: '#059669',
  },
]

// ─── Chat Messages (seed) ─────────────────────────────────────────

export const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: 'm1', role: 'ai',
    text: 'พี่ครับ UAT ของ Somchai ยังไม่คืบหน้า 2 วัน 😟\nให้ผม follow-up ไหมครับ?',
    timestamp: '2026-08-19T10:31:00+07:00',
    quickReplies: ['ส่ง Follow-up ✓', 'ไม่เป็นไร'],
  },
  {
    id: 'm2', role: 'me',
    text: 'ได้เลย ส่งไปเลย',
    timestamp: '2026-08-19T10:32:00+07:00',
  },
  {
    id: 'm3', role: 'ai',
    text: 'ส่งแล้วครับ ✅ จะแจ้งให้ทราบเมื่อ Somchai ตอบกลับ',
    timestamp: '2026-08-19T10:32:00+07:00',
  },
]

// ─── User Prefs (default) ─────────────────────────────────────────

export const DEFAULT_USER_PREFS: UserPrefs = {
  activeProjectId: 'phoenix',
  dndMode: false,
  digestMode: false,
  notificationPolicy: {
    taskUpdated:    'dashboard_only',
    taskBlocked:    'line_immediate',
    taskOverdue:    'line_immediate',
    aiRiskDetected: 'line_if_high',
    dailyReport:    true,
    digestTime:     '17:00',
  },
  defaultView: 'all',
}

// ─── AI mock replies ──────────────────────────────────────────────

export const AI_REPLIES = [
  'ได้เลยครับ ดำเนินการให้ทันที',
  'Phoenix ตอนนี้ progress 68% ครับ มี 3 task ที่ต้องระวัง',
  'กำลัง scan Technology zone ให้นะครับ...',
  'ผมแนะนำให้ follow-up UAT ก่อนเลยครับ มีความเสี่ยงสูงสุด',
  'UAT มี blocker อยู่ครับ — Waiting Vendor API\nอยากให้ escalate หัวหน้าไหมครับ?',
  'รับทราบครับ จะ remind ใหม่พรุ่งนี้เช้าครับ 👍',
]

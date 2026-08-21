# AI Digital Office — Project Brief

> **Audience:** Developers, designers, product owners, and technical stakeholders
>
> **Status:** Phase 1 — frontend prototype
>
> **Department:** IT Infrastructure & Client Technology, Tidlor Co., Ltd.

## 1. Project Overview

| Item | Detail |
| --- | --- |
| **Project name** | AI Digital Office |
| **Purpose** | An AI-powered internal project-management dashboard that makes task health, blockers, and risks visible in real time. |
| **Primary users** | Team Leads, Managers / PMs, and an automated AI Agent. |
| **Current delivery phase** | Phase 1 frontend prototype using mock data and services. |
| **Primary project in mock data** | Phoenix (`phoenix`) |

### Technology Stack

| Area | Technology |
| --- | --- |
| Application framework | Next.js 16 |
| Language | TypeScript |
| UI runtime | React |
| 3D experience | React Three Fiber and Drei |
| Client state | Zustand |
| Drag and drop | dnd-kit |
| AI simulation | `MockAgentService` |

## 2. Goal and Problem Statement

AI Digital Office is designed for internal teams at Tidlor Co., Ltd. to manage project work through a visual, event-driven dashboard and a conversational AI interface.

### Problems to Solve

| Problem | Current impact | Intended outcome |
| --- | --- | --- |
| Teams bypass formal task tracking and communicate in LINE groups. | Task context is fragmented and difficult to audit. | Let team members update work in a familiar LINE-style chat flow while keeping the project state centralized. |
| Managers lack real-time visibility into task status and blockers. | Project health is discovered late. | Provide a live project pulse, event stream, task board, and visual 3D office. |
| Risk and overdue detection is manual and reactive. | Escalations happen after deadlines are missed. | Let the AI Agent identify at-risk, blocked, stale, and overdue work proactively. |
| Team leads manually prepare daily status reports. | Reporting consumes time and may be inconsistent. | Provide AI-generated reporting and a scheduled daily digest. |

## 3. Target Users and Responsibilities

| User | Primary responsibilities | Main interactions |
| --- | --- | --- |
| **Team Lead** | Update progress and report blockers. | Use LINE-style chat or the dashboard to report task status. |
| **Manager / PM** | Monitor overall project health, review risks, and approve follow-ups. | Use Project Pulse, Event Stream, Digital Office, Task Board, and AI Review. |
| **AI Agent** | Monitor task signals, detect risks, create follow-ups, and generate reports. | Emits events, updates conversations, and drives visual status through the event architecture. |

## 4. Scope

### 4.1 In Scope — Phase 1

| Module | Description |
| --- | --- |
| **Digital Office 3D** | Isometric office scene with workstations per task, employee avatars, visual status states, and an AI robot. |
| **Task Board** | Kanban board with drag-and-drop and a WBS table view with inline editing. |
| **AI Chat Panel** | LINE-style AI conversation, Thai-language responses, quick replies, and confirmation dialogs. |
| **Event Stream** | Real-time log of business events and AI actions. |
| **Project Pulse** | KPI cards for Done, In Progress, At Risk, and Blocked work. |
| **Mock AI Agent** | Thai-language simulation for reviews, follow-ups, and chat-command handling. |

### 4.2 Out of Scope — Phase 2 and Later

- Real LINE Messaging API and webhooks
- Real AI API integration, such as Azure OpenAI or Claude
- PostgreSQL persistence
- Authentication and authorization
- Synchronization with external project-management platforms (for example, monday.com); AI Digital Office will own project-management data and workflows natively.

## 5. Architecture Principles and Mandatory Rules

The application follows an event-driven architecture that separates business state from 3D rendering.

```text
Business Logic / Service
        │
        ▼
Event Engine (eventBus)
        │
        ▼
Visual State Mapper (visualStateMapper.ts)
        │
        ▼
Zustand visual state
        │
        ▼
React Three Fiber / Three.js rendering
```

### Rules That Must Be Enforced

1. **Business logic → Event Engine → Visual State Mapper → Three.js rendering.** Do not bypass this sequence.
2. **Three.js components must never read `task.status` directly.** They render only derived visual state.
3. **All visual-state changes must pass through `src/lib/visualStateMapper.ts`.**
4. **All business events must pass through the `eventBus` pub/sub singleton.**
5. **Every mock service in `src/services/` must implement `IAgentService`.**
6. **Phase 2 must be able to replace `MockAgentService` with `RealAgentService` without UI changes.**
7. **AI Digital Office is the system of record for project-management data and workflows.** Do not introduce an external project-management sync as a core dependency.

### Key Source Locations

| Path | Responsibility |
| --- | --- |
| `src/app/` | Next.js App Router pages, layout, and global styling. |
| `src/components/office3d/` | React Three Fiber scene, zones, workstations, avatars, and AI robot. |
| `src/components/board/` | Kanban, WBS, task card, and task detail UI. |
| `src/components/ChatPanel.tsx` | LINE-style AI chat UI. |
| `src/store/` | Zustand stores for tasks, office state, events, chat, and preferences. |
| `src/services/mockAgent.ts` | Phase 1 AI Agent implementation. |
| `src/lib/eventBus.ts` | Application event pub/sub singleton. |
| `src/lib/visualStateMapper.ts` | Maps domain task state to visual state. |
| `src/data/mockData.ts` | Seed project, tasks, people, events, and chat data. |
| `src/types/index.ts` | Shared domain and UI type definitions. |

## 6. Key User Flows

### Flow 1: AI Review

A manager reviews project health and approves a follow-up for identified risk.

```text
Manager clicks “AI Review”
        │
        ▼
MockAgentService.startReview()
        │
        ▼
Risk events are emitted through eventBus
        │
        ├── AI Robot moves to risk zones
        ├── Visual State Mapper derives workstation states
        ├── Workstations transition BLUE → YELLOW → RED where appropriate
        └── Event Stream receives activity
        │
        ▼
Chat panel receives a friendly Thai summary and quick replies
        │
        ▼
Manager selects “Follow-up”
        │
        ▼
Confirmation dialog appears
        │
        ▼
followup.created event → task.blocked event
        │
        ▼
3D scene, Event Stream, and Project Pulse update
```

### Flow 2: Team Lead Updates a Task Through Chat

```text
Team Lead types: “UAT เสร็จ 80% แล้ว”
        │
        ▼
MockAgentService.handleCommand()
        │
        ▼
Intent and task progress are detected
        │
        ▼
updateTaskProgress() updates the task store
        │
        ▼
task.updated event is emitted
        │
        ├── Event Stream updates
        ├── Visual State Mapper recalculates the workstation state
        └── Digital Office reflects the new status
```

### Flow 3: Task Board Management

```text
Manager selects Task Board from the ☰ sidebar
        │
        ▼
Manager drags a card between Kanban columns
        │
        ▼
updateTaskStatus() updates store state and emits an event
        │
        ▼
Manager switches to WBS table and edits status or progress inline
        │
        ▼
Store and events remain synchronized
        │
        ▼
Manager returns to Digital Office; 3D visual state reflects changes
```

## 7. Domain Data Model

Canonical TypeScript definitions live in `src/types/index.ts`.

```ts src/types/index.ts
export type TaskStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'AT_RISK'
  | 'DONE'

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type RiskLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface Task {
  id: string
  projectId: string
  title: string
  ownerId: string
  teamId: string
  status: TaskStatus
  priority: TaskPriority
  progress: number
  startDate: string
  dueDate: string
  blocker?: string
  riskLevel: RiskLevel
  lastUpdatedAt: string
  aiSummary?: string
  aiRiskAssessment?: string
}

export interface AppEvent {
  id: string
  type: string
  projectId: string
  taskId?: string
  userId?: string
  timestamp: string
  message: string
  color?: string
  payload?: unknown
}

export interface UserPrefs {
  activeProjectId: string
  dndMode: boolean
  dndUntil?: string
  digestMode: boolean
  notificationPolicy: string
  defaultView: string
}
```

## 8. Mock Data Baseline

| Data set | Phase 1 baseline |
| --- | --- |
| Project | Phoenix (`id: phoenix`) |
| Task coverage | 7 tasks across Product, Technology, and Operations zones |
| Users | `u1`–`u5`: Somchai, Nida, Patchara, Krit, and Manager |
| Seed events | `task.blocked` for UAT, `ai.review_started`, `ai.risk_detected`, and `task.completed` |
| Seed chat | AI follow-up conversation example in Thai |

Mock data exists to demonstrate the complete event and visual flow without any backend dependency.

## 9. Notification Policy

| Trigger | Delivery | Policy |
| --- | --- | --- |
| `task.updated` | Dashboard | Update the dashboard only. |
| `task.blocked` | LINE | Send immediately for HIGH or CRITICAL severity. |
| `task.overdue` | LINE | Send immediately. |
| `task.stale` | AI follow-up | Use friendly Thai wording; do not present as an alarm. |
| `ai.risk_detected` | LINE | Send only when risk is HIGH or CRITICAL. |
| Daily report | Digest | Send at 5:00 PM. |

### User Controls

Users control notifications through chat commands:

- **DND mode** — suppress notifications for a chosen duration.
- **Snooze per task** — defer a specific task notification.
- **Digest mode** — receive grouped notifications instead of immediate messages where supported.

No autonomous AI action that contacts or changes a task should bypass a confirmation dialog in Phase 1.

## 10. Visual State Mapper

`src/lib/visualStateMapper.ts` is the single mapping layer between task status and 3D presentation.

| Task status | Avatar state | Desk state | Screen state | Alert state |
| --- | --- | --- | --- | --- |
| `TODO` | `IDLE` | `DIM` | `OFF` | `NONE` |
| `IN_PROGRESS` | `WORKING` | `ACTIVE` | `ON` | `NONE` |
| `BLOCKED` | `WAITING` | `BLOCKED` | `WARNING` | `RED` |
| `AT_RISK` | `WORKING` | `RISK` | `ON` | `YELLOW` |
| `DONE` | `IDLE` | `DONE` | `OFF` | `NONE` |

### Rendering Expectations

- Workstation transitions must animate smoothly rather than change instantaneously.
- The AI Robot moves to zones containing at-risk or blocked work while a review is active.
- Any new visual state must be added to the mapper and derived store state before it is rendered in Three.js.

## 11. Acceptance Criteria — Phase 1

- [ ] The **AI Review** button triggers the complete animated flow end-to-end.
- [ ] Workstation colors transition smoothly rather than instantly.
- [ ] The AI Robot moves to risk zones during an AI review.
- [ ] The Chat Panel displays friendly Thai messages and quick replies.
- [ ] A confirmation dialog appears before every AI action that affects a task or sends a follow-up.
- [ ] DND mode suppresses notifications.
- [ ] Kanban drag-and-drop updates the 3D office scene.
- [ ] WBS table inline editing synchronizes with the shared store.
- [ ] The Event Stream updates in real time for all actions.
- [ ] No business logic exists inside Three.js components.

## 12. Roadmap

### Phase 1 — Current: Frontend Prototype

- Next.js UI and mock data
- Zustand client-side stores
- Mock AI review, follow-up, and command handling
- Task Board, Chat Panel, Event Stream, Project Pulse, and Digital Office 3D
- Steps 1–7 are complete; **Step 8: Demo Flow** remains
- No backend services or external integrations

### Phase 2 — Backend Integration

- Node.js and NestJS REST API
- PostgreSQL on Azure Flexible Server
- Real LINE Messaging API and webhook integration
- Azure OpenAI using the `gpt-5.6-terra` deployment with function calling
- Native project-management APIs and PostgreSQL persistence for projects, tasks, WBS, task history, comments, and approvals
- n8n automation middleware for supporting notifications and integrations, not as the source of project-management data
- `RealAgentService` replaces `MockAgentService` while preserving the UI contract

### Phase 3 — Advanced Features

- Task dependency graph
- AI delay prediction
- Multi-project 3D office with multiple buildings
- Manager approval workflow
- Escalation engine
- Audit and analytics dashboard

## 13. Developer Onboarding Checklist

1. Read this brief and review the architecture rules before changing any task or 3D code.
2. Run the application with `npm run dev` and review the Office, Board, and Chat views.
3. Trace one task update from UI or chat → store/service → event → visual mapper → 3D scene.
4. Keep business logic in stores, services, and libraries—not in rendering components.
5. Use the `IAgentService` contract when adding or replacing agent implementations.
6. Verify production readiness with `npm run build` before submitting changes.
7. Update this brief when introducing modules, data contracts, architecture changes, or scope changes.

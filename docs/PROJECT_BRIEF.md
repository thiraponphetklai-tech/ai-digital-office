# AI Digital Office — Product and Delivery Brief

> **Status:** Deployed Azure application
>
> **Source of truth:** [AGENTS.md](../AGENTS.md) and the implemented code

## Product

AI Digital Office supports multiple internal projects through a project hub,
Kanban/WBS planning, schedule and workload views, a 3D office visualization,
outbound LINE reports, and an advisory AI chat experience. The application is
backed by PostgreSQL and does not use mock or browser Local Storage data as its
server source of truth.

## Implemented capabilities

- Project, task, resource, KPI metric, calendar, milestone, and dependency
  persistence through Prisma/PostgreSQL.
- Local account sessions with temporary-password change flow.
- Project Hub, Kanban, WBS, Gantt, timeline, calendar, workload, and project
  resource views.
- Rule-based schedule intelligence and outbound LINE project reports.
- Azure AI Foundry-backed chat that uses project context and is advisory only.
- System Admin-only LINE integration settings with encrypted PostgreSQL storage;
  the UI exposes configuration status and a masked recipient ID only.
- Project membership visibility: creators receive `PROJECT_ADMIN` membership,
  Standard Users see only granted projects, and System Admins retain
  cross-project access.
- WBS primary owners plus additional assignees, shown by display name in WBS
  and outbound LINE reports.
- AI-assisted project generation: an editable JSON draft is explicitly
  confirmed before a transaction creates the project, tasks, membership, and
  audit record.
- 3D office, event bus, visual-state mapper, and mock agent experience for
  presentation and interaction flows.

## Platform boundaries

| Area | Current state |
| --- | --- |
| Database | PostgreSQL is the source of truth. |
| Authentication | Local username/password session flow is implemented. |
| Authorization | Project, task, project-membership, and AI-project creation routes enforce server-side session/access checks; remaining route coverage is tracked below. |
| AI | Azure AI Foundry chat is advisory. AI project drafts are non-mutating until an authorized user explicitly confirms them. |
| LINE webhook | Health/logging endpoint only; no signature validation or command processing. |
| Scheduled reports | Protected endpoints exist; the scheduler is managed outside this repository. |
| Automated tests | Not currently implemented. |

## Architecture constraints

```text
Business logic / API / store
        ↓
Event bus
        ↓
Visual state mapper
        ↓
Zustand visual state
        ↓
React Three Fiber rendering
```

- Keep Three.js rendering derived from visual state rather than embedding task
  business logic in scene components.
- Use `src/lib/visualStateMapper.ts` for task-to-visual-state mapping and
  `src/lib/eventBus.ts` for business events.
- Keep AI responses grounded in supplied project context and advisory unless a
  confirmed action route is explicitly added.

## Planned work

- LINE webhook signature validation, reply flow, and command parser.
- Automated tests and deployment health checks.
- Complete server-side authorization coverage for resource, LINE, and AI-context APIs.

## Prioritized feature backlog

### 1. Project visibility by permission — Implemented

- Users see only projects for which they have an explicit membership or
  assigned access when entering the Project Hub.
- The creator is automatically granted access to a newly created project;
  `STANDARD_USER` may create projects and initially sees only projects they
  created or were explicitly granted access to.
- Project/task API filtering is server-side. Extending the same default-deny
  rule to resource, LINE, and AI-context endpoints remains open.

### 2. Multiple WBS owners — Implemented

- WBS tasks allow multiple accountable contributors through the
  existing `TaskAssignee` relation, while retaining `ownerId` as its primary
  owner for compatibility.
- The resource picker supports a primary
  owner plus additional assignees. Show names, not resource IDs, throughout
  WBS, dashboards, and LINE reports.
- Reports show the primary owner followed by additional owners. Workload
  allocation remains an area for future refinement.

### 3. AI-generated project with example tasks — Implemented

- Project Hub provides a flow that asks for project goal, scope, target date,
  and optional team/resources, then generates a project draft and example WBS
  tasks using Azure AI Foundry.
- The AI result is a preview only. A user explicitly confirms before any
  project/tasks are persisted, and generated content must be editable first.
- `STANDARD_USER` may confirm and create their own generated project. The
  creation transaction must also create their project membership so they can
  see the new project immediately.
- Guardrails use supplied inputs only, do not invent completed work or
  commitments, validate task schema/dates/owners server-side, and keep an
  audit record of the confirmed creation.

### 4. Ask about project details through LINE

- Extend the LINE webhook from health/logging to verified inbound messages:
  validate `X-Line-Signature`, map the LINE sender to an application identity,
  and authorize project access before returning any project information.
- Support read-only project questions first. Responses use the same grounded,
  advisory AI guardrails as the application and must not mutate records.
- Add allow-listing, rate limits, short reply limits, audit logs, and safe
  fallback responses for unlinked users, unauthorized projects, or AI errors.

## Deferred LINE notification requirements

> Do not create the scheduler or activate these notifications until explicitly
> requested. Recipients and credentials remain in encrypted configuration or
> Azure secrets, never in Git.

1. **New task assignment**
   - When an owner is assigned to a task, notify the configured LINE group.
   - Mention the owner's LINE display/mention name when it has been securely
     mapped to the application user/resource.
   - Write in concise, natural Thai in a manager-to-team tone: task name,
     expected action, due date when available, and a polite acknowledgement
     request. Do not expose internal IDs.

2. **Stale progress follow-up**
   - When a task has not received a progress update beyond its configured
     follow-up date/threshold, notify the configured LINE group and mention
     the task owner.
   - Use a helpful manager follow-up tone, state the last known progress and
     requested update, and avoid claiming that the owner was contacted or that
     progress changed unless the outbound LINE delivery was confirmed.
   - Define the authoritative follow-up date and deduplication/cooldown before
     implementation to prevent repeated reminders.

3. **Weekly group summary**
   - Send the existing WBS task-based project summary to the configured LINE
     group every **Monday at 07:00 Asia/Bangkok**.
   - For an Azure scheduler that uses UTC, this is cron expression
     `0 0 * * 1` (Monday 00:00 UTC).
   - Use a protected endpoint with `CRON_SECRET`, sequential AI requests,
     delivery logging, retry/fallback behavior, and a manual test run before
     enabling the schedule.

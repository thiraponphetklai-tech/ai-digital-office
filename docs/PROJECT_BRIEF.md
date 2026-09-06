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
- 3D office, event bus, visual-state mapper, and mock agent experience for
  presentation and interaction flows.

## Platform boundaries

| Area | Current state |
| --- | --- |
| Database | PostgreSQL is the source of truth. |
| Authentication | Local username/password session flow is implemented. |
| Authorization | Not every API route enforces server-side role authorization yet. |
| AI | Azure AI Foundry chat is implemented; it does not mutate records. |
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

- Server-side authorization for all relevant APIs.
- LINE webhook signature validation, reply flow, and command parser.
- Automated tests and deployment health checks.
- AI-assisted actions only with explicit confirmation and audit history.

## Prioritized feature backlog

### 1. Project visibility by permission

- Users should see only projects for which they have an explicit membership or
  assigned access when entering the Project Hub.
- The creator is automatically granted access to a newly created project;
  `STANDARD_USER` may create projects and initially sees only projects they
  created or were explicitly granted access to.
- Enforce the same filter server-side for project, task, resource, LINE, and
  AI-context endpoints; hiding a project in the UI is not authorization.
- System Administrators retain cross-project access. Define the access model
  and default-deny behavior before migration/backfill of existing memberships.

### 2. Multiple WBS owners

- Allow a WBS task to have multiple accountable contributors through the
  existing `TaskAssignee` relation, while retaining `ownerId` as its primary
  owner for compatibility.
- Replace free-text owner editing with a resource picker that supports primary
  owner plus additional assignees. Show names, not resource IDs, throughout
  WBS, dashboards, and LINE reports.
- Decide reporting semantics for multiple owners (for example, show primary
  owner first followed by additional owners) and preserve workload allocation.

### 3. AI-generated project with example tasks

- Provide a Project Hub flow that asks for project goal, scope, target date,
  and optional team/resources, then generates a project draft and example WBS
  tasks using Azure AI Foundry.
- The AI result must be a preview only. A user explicitly confirms before any
  project/tasks are persisted, and generated content must be editable first.
- `STANDARD_USER` may confirm and create their own generated project. The
  creation transaction must also create their project membership so they can
  see the new project immediately.
- Guardrails: use supplied inputs only, do not invent completed work or
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

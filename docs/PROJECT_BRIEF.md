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

# AI Digital Office — System Specification

## Purpose

AI Digital Office is a multi-project management prototype for planning work, visualising delivery schedules, monitoring resource load, and sending rule-based project summaries to LINE.

This document describes the **implemented system**. Do not describe planned database, LLM, or LINE-command features as if they already exist.

## Technology

- Next.js `16.3.1`, React `19`, TypeScript
- Zustand with browser Local Storage persistence for application state
- React Three Fiber / Drei / Three.js for the 3D office experience
- `@dnd-kit` for Kanban drag and drop
- LINE Messaging API for outbound push messages
- Tailwind is installed, but primary UI styling is inline React style objects and `src/app/globals.css`

Available commands:

```powershell
npm run dev
npm run build
npm run start
```

There is no automated test script. Run `npm run build` after implementation changes.

## Current data model and persistence

Domain types are defined in `src/types/index.ts`.

- `Project`: dates, working calendar, holidays, milestones, member/resource IDs, optional KPI metrics.
- `Task`: owner, optional multiple assignees, status, progress, dates, estimates, actual hours, dependencies, blocker, and risk level.
- `Resource`: name, role, capacity per day, active state, optional skills/company.

Seed data resides in `src/data/mockData.ts`.

Client state is in `src/store/index.ts`:

- Task, Project, Resource, and Preferences stores persist in Local Storage.
- Store migrations deliberately refresh selected seeded tasks/projects after version changes.
- Browser edits are not available to server routes.

**Important limitation:** LINE routes read `MOCK_*` server-side data, not Zustand/Local Storage data. A Task edit in a browser does not affect a LINE report until the system has a shared backend database.

## Current players

| ID | Name | Role |
| --- | --- | --- |
| `u1` | เบ้น | Engineer |
| `u2` | เบล | Engineer |
| `u3` | บอย | Engineer |
| `u4` | แกท | Engineer |
| `u5` | ออฟ | Engineer |
| `u6` | นัน | Project Manager |

Keep existing IDs stable when changing names so assignments and workload calculations remain valid.

## Seeded projects

### BitLocker Migration (`bitlocker-migration`)

- Branch KPI: `5,912 / 5,912`.
- HQ KPI: `3,729 / 3,733`; four machines remain.
- Current actions:
  - นัน follows up and confirms appointments for the remaining three executive machines.
  - เบ้น, เบล, and แกท are assigned to execute one scheduled executive-machine BitLocker action on `2026-08-25`.
- Milestones: HQ rollout complete (`2026-08-29`) and project closure (`2026-08-31`).

### M365 Apps Migration Project (`m365-migration-project`)

- HQ KPI: `2,431 / 3,386` machines (`71.80%`), 955 remaining.
- Branch KPI: `1,020 / 1,918` branches (`53.18%`), 898 remaining.
- Milestones: HQ migration 50% (`2026-09-30`), Branch migration 50% (`2026-10-31`), migration complete (`2026-12-31`).
- LINE intelligence has M365-specific advice: monitor Branch throughput, retain HQ rollout pace, and have นัน review weekly throughput and rebalance resources if Branch slows.

### AI Digital Office Platform (`ai-digital-office`)

Internal product-development project used to demonstrate project-scoped planning features.

## User-facing functionality

### Project workspace

`src/app/page.tsx` provides the application shell, project switching, update-to-LINE dialog, sidebar navigation, and workspace routing.

Implemented views include:

- Project Hub: select/create projects.
- 3D Office: task zones, desks, avatars, visual status and mock AI robot.
- Kanban Board: task status columns and drag/drop.
- WBS / worksheet: task data editing and CSV export.
- Timeline.
- Calendar: working/non-working dates, holidays, due dates, target date, and milestones.
- Gantt / Project Plan: 3-month range, task bars from planned dates or due-date fallback, progress overlay, milestone/target/today markers.
- Resource Workload: planned hours and daily capacity display.
- Project resources dialog: project resource membership.

### Task planning

Task editing supports title, description, owner, assignees, team, priority, planned start/end, estimated/actual hours, and due date. Blocked tasks carry a blocker reason. Gantt prefers planned start/end and uses due date as a one-day fallback.

## Schedule intelligence

`src/lib/projectTimeline.ts` calculates working days using project calendar rules plus company/project holidays.

`src/lib/projectIntelligence.ts` calculates:

- Work progress: weighted KPI metric progress when metrics exist; otherwise average task progress.
- Schedule progress and schedule delta.
- Remaining working days and On Schedule / Ahead / Behind / Overdue state.
- Task count by status.
- Upcoming and overdue milestones.
- Upcoming planned actions within 14 days.
- Approximate resource capacity alerts from estimates, dates, and assignees.

Recommendations are deterministic rule-based text, not LLM output. Priority is project-specific M365 guidance, overdue milestones, schedule delay, capacity alerts, risk/blocked tasks, then normal monitoring guidance.

## AI agent status

`src/services/mockAgent.ts` and the 3D office components implement a **mock UI agent**. It can simulate reviews, generate UI events/chat responses, and update visual presentation.

There is no production LLM integration. The system does not currently:

- call Azure OpenAI, OpenAI, or another LLM;
- forecast delivery using a trained/statistical model;
- interpret LINE messages into Task changes;
- synchronise browser edits to a backend;
- provide autonomous task execution.

## LINE integration

LINE routes are under `src/app/api/line/`:

| Route | Purpose | Authorization |
| --- | --- | --- |
| `POST /api/line/test-message` | Send a fixed connection test | `Bearer CRON_SECRET` |
| `POST /api/line/manual-project-update` | Send a project update from UI | no CRON header; requires configured LINE variables |
| `POST /api/line/analyze-project` | Send AI schedule analysis for one/many projects | `Bearer CRON_SECRET` |
| `GET/POST /api/line/webhook` | Health response / logs webhook source metadata | no signature validation or command processing |

Required server environment variables:

```dotenv
LINE_CHANNEL_ACCESS_TOKEN=
LINE_DAILY_SUMMARY_RECIPIENT_ID=
CRON_SECRET=
```

Outbound LINE reports include project name, Thai-formatted current date, work/schedule progress, KPI metrics, status counts, relevant milestone/action/capacity lines, and rule-based recommendations. LINE messages already sent cannot be edited; send a new report after deploying changes.

## File ownership guide

- `src/data/mockData.ts`: seeded projects, tasks, metrics, milestones, players.
- `src/store/index.ts`: browser persistence, state mutations, migrations.
- `src/lib/projectTimeline.ts`: calendar and working-day math.
- `src/lib/projectIntelligence.ts`: report calculations and recommendation text.
- `src/app/api/line/*/route.ts`: server-side LINE push behavior.
- `src/components/`: user-facing views.
- `src/services/mockAgent.ts`: demo-only agent behavior.

## Change guidelines

1. Preserve Thai user content and project metrics exactly unless a request supplies replacement values.
2. When seed data changes and browser users must receive it, increment the appropriate Zustand persistence version and update its migration deliberately.
3. When LINE report content changes, update both `manual-project-update` and `analyze-project` if they should remain consistent.
4. Keep secrets out of source control; use local/deployment environment variables.
5. Build successfully before committing.
6. Before using unfamiliar Next.js APIs, read the applicable documentation under `node_modules/next/dist/docs/` as required by `AGENTS.md`.

## Current known gaps

- No database or server-side source of truth.
- No authentication/authorization model for UI users.
- No LINE webhook signature verification, reply flow, or command parser.
- No automated tests.
- No actual AI/LLM service.
- `src/components/____.tsx` and `src/app/____.tsx` are placeholder files and do not represent application features.

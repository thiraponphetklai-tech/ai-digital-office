# AI Digital Office — Implementation Guide

`AGENTS.md` is the repository authority. This document is a concise map of the
implemented system and must remain consistent with it.

## Runtime and persistence

- Next.js 16.3.1, React 19, TypeScript, Prisma, and PostgreSQL.
- Azure Container Apps runs the production `Dockerfile` image.
- PostgreSQL is the source of truth. `ApiDataHydrator` loads projects,
  resources, and tasks from server APIs into the client stores.
- Zustand is used for client/UI state. Do not treat Local Storage or mock data
  as the authoritative persisted state.
- Local username/password authentication creates an HTTP-only session cookie.
  It is not a substitute for route-level authorization.

## Main locations

| Path | Responsibility |
| --- | --- |
| `prisma/schema.prisma` | PostgreSQL schema. |
| `prisma/seed.ts` | Approved environment initialization data. |
| `src/lib/projectRepository.ts` | Server-side project/task reads. |
| `src/lib/databaseMappers.ts` | Prisma-to-domain mapping. |
| `src/app/api/` | Application APIs. |
| `src/lib/localAuth.ts` | Session and password handling. |
| `src/lib/foundryClient.ts` | Azure AI Foundry client. |
| `src/lib/projectIntelligence.ts` | Deterministic project intelligence. |
| `src/lib/projectTimeline.ts` | Working-day and schedule calculations. |
| `src/lib/eventBus.ts` | UI/event pub-sub. |
| `src/lib/visualStateMapper.ts` | Task-to-3D visual-state mapping. |
| `src/components/` | Client-facing views. |

## AI and LINE

`POST /api/ai/chat` sends project-grounded advisory requests to Azure AI
Foundry through managed identity. It must not claim to modify data, create
records, or send messages.

`POST /api/ai/project-draft` generates a bounded, structured project draft.
It records a redacted audit prompt and draft, and no records are created until
the authorized user confirms through `POST /api/projects`.

LINE outbound reporting routes read PostgreSQL project data:

| Route | Purpose | Access |
| --- | --- | --- |
| `POST /api/line/test-message` | Fixed connection test | `Bearer CRON_SECRET` |
| `POST /api/line/manual-project-update` | One project update from the UI | Configured LINE variables |
| `POST /api/line/analyze-project` | Analysis for selected active projects | `Bearer CRON_SECRET` |
| `GET/POST /api/line/webhook` | Health/logging only | No signature validation yet |

The scheduler is operated outside this repository. Webhook command processing,
signature validation, and reply handling are not implemented.

## Working rules

1. Keep secrets in Azure secrets/Key Vault references, never in source control.
2. For schema changes: create a reviewed migration, generate Prisma, apply the
   migration through the approved Azure workflow, then deploy the app image.
3. Preserve server-side authorization when adding sensitive or mutating APIs.
4. Keep business logic out of Three.js components; event bus and visual mapper
   remain the transition path for 3D state.
5. Run `npm run build` before committing.

## Known gaps

- Server-side role authorization is not yet uniformly enforced outside
  project/task/membership and AI-project creation routes.
- No LINE webhook signature validation, reply flow, or command parser.
- No automated test suite.
- Mock agent and mock data remain for visual/demo flows; they are not the
  server source of truth.

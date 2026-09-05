# AI Digital Office

AI Digital Office is a multi-project management application for planning,
delivery tracking, resource workload, LINE project updates, and advisory AI
chat. It runs on Next.js and is deployed to Azure Container Apps with Azure
Database for PostgreSQL.

The repository operating rules are in [AGENTS.md](AGENTS.md). They take
precedence over other project documentation.

## Architecture

- Next.js 16 / React 19 / TypeScript
- Prisma with PostgreSQL as the server-side source of truth
- Azure Container Apps production image from `Dockerfile`
- Azure AI Foundry chat using managed identity
- LINE Messaging API for outbound reports
- Zustand for client UI state; it is not the authoritative persisted database

## Local setup

Install dependencies and provide a local `.env` file with the required values:

```dotenv
DATABASE_URL=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_DAILY_SUMMARY_RECIPIENT_ID=
CRON_SECRET=
FOUNDRY_OPENAI_ENDPOINT=
FOUNDRY_MODEL_DEPLOYMENT=
AZURE_CLIENT_ID=
```

`FOUNDRY_*` and `AZURE_CLIENT_ID` are required only when testing the AI chat.
Use a credential supported by `DefaultAzureCredential`; production uses managed
identity. Never commit `.env` files.

```powershell
npm ci
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. The seeded local account must be changed from its
temporary password on first sign-in.

## Commands

```powershell
npm run dev
npm run build
npm run start
npm run db:generate
npm run db:migrate
npm run db:seed
```

There is currently no automated test command. Run `npm run build` before
submitting changes.

## Deployment and operations

The runtime is a non-root Node.js 22 container built from `Dockerfile`.
Apply Prisma migrations through the approved Azure migration workflow before
deploying an application version that requires them. See
[docs/azure-postgresql.md](docs/azure-postgresql.md) for database operations.

`POST /api/line/analyze-project` and `POST /api/line/test-message` require an
`Authorization: Bearer <CRON_SECRET>` header. Scheduling those calls is an
Azure/platform operation, not a process implemented in this repository.

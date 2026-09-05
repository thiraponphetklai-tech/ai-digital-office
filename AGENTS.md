<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AI Digital Office — Repository Operating Rules

`AGENTS.md` is the authoritative repository guide. When other Markdown files
conflict with the implemented code or this file, follow this file and the code.

## Deployed architecture

- The application is deployed on Azure Container Apps using the repository
  `Dockerfile` production image.
- PostgreSQL is the server-side source of truth, accessed with Prisma through
  `DATABASE_URL`. Do not reintroduce browser-only persistence as an authority.
- Azure AI Foundry is used for the advisory chat endpoint through managed
  identity. Its endpoint and deployment are configured with
  `FOUNDRY_OPENAI_ENDPOINT`, `FOUNDRY_MODEL_DEPLOYMENT`, and (when required)
  `AZURE_CLIENT_ID`.
- LINE push reporting uses server environment variables. A scheduler is
  external to this repository and calls protected endpoints with `CRON_SECRET`.

## Change rules

1. Keep credentials, connection strings, recipient IDs, and access tokens out
   of Git. Use Azure Container Apps secrets or Key Vault references.
2. Treat Prisma schema changes as deployment changes: generate the client,
   deploy the migration through the approved Azure migration workflow, then
   deploy the application image.
3. The UI login gate is not sufficient API authorization. Preserve or add
   server-side authorization checks when exposing a mutating or sensitive API.
4. The AI chat is advisory only. It must not claim to have changed records or
   sent messages unless that action is implemented and confirmed.
5. Run `npm run build` before committing application changes.

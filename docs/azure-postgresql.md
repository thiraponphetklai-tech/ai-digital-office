# Azure PostgreSQL operations

The application is deployed on Azure and uses PostgreSQL through Prisma.
`DATABASE_URL` is a deployment secret; do not commit it or paste production
values into tickets, logs, or documentation.

## Required runtime settings

Configure these as Azure Container Apps secrets or Key Vault-backed settings.

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | TLS PostgreSQL connection string for the application account. |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API bearer token. |
| `LINE_DAILY_SUMMARY_RECIPIENT_ID` | LINE group or user recipient. |
| `CRON_SECRET` | Secret for protected report endpoints. |
| `LINE_CONFIG_ENCRYPTION_KEY` | Base64-encoded 32-byte key that encrypts LINE settings stored in PostgreSQL. |
| `FOUNDRY_OPENAI_ENDPOINT` | Azure AI Foundry OpenAI endpoint. |
| `FOUNDRY_MODEL_DEPLOYMENT` | AI Foundry model deployment name. |
| `AZURE_CLIENT_ID` | Optional user-assigned managed identity client ID. |

The workload identity needs access to the configured Foundry resource. The
database connection must require TLS. Prefer private networking; if public
access is necessary, allow only the approved application egress addresses.

LINE settings entered by a System Admin are encrypted in PostgreSQL and are
never returned by the UI or Admin API. Keep `LINE_CONFIG_ENCRYPTION_KEY` in
Azure Container Apps secrets or a Key Vault reference. Rotating it requires
decrypting and re-encrypting existing settings first; do not replace it blindly.

## Schema deployment

Apply a reviewed migration before deploying an image that depends on it:

```powershell
npm run db:generate
npm run db:migrate
```

Run `npm run db:seed` only when initializing an approved environment. It is not
a routine production deployment command because it may alter seeded records.

The repository Dockerfile contains a dedicated `migrator` stage for the
one-off Azure Container Apps migration workflow; build it explicitly with
Docker's `--target migrator`. The web runtime image stays minimal and does not
carry the Prisma CLI. The current production database predates Prisma
migration history, so the approved Container Apps job uses the generated
Prisma binary with `prisma db push`; do not switch it to `migrate deploy`
until the database has been formally baselined.

## Recovery and TLS

`prisma/recover-task-state.ts` requires both `DATABASE_URL` and
`RECOVERY_DATABASE_URL`. Treat it as an approved recovery operation, not a
normal deployment step.

If Prisma engine installation fails with `unable to get local issuer
certificate`, configure the organization root CA on the approved build or
migration runner. Do not disable TLS certificate validation.

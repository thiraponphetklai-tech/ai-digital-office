# Azure PostgreSQL setup

## Required application settings

Configure these values in Azure App Service / Container Apps. Do not commit them to Git.

| Name | Value |
| --- | --- |
| `DATABASE_URL` | `postgresql://APP_USER:APP_PASSWORD@SERVER_NAME.postgres.database.azure.com:5432/ai_digital_office?sslmode=require` |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE channel access token |
| `LINE_DAILY_SUMMARY_RECIPIENT_ID` | LINE target group or user ID |
| `CRON_SECRET` | Long random value for protected scheduled endpoints |

## Provision database

1. Create **Azure Database for PostgreSQL Flexible Server** in the required Azure region.
2. Create database `ai_digital_office` and a least-privilege application user.
3. Configure networking: private access is preferred. For a public proof of concept, allow only the App Service outbound addresses and require TLS.
4. Set `DATABASE_URL` in the application settings / Key Vault reference.

## Apply schema and seed initial production data

Run these from an approved deployment runner with `DATABASE_URL` set:

```powershell
npx prisma generate
npx prisma migrate deploy
npx tsx prisma/seed.ts
```

The seed imports the current projects, tasks, KPI metrics, milestones, and six players into PostgreSQL. It is for initial data migration; subsequent production updates must use the database APIs.

## Corporate TLS note

If `npx prisma generate` fails while downloading Prisma engines with `unable to get local issuer certificate`, install/configure the organization root CA for Node.js on the approved build runner. Do not disable TLS validation. Azure deployment runners should have normal trusted certificate chains.

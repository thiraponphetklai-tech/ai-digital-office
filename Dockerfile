FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
COPY . .
RUN npx prisma generate > /tmp/prisma-generate.log 2>&1 || (base64 /tmp/prisma-generate.log && exit 1)
RUN npm run build > /tmp/next-build.log 2>&1 || (base64 /tmp/next-build.log && exit 1)

# Used only by the one-off Azure Container Apps migration job.
# It retains the Prisma CLI and schema; the web runtime image remains minimal.
FROM dependencies AS migrator
COPY prisma ./prisma
RUN npx prisma generate > /tmp/prisma-generate.log 2>&1 || (base64 /tmp/prisma-generate.log && exit 1)

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

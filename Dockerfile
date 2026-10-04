# syntax=docker/dockerfile:1
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 STANDALONE=1
RUN npm run build

FROM node:24-slim AS run
WORKDIR /app
# AUTH_SECRET, PAYMENT_WEBHOOK_SECRET and SITE_URL must be supplied at run time (see .env.example).
# ADMIN_EMAIL and ADMIN_PASSWORD create the first owner account on a fresh database.
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 DATABASE_PATH=/data/alta.db
# Run as an unprivileged user; /data is the volume that holds the SQLite database.
RUN useradd --system --uid 1001 app && mkdir -p /data && chown app /data
COPY --from=build --chown=app /app/public ./public
COPY --from=build --chown=app /app/.next/standalone ./
COPY --from=build --chown=app /app/.next/static ./.next/static
USER app
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]

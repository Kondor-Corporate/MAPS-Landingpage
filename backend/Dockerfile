FROM node:22-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build

COPY prisma/schema.prisma ./prisma/schema.prisma
COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate
RUN npm run build

FROM node:22-bookworm-slim AS prod-deps
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN npm ci --omit=dev && npm cache clean --force

FROM deps AS jobs

COPY prisma/schema.prisma ./prisma/schema.prisma
COPY prisma/migrations ./prisma/migrations
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

RUN addgroup --system appgroup \
  && adduser --system --ingroup appgroup appuser \
  && chown -R appuser:appgroup /app

USER appuser

CMD ["npm", "run", "db:migrate:deploy"]

FROM node:22-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && addgroup --system appgroup \
  && adduser --system --ingroup appgroup appuser

COPY package.json package-lock.json ./
COPY --from=prod-deps /app/node_modules ./node_modules

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

RUN rm -rf dist/jobs \
  && mkdir -p uploads/certificaciones uploads/fotos \
  && chown -R appuser:appgroup /app

USER appuser

ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD curl -f "http://127.0.0.1:${PORT:-8080}/api/v1/health" || exit 1

CMD ["node", "dist/server.js"]

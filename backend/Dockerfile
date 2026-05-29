FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache curl \
  && addgroup -S appgroup \
  && adduser -S appuser -G appgroup

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

RUN mkdir -p uploads/certificaciones \
  && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

CMD ["node", "dist/server.js"]

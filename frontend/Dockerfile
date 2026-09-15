FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS dev

ENV VITE_API_BASE_URL=http://127.0.0.1:3000/api/v1

EXPOSE 5173

HEALTHCHECK --interval=15s --timeout=10s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:5173').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM deps AS build

ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build-time only (baked into dist/index.html). Not Cloud Run runtime env.
# Default keeps local/staging non-indexable unless explicitly enabled.
ARG VITE_PUBLIC_INDEXING=false
ENV VITE_PUBLIC_INDEXING=$VITE_PUBLIC_INDEXING

ARG VITE_PUBLIC_SITE_URL=
ENV VITE_PUBLIC_SITE_URL=$VITE_PUBLIC_SITE_URL

# Build-time only (baked into the SPA bundle). Not Cloud Run runtime env.
# Optional: if omitted, the login WhatsApp CTA stays disabled.
ARG VITE_MAPS_WHATSAPP_NUMBER=
ENV VITE_MAPS_WHATSAPP_NUMBER=$VITE_MAPS_WHATSAPP_NUMBER

COPY index.html ./
COPY tsconfig.json tsconfig.node.json vite.config.ts tailwind.config.ts postcss.config.js ./
COPY public ./public
COPY src ./src

RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --chmod=755 docker-entrypoint.d/15-validate-backend-origin.sh /docker-entrypoint.d/15-validate-backend-origin.sh
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]

# syntax=docker/dockerfile:1
FROM node:18-alpine AS base
LABEL maintainer="CNM-Fashion-System"
WORKDIR /app
RUN apk add --no-cache tini

# ── Development stage ──
FROM base AS dev
COPY package*.json ./
RUN npm ci --include=dev && npm cache clean --force
COPY . .
EXPOSE 5000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "run", "dev"]

# ── Production dependencies stage ──
FROM base AS prod-deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ── Production stage ──
FROM base AS prod
COPY --from=prod-deps /app/node_modules ./node_modules
COPY src ./src
COPY scripts ./scripts
COPY package*.json ./
EXPOSE 5000
USER node
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]

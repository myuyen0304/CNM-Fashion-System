# syntax=docker/dockerfile:1
FROM node:18-alpine AS base
LABEL maintainer="CNM-Fashion-System"
WORKDIR /app
RUN apk add --no-cache tini

# ── Development stage ──
FROM base AS dev
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY . .
EXPOSE 5173
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "run", "dev"]

# ── Build stage ──
FROM base AS build
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# ── Production (nginx) stage ──
FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/prod/nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

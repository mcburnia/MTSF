# MTSF — Multi-Tenant SaaS Framework
# Copyright (c) 2026 Loman Cavendish Limited (UK Company No. 06335037)
# All rights reserved.
#
# Licensed under the MTSF Licence. See LICENCE file in the project root.

FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npx tsc

FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3001

# Keep V8 heap below container memory limit to prevent cgroup OOM kills.
CMD ["node", "--max-old-space-size=384", "dist/index.js"]

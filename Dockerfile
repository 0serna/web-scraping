# Build stage
FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Production dependencies stage
FROM node:22-slim AS production-deps

WORKDIR /app

COPY package*.json ./

# Skip scripts to prevent husky prepare hook from running
RUN npm ci --omit=dev --ignore-scripts

# Production stage
FROM gcr.io/distroless/nodejs22-debian12:nonroot

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=production-deps /app/node_modules ./node_modules

CMD ["dist/index.js"]

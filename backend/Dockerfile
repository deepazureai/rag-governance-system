# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY backend/package*.json ./
COPY backend/tsconfig.json ./

RUN npm ci || npm install

COPY backend/src ./src

RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files first
COPY backend/package*.json ./

# Install all dependencies
RUN npm ci || npm install

# Copy built application and node_modules from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Create logs and archives directories with proper permissions
RUN mkdir -p logs archives && chown -R nodejs:nodejs logs archives

USER nodejs

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5001/api/health', (res) => { if (res.statusCode !== 200) throw new Error(res.statusCode) })"

ENTRYPOINT ["/usr/bin/dumb-init", "--"]

CMD ["node", "dist/index.js"]

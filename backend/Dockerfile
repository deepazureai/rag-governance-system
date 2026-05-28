# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY backend/package*.json ./
COPY backend/tsconfig.json ./

RUN npm install

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

# Install production dependencies only for runtime
RUN npm install --production=false

# Copy built application and node_modules from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Create all required directories with proper permissions BEFORE switching to nodejs user
RUN mkdir -p logs archives uploads/knowledge-base && \
    chown -R nodejs:nodejs logs archives uploads

USER nodejs

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5001/api/health', (res) => { if (res.statusCode !== 200) throw new Error(res.statusCode) })"

ENTRYPOINT ["/usr/bin/dumb-init", "--"]

CMD ["node", "dist/index.js"]

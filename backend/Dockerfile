# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci --only=production && \
    npm ci --only=development

COPY src ./src

RUN npm run build && \
    npm prune --production

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

# Copy only necessary files from builder
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs logs

USER nodejs

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5001/api/health', (res) => { if (res.statusCode !== 200) throw new Error(res.statusCode) })"

ENTRYPOINT ["/usr/bin/dumb-init", "--"]

CMD ["node", "dist/index.js"]

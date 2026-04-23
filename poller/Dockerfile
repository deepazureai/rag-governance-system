FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built TypeScript
COPY dist ./dist
COPY src ./src

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('fs').accessSync('/tmp/poller-health'); process.exit(0)" || exit 1

# Start service
CMD ["npm", "start"]

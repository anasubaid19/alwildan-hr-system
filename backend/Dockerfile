FROM node:22-alpine

# better-sqlite3 perlu build tools untuk compile native module
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY src/ ./src/

# Pastikan direktori data & uploads ada
RUN mkdir -p data uploads

EXPOSE 3010

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3010/api/health', r => process.exit(r.statusCode===200?0:1))" || exit 1

CMD ["node", "src/index.js"]

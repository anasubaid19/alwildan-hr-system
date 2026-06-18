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

CMD ["node", "src/index.js"]

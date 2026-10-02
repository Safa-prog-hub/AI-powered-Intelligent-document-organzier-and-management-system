# ── Node.js API gateway (Phase 8) ────────────────────────────────────────
# node:18-alpine keeps the image tiny while matching the blueprint.

FROM node:18-alpine

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package*.json ./
RUN npm install --no-audit --no-fund --omit=dev

# Application source + upload cache directory.
COPY src ./src
RUN mkdir -p uploads

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Entrypoint defined in package.json: `node src/server.js`.
CMD ["npm", "start"]

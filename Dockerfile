# MediVault container image. Two stages: build the React app, then run the API that serves it.

# ---- Stage 1: build the React app (needs the dev dependencies: Vite, Tailwind) ----
FROM node:20-alpine AS web
WORKDIR /build
COPY package*.json ./
# Once you have committed a package-lock.json (run `npm install` once locally), change this to `npm ci`.
RUN npm install
COPY index.html vite.config.js tailwind.config.js postcss.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build

# ---- Stage 2: the API, serving the built app ----
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
# Same note as above: use `npm ci --omit=dev` once a lockfile is committed.
RUN npm install --omit=dev

# Copy only what the server needs at run time (no tests, docs or frontend source)
COPY --chown=node:node config ./config
COPY --chown=node:node db ./db
COPY --chown=node:node middleware ./middleware
COPY --chown=node:node routes ./routes
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node server.js ./
COPY --from=web --chown=node:node /build/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Run as the unprivileged user that comes with the node image
USER node

# Reports healthy only when the app can also reach the database
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" || exit 1

# start:prod creates the tables on first run (and skips it after that), then starts the server
CMD ["npm", "run", "start:prod"]

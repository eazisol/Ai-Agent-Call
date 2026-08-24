FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS production

WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist

USER node
EXPOSE 3000
CMD ["sh", "-c", "node node_modules/typeorm/cli.js -d dist/database/data-source.js migration:run && node dist/main.js"]

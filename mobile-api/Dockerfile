FROM node:18-alpine AS builder
WORKDIR /app
COPY shared/ ../shared/
COPY mobile-api/package*.json ./
RUN npm ci
COPY mobile-api/ .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /shared /shared
USER node
EXPOSE 3002
CMD ["node", "dist/src/index.js"]

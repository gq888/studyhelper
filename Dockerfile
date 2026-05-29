# 学海小书院 - 单容器构建（前后端打包到一个镜像）
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
COPY server/package.json ./server/
COPY web/package.json ./web/
RUN npm install --workspaces --no-audit --no-fund

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/web/node_modules ./web/node_modules
COPY . .
RUN cd server && npx prisma generate \
    && cd .. && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/node_modules ./server/node_modules
COPY --from=build /app/server/prisma ./server/prisma
COPY --from=build /app/server/package.json ./server/
COPY --from=build /app/web/dist ./web/dist
COPY --from=build /app/node_modules ./node_modules
COPY .env* ./

EXPOSE 8787
CMD ["node", "server/dist/index.js"]

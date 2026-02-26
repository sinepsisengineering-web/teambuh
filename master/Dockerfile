FROM node:20-alpine

WORKDIR /app

# Установить bash и rsync для скриптов управления
RUN apk add --no-cache bash rsync openssl docker-cli docker-cli-compose

COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

COPY server.js ./
COPY public/ ./public/

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]

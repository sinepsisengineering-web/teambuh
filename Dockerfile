# ==========================================
# Multi-stage Dockerfile для TeamBuh
# Stage 1: build фронтенда (Vite)
# Stage 2: production контейнер (Node.js)
# ==========================================

# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем package.json первым для кэширования слоя npm install
COPY package.json package-lock.json* ./
RUN npm ci

# Копируем остальной код и собираем фронтенд
COPY . .
RUN npm run build

# --- Stage 2: Production ---
FROM node:20-alpine

WORKDIR /app

# Устанавливаем только production зависимости
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Копируем серверный код
COPY server/ ./server/

# Копируем скрипты инициализации
COPY scripts/ ./scripts/

# Копируем собранный фронт из builder
COPY --from=builder /app/dist ./dist/

# Создаём директорию для данных
RUN mkdir -p /app/data

# Переменные окружения
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Запуск
CMD ["node", "server/index.js"]

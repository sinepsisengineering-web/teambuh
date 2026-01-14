import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Устанавливаем базовый путь как './' для корректной работы
  // собранного приложения в Electron.
  base: './', 
  server: {
    port: 5173, // Указываем порт для dev-сервера
  },
})

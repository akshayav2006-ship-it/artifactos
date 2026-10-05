import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { aiPlugin } from './server/aiPlugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), aiPlugin()],
})

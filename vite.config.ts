import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    /* Let the stylesheet tests read the real token and style files. */
    css: { include: [/src\/(tokens|styles)\.css/] },
  },
})

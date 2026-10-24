import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// data/ is served statically (models, snapshots, cached notes) so the demo repos
// work with no backend; /api is proxied to FastAPI for live analysis and the agent.
export default defineConfig({
  plugins: [react()],
  publicDir: '../data',
  server: { proxy: { '/api': 'http://localhost:8000' } },
})

import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  server: {
    // Fixed port so the preview proxy always points at the right upstream.
    // (Honors PORT if the harness sets it; otherwise 5175 to avoid clashing
    // with another session's server on 5173.)
    port: process.env.PORT ? Number(process.env.PORT) : 5175,
    strictPort: true,
  },
})

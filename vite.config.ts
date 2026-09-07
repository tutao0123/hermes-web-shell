import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { hermesApiPlugin } from './server/hermesApiPlugin.ts'

function resolveAllowedHosts(env: Record<string, string>): true | string[] {
  const raw = env.VITE_ALLOWED_HOSTS?.trim()
  if (!raw || raw === 'true') return true
  if (raw === 'false') return []
  return raw
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean)
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), hermesApiPlugin()],
    server: {
      host: '127.0.0.1',
      port: 5174,
      strictPort: true,
      // Default true so Cloudflare / local tunnels work without hardcoding a hostname.
      // Override with VITE_ALLOWED_HOSTS=host1,host2 or VITE_ALLOWED_HOSTS=true
      allowedHosts: resolveAllowedHosts(env),
    },
  }
})

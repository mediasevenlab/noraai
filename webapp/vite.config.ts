import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  optimizeDeps: {
    // Workspace contracts change often; prebundling them leaves a stale Vite cache on Windows.
    exclude: ['@web-app-demo/contracts'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Same-origin /api in local dev so HttpOnly refresh cookies work on both
    // localhost and 127.0.0.1 (cross-host localhost↔127.0.0.1 breaks SameSite=Lax).
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_PROXY_TARGET ?? 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rolldownOptions: {
      output: {
        strictExecutionOrder: true,
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: 'tanstack-vendor',
              test: /node_modules[\\/]@tanstack[\\/]/,
              priority: 20,
            },
            {
              name: 'icons-vendor',
              test: /node_modules[\\/]lucide-react[\\/]/,
              priority: 19,
            },
            {
              name: 'ui-vendor',
              test: /node_modules[\\/]@base-ui[\\/]/,
              priority: 19,
            },
            {
              name: 'diary-feature',
              test: /src[\\/]features[\\/]diary[\\/]/,
              priority: 18,
            },
            {
              name: 'mentor-feature',
              test: /src[\\/]features[\\/]mentor[\\/]/,
              priority: 18,
            },
            {
              name: 'users-feature',
              test: /src[\\/]features[\\/]users[\\/]/,
              priority: 18,
            },
            {
              name: 'auth-feature',
              test: /src[\\/]features[\\/]auth[\\/]/,
              priority: 18,
            },
            {
              name: 'admin-feature',
              test: /src[\\/]features[\\/]admin[\\/]/,
              priority: 18,
            },
            {
              name: 'vendor',
              test: /node_modules/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
})

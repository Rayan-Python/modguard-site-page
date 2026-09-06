import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Pre-declare every bare import so the dependency optimizer bundles them in a
  // single pass on startup. Without this, `fflate` is only discovered when the
  // /security-tools route module is crawled, which triggers a re-optimize; on a
  // cold cache that re-optimize could restart repeatedly and never commit,
  // leaving orphaned node_modules/.vite/deps_temp_* directories and hanging
  // every in-flight request behind a promise that never resolves.
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      'fflate',
      '@supabase/supabase-js',
      '@vercel/analytics/react',
    ],
  },
})

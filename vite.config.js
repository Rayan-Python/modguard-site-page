import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // This project sits under ~/Desktop, which macOS syncs to iCloud Drive. The
  // sync daemon touches file metadata (xattrs, mtimes) on a cycle independent
  // of any real edit, and the watcher below was reading each touch as a change
  // to .env / vite.config.js — restarting the whole dev server, which cancelled
  // dependency optimization mid-flight before it could ever commit. Debouncing
  // on "has this file's size actually stopped changing" filters that noise out
  // without dulling real edits, which do settle immediately.
  server: {
    watch: {
      awaitWriteFinish: { stabilityThreshold: 400, pollInterval: 100 },
    },
  },
  // Pre-declare every bare import so the dependency optimizer bundles them in a
  // single pass on startup. Without this, `fflate` is only discovered when the
  // /security-tools route module is crawled, which triggers a re-optimize; on a
  // cold cache that re-optimize could restart repeatedly and never commit,
  // leaving orphaned node_modules/.vite/deps_temp_* directories and hanging
  // every in-flight request behind a promise that never resolves.
  optimizeDeps: {
    // The crawl phase that discovers *un*-declared deps is exactly what was
    // going unstable and restarting forever without committing (orphaned
    // deps_temp_* dirs, every request hanging behind it — see above). Every
    // dependency the app actually imports is already listed below, so the
    // crawl has nothing left to find; skipping it removes the loop entirely.
    noDiscovery: true,
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

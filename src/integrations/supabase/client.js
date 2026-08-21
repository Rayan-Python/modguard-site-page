import { createClient } from '@supabase/supabase-js'

// Reads config from Vite env vars. The anon key is safe to ship to the browser:
// access is governed by Row Level Security policies on the database (see
// supabase/migrations/). If the env vars are missing, `supabase` is null and
// callers surface a friendly "not configured yet" error instead of crashing.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null

export const isSupabaseConfigured = Boolean(supabase)

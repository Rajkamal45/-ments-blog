import { createClient } from "@supabase/supabase-js";

// Try env, but fall back to hardcoded values you pasted
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://butmzvzmteoxhvedrllr.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1dG16dnptdGVveGh2ZWRybGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0OTMxNDQsImV4cCI6MjA4MDA2OTE0NH0.OVhKH9egjzOB6hbshJO_syJArahBq2ZCG0zeMhySgtk";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
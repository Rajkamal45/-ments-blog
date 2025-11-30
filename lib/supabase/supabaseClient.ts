// lib/supabase/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

// Env se try karo, warna tumhari values use karo
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://butmzvzmteoxhvedrllr.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1dG16dnptdGVveGh2ZWRybGxyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0OTMxNDQsImV4cCI6MjA4MDA2OTE0NH0.OVhKH9egjzOB6hbshJO_syJArahBq2ZCG0zeMhySgtk";

// Yaha se supabase client banta hai
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

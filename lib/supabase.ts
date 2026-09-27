import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// .env.example documents these two names for local testing; when they are absent the
// hardcoded project values below stay in force, so a deployment with no .env is unchanged.
const defaultSupabaseUrl = 'https://ohgrbqjbawkudznuuqnq.supabase.co';
const defaultSupabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oZ3JicWpiYXdrdWR6bnV1cW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyODYxODcsImV4cCI6MjEwNTg2MjE4N30.AHK62B-pEhQCjn2Xja_b7zt27lyW5w7LNzfFneVq-kg';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultSupabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultSupabaseAnonKey;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

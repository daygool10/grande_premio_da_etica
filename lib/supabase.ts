import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ohgrbqjbawkudznuuqnq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oZ3JicWpiYXdrdWR6bnV1cW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyODYxODcsImV4cCI6MjEwNTg2MjE4N30.AHK62B-pEhQCjn2Xja_b7zt27lyW5w7LNzfFneVq-kg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

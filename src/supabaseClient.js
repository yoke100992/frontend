import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://reicgmtszrakypubrqcv.supabase.co'; // ganti dengan project Anda
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlaWNnbXRzenJha3lwdWJycWN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MTg2MTksImV4cCI6MjA2NDE5NDYxOX0.icJ4xH9LsTajpHZbeQSt5b6DqIQx7AW80m2YrJBEXFs'; // ini yang Anda salin

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

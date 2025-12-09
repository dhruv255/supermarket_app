import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kkburyaosonlmvrdnbew.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrYnVyeWFvc29ubG12cmRuYmV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyODcxNzksImV4cCI6MjA4MDg2MzE3OX0.pshvKxzrOMFyxY3vfN9TznJeGDaVo42tysJS_4Lqzbw';

export const supabase = createClient(supabaseUrl, supabaseKey);
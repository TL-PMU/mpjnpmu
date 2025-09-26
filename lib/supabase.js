import { createClient } from '@supabase/supabase-js'


// These values should be provided as environment variables in Vercel
export const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
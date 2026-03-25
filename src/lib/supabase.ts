import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hnrjvsjgurkphuxucffr.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhucmp2c2pndXJrcGh1eHVjZmZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTQwMDUsImV4cCI6MjA5MDAzMDAwNX0.k55QKvotEyIAwffvqbFG6dts9eeOyyXyaz1RzKvTmZI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

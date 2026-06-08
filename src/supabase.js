import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://uthdbcuasudymzgrgpld.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0aGRiY3Vhc3VkeW16Z3JncGxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4ODYwNDEsImV4cCI6MjA5NjQ2MjA0MX0.xAamlbjNt_IH10OY17M-MRdhK17auAZnz6evuwMJGbQ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

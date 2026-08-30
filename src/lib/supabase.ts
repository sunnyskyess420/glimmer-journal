import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://arrkdrhajlyworddkilz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFycmtkcmhhamx5d29yZGRraWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwNDA1NjIsImV4cCI6MjEwMzYxNjU2Mn0.TY726h3nkRMEQyNH_133_Gr4ZwdXQSAPpBaqz6W_Y_8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

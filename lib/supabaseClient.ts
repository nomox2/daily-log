import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xopdwdnne2lmqiaoutpp.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvcGR3ZG5uZXpsbXBpYW91dHBwIiwicm9zZSI6ImFub24iLCJpYXQiOjE3NjMxODE3OTYsImV4cCI6MjA3ODc1Nzc5Nn0.C1d7j2UhO6prmHSoRHAXRXbX1D0p8QWSipbv6RrZv7k";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

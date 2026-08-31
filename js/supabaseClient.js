// ============================================================================
// Supabase client (browser, anon key only — never put the service key here)
// Fill these two values in, or set them via a small inline <script> in HTML
// before this file loads (see index.html). They are safe to expose publicly:
// the anon key only works within your Row Level Security policies.
// ============================================================================
export const SUPABASE_URL = window.__ENV__?.SUPABASE_URL || "https://uzaxmvcqctbjmpyjwntn.supabase.co";
export const SUPABASE_ANON_KEY = window.__ENV__?.SUPABASE_ANON_KEY || "sb_publishable_w9nh0h5sIC0QQZ4-rp0Y6g_6SQdFeqv";

// Loaded from CDN in each HTML page:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

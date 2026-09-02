// ============================================================================
// Server-side Supabase client — uses the SERVICE ROLE key, which bypasses RLS.
// This file only ever runs inside Netlify Functions (server), never the
// browser. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify's
// environment variables (Site settings → Environment variables) — never
// commit the service role key to git.
// ============================================================================
const { createClient } = require("@supabase/supabase-js");

//function getSupabaseAdmin() {
//  const url = process.env.SUPABASE_URL;
  //const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  //if (!url || !key) {
    //throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
  //}
  //return createClient(url, key, { auth: { persistSession: false } });
//}

//module.exports = { getSupabaseAdmin };

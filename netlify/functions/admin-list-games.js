// ============================================================================
// POST /.netlify/functions/admin-list-games
// body: { password }
//
// Returns every game/mod including unpublished ones (the public site only
// ever sees published = true rows, so the admin panel needs its own route
// using the service role key to see everything).
// ============================================================================
const { getSupabaseAdmin } = require("../lib/supabaseAdmin");
const { checkAdminPassword } = require("../lib/adminAuth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  try {
    const { password } = JSON.parse(event.body || "{}");
    if (!checkAdminPassword(password)) {
      return { statusCode: 401, body: JSON.stringify({ error: "Wrong admin password" }) };
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { statusCode: 200, body: JSON.stringify({ games: data }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || "Failed to list games" }) };
  }
};

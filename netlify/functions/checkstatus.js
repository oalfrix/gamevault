// ============================================================================
// GET /.netlify/functions/checkstatus?orderId=...
//
// The frontend polls this every few seconds after sending an STK push.
// The real download_url is only ever returned here, and only once the order
// status is "paid" — it's never present in any data the browser fetches
// directly from Supabase.
// ============================================================================
const { getSupabaseAdmin } = require("../lib/supabaseAdmin");

exports.handler = async (event) => {
  try {
    const orderId = event.queryStringParameters?.orderId;
    if (!orderId) return { statusCode: 400, body: JSON.stringify({ error: "Missing orderId" }) };

    const supabase = getSupabaseAdmin();
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, status, game_id")
      .eq("id", orderId)
      .single();

    if (error || !order) return { statusCode: 404, body: JSON.stringify({ error: "Order not found" }) };

    if (order.status !== "paid") {
      return { statusCode: 200, body: JSON.stringify({ status: order.status }) };
    }

    const { data: game } = await supabase
      .from("games")
      .select("download_url")
      .eq("id", order.game_id)
      .single();

    return {
      statusCode: 200,
      body: JSON.stringify({ status: "paid", downloadUrl: game?.download_url || null }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: "Could not check status" }) };
  }
};

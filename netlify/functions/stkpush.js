// ============================================================================
// POST /.netlify/functions/stkpush
// body: { slug, phone }
//
// Price is looked up server-side from Supabase — the browser never sends an
// amount, so it can't be tampered with. Creates a "pending" order, fires the
// STK push, and returns the orderId for the frontend to poll.
// ============================================================================
const { getSupabaseAdmin } = require("../lib/supabaseAdmin");
const { stkPush } = require("../lib/mpesa");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { slug, phone } = JSON.parse(event.body || "{}");
    if (!slug || !phone) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing slug or phone" }) };
    }

    const supabase = getSupabaseAdmin();

    const { data: game, error: gameErr } = await supabase
      .from("games")
      .select("id, title, price, offer_price, is_free, published")
      .eq("slug", slug)
      .single();

    if (gameErr || !game || !game.published) {
      return { statusCode: 404, body: JSON.stringify({ error: "Game not found" }) };
    }
    if (game.is_free) {
      return { statusCode: 400, body: JSON.stringify({ error: "This title is free — use the free download flow instead." }) };
    }

    // Server-side authoritative price: offer price wins automatically if one is set.
    const amount =
      game.offer_price != null && game.offer_price < game.price ? game.offer_price : game.price;

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({ game_id: game.id, phone, amount, status: "pending" })
      .select()
      .single();

    if (orderErr) throw orderErr;

    let stkResult;
    try {
      stkResult = await stkPush({
        phone,
        amount,
        accountRef: game.title,
        description: "GameVault",
      });
    } catch (mpesaErr) {
      await supabase.from("orders").update({ status: "failed" }).eq("id", order.id);
      throw mpesaErr;
    }

    await supabase
      .from("orders")
      .update({ mpesa_checkout_id: stkResult.CheckoutRequestID })
      .eq("id", order.id);

    return {
      statusCode: 200,
      body: JSON.stringify({ orderId: order.id, checkoutRequestId: stkResult.CheckoutRequestID }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || "Payment could not be started" }) };
  }
};

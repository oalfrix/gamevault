// ============================================================================
// POST /.netlify/functions/stkcallback
// Configured as MPESA_CALLBACK_URL — Safaricom calls this automatically once
// the customer approves or cancels the STK push on their phone. This updates
// the matching order's status; the frontend picks that up via checkstatus.js.
// ============================================================================
const { getSupabaseAdmin } = require("../lib/supabaseAdmin");

exports.handler = async (event) => {
  try {
    const payload = JSON.parse(event.body || "{}");
    const stk = payload?.Body?.stkCallback;
    if (!stk) return { statusCode: 200, body: JSON.stringify({ received: true }) };

    const checkoutRequestId = stk.CheckoutRequestID;
    const resultCode = stk.ResultCode; // 0 = success
    const supabase = getSupabaseAdmin();

    if (resultCode === 0) {
      const items = stk.CallbackMetadata?.Item || [];
      const get = (name) => items.find((i) => i.Name === name)?.Value;
      const receipt = get("MpesaReceiptNumber");

      await supabase
        .from("orders")
        .update({ status: "paid", mpesa_receipt: receipt, updated_at: new Date().toISOString() })
        .eq("mpesa_checkout_id", checkoutRequestId);
    } else {
      // 1032 = cancelled by user, others = failed/timeout
      const status = resultCode === 1032 ? "cancelled" : "failed";
      await supabase
        .from("orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("mpesa_checkout_id", checkoutRequestId);
    }

    // Safaricom just needs a 200 response — no specific body required.
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error(err);
    // Still return 200 so Safaricom doesn't endlessly retry a broken payload.
    return { statusCode: 200, body: JSON.stringify({ received: true, error: true }) };
  }
};

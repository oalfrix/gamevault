// ============================================================================
// M-Pesa Daraja helper — OAuth token + STK Push initiation.
// Docs: https://developer.safaricom.co.ke/
//
// Required env vars (set in Netlify → Site settings → Environment variables):
//   MPESA_ENV               "sandbox" or "production"
//   MPESA_CONSUMER_KEY
//   MPESA_CONSUMER_SECRET
//   MPESA_SHORTCODE         your Paybill/Till number (Daraja test shortcode in sandbox)
//   MPESA_PASSKEY            Lipa Na M-Pesa Online passkey
//   MPESA_CALLBACK_URL       public HTTPS URL to netlify function stkcallback
//                            e.g. https://your-site.netlify.app/.netlify/functions/stkcallback
// ============================================================================

function baseUrl() {
  return process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

async function getAccessToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");

  const res = await fetch(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error("Failed to get M-Pesa access token");
  const json = await res.json();
  return json.access_token;
}

// Normalizes 07XXXXXXXX / +2547XXXXXXXX / 2547XXXXXXXX / 01XXXXXXXX into 2547XXXXXXXX
function normalizePhone(phone) {
  let p = phone.replace(/\s+/g, "").replace(/^\+/, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (!p.startsWith("254")) p = "254" + p;
  return p;
}

async function stkPush({ phone, amount, accountRef, description }) {
  const token = await getAccessToken();
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const ts = timestamp();
  const password = Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");
  const msisdn = normalizePhone(phone);

  const body = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: ts,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.max(1, Math.round(amount)), // Daraja requires a whole-number amount >= 1
    PartyA: msisdn,
    PartyB: shortcode,
    PhoneNumber: msisdn,
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: accountRef.slice(0, 12),
    TransactionDesc: description.slice(0, 13),
  };

  const res = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok || json.ResponseCode !== "0") {
    throw new Error(json.errorMessage || json.ResponseDescription || "STK push failed");
  }
  return json; // contains CheckoutRequestID, MerchantRequestID
}

module.exports = { stkPush, normalizePhone, getAccessToken };

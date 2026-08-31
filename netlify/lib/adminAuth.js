// ============================================================================
// Very simple shared-secret check for the admin functions. The password is
// set once as an env var (ADMIN_PASSWORD) and compared on every request —
// no sessions, no cookies, nothing to expire or misconfigure.
//
// This is fine for a single-admin personal store. If more than one person
// needs access, or you want proper accounts, swap this for real auth later
// (e.g. Supabase Auth) — this function is the only place that would need to change.
// ============================================================================
function checkAdminPassword(providedPassword) {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) throw new Error("ADMIN_PASSWORD is not set on the server");
  return typeof providedPassword === "string" && providedPassword === real;
}

module.exports = { checkAdminPassword };

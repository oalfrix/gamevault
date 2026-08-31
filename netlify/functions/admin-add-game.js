// ============================================================================
// POST /.netlify/functions/admin-add-game
// body: { password, slug, title, type, genres, baseGame, description,
//         requirements, price, offerPrice, isFree, downloadUrl, published,
//         imageBase64, imageFilename }
//
// Commits the cover image straight into the GitHub repo (so images live
// alongside your code, no separate storage service needed), then inserts
// the game row into Supabase using the service role key.
// ============================================================================
const { getSupabaseAdmin } = require("../lib/supabaseAdmin");
const { commitFile, cdnUrl } = require("../lib/github");
const { checkAdminPassword } = require("../lib/adminAuth");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    if (!checkAdminPassword(body.password)) {
      return { statusCode: 401, body: JSON.stringify({ error: "Wrong admin password" }) };
    }

    const {
      slug, title, type, genres, baseGame, description, requirements,
      price, offerPrice, isFree, downloadUrl, published,
      imageBase64, imageFilename,
    } = body;

    if (!slug || !title || !downloadUrl) {
      return { statusCode: 400, body: JSON.stringify({ error: "slug, title and downloadUrl are required" }) };
    }

    let coverUrl = body.coverUrl || null;

    // If an image was uploaded, commit it into the repo under assets/games/
    if (imageBase64 && imageFilename) {
      const ext = (imageFilename.split(".").pop() || "jpg").toLowerCase();
      const path = `assets/games/${slug}.${ext}`;
      await commitFile(path, imageBase64, `Add cover image for ${title}`);
      coverUrl = cdnUrl(path);
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("games")
      .upsert(
        {
          slug,
          title,
          type: type === "mod" ? "mod" : "game",
          base_game: baseGame || null,
          cover_url: coverUrl,
          genres: Array.isArray(genres) ? genres : (genres || "").split(",").map((g) => g.trim()).filter(Boolean),
          description: description || null,
          requirements: requirements || null,
          price: Number(price) || 0,
          offer_price: offerPrice ? Number(offerPrice) : null,
          is_free: !!isFree,
          download_url: downloadUrl,
          published: published !== false,
        },
        { onConflict: "slug" }
      )
      .select()
      .single();

    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ success: true, game: data }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || "Failed to add game" }) };
  }
};

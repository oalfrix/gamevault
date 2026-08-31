// ============================================================================
// Commits a file (e.g. a game cover image) straight into your GitHub repo
// using the Contents API, so images live in the repo instead of needing a
// separate storage/CDN service.
//
// Required env vars:
//   GITHUB_TOKEN   fine-grained PAT with "Contents: Read and write" on the repo
//   GITHUB_OWNER   e.g. "yourusername"
//   GITHUB_REPO    e.g. "gamevault"
//   GITHUB_BRANCH  e.g. "main"
// ============================================================================

function githubConfig() {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    throw new Error("Missing GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO env vars");
  }
  return { token: GITHUB_TOKEN, owner: GITHUB_OWNER, repo: GITHUB_REPO, branch: GITHUB_BRANCH || "main" };
}

async function ghFetch(url, opts = {}) {
  const { token } = githubConfig();
  const res = await fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  return res;
}

// Commits base64 file content to `path` in the repo. If a file already exists
// at that path, updates it (GitHub requires the current file's sha for that).
async function commitFile(path, base64Content, message) {
  const { owner, repo, branch } = githubConfig();
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;

  // Check whether the file already exists, to get its sha for an update.
  let sha;
  const existing = await ghFetch(`${url}?ref=${branch}`);
  if (existing.ok) {
    const json = await existing.json();
    sha = json.sha;
  }

  const res = await ghFetch(url, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: base64Content,
      branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub commit failed (${res.status})`);
  }

  return res.json();
}

// Public CDN URL for a committed file. jsDelivr fronts any public GitHub repo
// for free and caches globally — much faster than raw.githubusercontent.com.
// Note: jsDelivr's cache can take a few minutes to pick up a brand new file.
function cdnUrl(path) {
  const { owner, repo, branch } = githubConfig();
  return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${path}`;
}

async function deleteFile(path, message) {
  const { owner, repo, branch } = githubConfig();
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`;
  const existing = await ghFetch(`${url}?ref=${branch}`);
  if (!existing.ok) return; // already gone
  const { sha } = await existing.json();
  await ghFetch(url, { method: "DELETE", body: JSON.stringify({ message, sha, branch }) });
}

module.exports = { commitFile, cdnUrl, deleteFile };

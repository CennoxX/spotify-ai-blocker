const token = Deno.env.get("GITHUB_TOKEN");
const csvPath = Deno.cwd() +  "/SpotifyAiArtists.csv";
const shlabsApiKey = Deno.env.get("SUBMITHUB_API_KEY");

const repo = Deno.env.get("GITHUB_REPOSITORY").split("/").slice(0, 2).join("/");
const issue_number = parseInt(Deno.env.get("ISSUE_NUMBER") || "0");
const actor = Deno.env.get("SENDER_LOGIN");
const issue_title = Deno.env.get("ISSUE_TITLE");
const issue_body = Deno.env.get("ISSUE_BODY");

async function githubRequest(endpoint, method, body) {
  const res = await fetch(`https://api.github.com/repos/${repo}${endpoint}`, {
    method,
    headers: {
      "Authorization": `token ${token}`,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error (${res.status}): ${text}`);
  }
  return res.json();
}

async function addLabels(labels) {
  await githubRequest(`/issues/${issue_number}/labels`, "POST", { labels });
}

async function removeLabel(label) {
  await githubRequest(`/issues/${issue_number}/labels/${encodeURIComponent(label)}`, "DELETE");
}

async function updateIssue(data) {
  await githubRequest(`/issues/${issue_number}`, "PATCH", data);
}

async function getCollaboratorPermission(username) {
  const res = await githubRequest(`/collaborators/${username}/permission`, "GET");
  return res.permission;
}

async function detectTrack(trackId) {
  const response = await fetch("https://shlabs.music/api/v1/detect", {
    method: "POST",
    headers: { "X-API-Key": shlabsApiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ spotifyTrackId: trackId }),
  });
  const rawText = await response.text();
  console.log(rawText);
  let json;
  try {
    json = JSON.parse(rawText);
  } catch (e) {
    throw new Error("Invalid JSON response");
  }
  if (json.error) throw new Error(`${json.error} ${json.details || ""}`);
  return Math.round(json?.result?.probability_ai_generated || 0);
}

async function run() {
  if (issue_title.startsWith("[AI-Artist]")) {
    await addLabels(["ai-artist"]);
  }

  const name = issue_body.match(/Artist Name[\r\n\s]*(.+)/i)?.[1] ?? null;
  const id = issue_body.match(/\/artist\/([^\s?]+)/i)?.[1] ?? null;

  if (!id || !name) return console.log("Missing artist data");

  const csvContent = await Deno.readTextFile(csvPath);
  const [header, ...rows] = csvContent.trim().replace(/\r\n/g, "\n").split("\n");

  if (rows.some(l => l.includes(id))) {
    try { await removeLabel("accepted"); } catch (_) {}
    await addLabels(["duplicate"]);
    await updateIssue({ state: "closed" });
    return console.log("Duplicate artist");
  }

  let hasWriteAccess = false;
  try {
    const perm = await getCollaboratorPermission(actor);
    hasWriteAccess = ["write", "maintain", "admin"].includes(perm);
  } catch (_) {}

  async function acceptArtist() {
    rows.push(`${name},${id}`);
    await Deno.writeTextFile(csvPath, [header, ...rows].join("\n"));
    await addLabels(["accepted"]);
    console.log("Artist accepted");

    const output = Deno.env.get("GITHUB_OUTPUT");
    if (output) {
      await Deno.writeTextFile(output, `artist_name=${name}\nartist_id=${id}\n`, { append: true });
    }
  }

  if (hasWriteAccess) {
    await acceptArtist();
    return;
  }

  const trackId = issue_body.match(/\/track\/([^\s?]+)/i)?.[1] ?? null;
  if (!trackId) return console.log("No track URL found");

  await addLabels(["checked"]);

  let probability = 0;
  try { probability = await detectTrack(trackId); } catch (err) {
    try { await removeLabel("checked"); } catch (_) {};
    return console.log("Failed to detect track:", err.message);
  }

  if (probability > 50) await acceptArtist();
  console.log(`AI probability ${probability}%`);
}

run().catch(err => {
  console.error(err);
  Deno.exit(1);
});

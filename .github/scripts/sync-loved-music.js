// Daily sync with the loved.music AI artist list (https://github.com/gounetmusic/loved-music-ai-artists):
// adds the artists it lists that are not in SpotifyAiArtists.csv yet, matched by Spotify artist id.
// Only adds, never removes or renames an existing entry.
const sourceUrl = "https://raw.githubusercontent.com/gounetmusic/loved-music-ai-artists/main/ai-artists.csv";
const csvPath = Deno.cwd() + "/SpotifyAiArtists.csv";

// Safety limits against a broken or hijacked source: the run fails (and adds nothing) instead.
const minSourceRows = 50;
const maxNewPerRun = 600;

const idPattern = /^[0-9A-Za-z]{22}$/;

// One CSV line into its fields (quoted fields may hold commas and doubled quotes).
function parseCsvLine(line) {
  const fields = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { fields.push(field); field = ""; }
    else field += c;
  }
  fields.push(field);
  return fields;
}

// A name as a CSV field: quoted when it holds a comma or a quote, like the existing entries.
function csvField(value) {
  return /[",]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

async function fetchSource() {
  const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`loved.music list answered ${res.status}`);
  const [header, ...lines] = (await res.text()).trim().replace(/\r\n/g, "\n").split("\n");
  if (header.trim() !== "artist,id") throw new Error(`Unexpected header in the loved.music list: "${header}"`);

  const artists = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const fields = parseCsvLine(line);
    const id = fields.pop()?.trim();
    const name = fields.join(",").replace(/\s+/g, " ").trim();
    if (!name || !idPattern.test(id)) {
      console.log(`Skipped malformed line: ${line}`);
      continue;
    }
    artists.push({ name, id });
  }
  if (artists.length < minSourceRows) throw new Error(`Only ${artists.length} artists in the loved.music list (expected at least ${minSourceRows})`);
  return artists;
}

async function run() {
  const source = await fetchSource();

  const csvContent = await Deno.readTextFile(csvPath);
  const [header, ...rows] = csvContent.trim().replace(/\r\n/g, "\n").split("\n");
  const knownIds = new Set(rows.map(l => l.slice(l.lastIndexOf(",") + 1).trim()));

  const added = [];
  for (const { name, id } of source) {
    if (knownIds.has(id)) continue;
    knownIds.add(id);
    added.push(`${csvField(name)},${id}`);
  }

  if (added.length > maxNewPerRun) throw new Error(`${added.length} new artists in one run (limit ${maxNewPerRun}): check the loved.music list before syncing`);

  console.log(`${source.length} artists in the loved.music list, ${added.length} new`);
  if (added.length === 0) return;
  for (const line of added) console.log(`Added: ${line}`);

  await Deno.writeTextFile(csvPath, [header, ...rows, ...added].join("\n"));

  const output = Deno.env.get("GITHUB_OUTPUT");
  if (output) await Deno.writeTextFile(output, `added=${added.length}\n`, { append: true });
}

run().catch(err => {
  console.error(err);
  Deno.exit(1);
});

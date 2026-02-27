import { resolve } from "https://deno.land/std@0.224.0/path/mod.ts";
import { getOctokit, context } from "npm:@actions/github@6";

const token = Deno.env.get("GITHUB_TOKEN");
const octokit = getOctokit(token);
const csvPath = resolve(Deno.cwd(), "SpotifyAiArtists.csv");

async function run() {
  const { owner, repo } = context.repo;
  const payload = context.payload;
  const action = payload.action;
  const issue = payload.issue;
  const label = payload.label?.name?.toLowerCase();
  const actor = payload.sender?.login;
  const perm = await octokit.rest.repos.getCollaboratorPermissionLevel({ owner, repo, username: actor });
  const hasWriteAccess = ["write", "maintain", "admin"].includes(perm.data.permission);
  if (!hasWriteAccess)
    return console.log(`Unauthorized user: ${actor}`);

  const command = action === "opened" ? "accepted" : label;
  const id = issue.body?.match(/\/artist\/([^\s?]+)/i)?.[1]?.trim();
  const name = issue.body?.match(/Artist Name[\r\n\s]*(.+)/i)?.[1]?.trim();
  if (!id || !name)
    return console.log("Missing artist data");

  const issue_number = issue.number;
  if (command === "accepted") {
    const [header, ...rows] = (await Deno.readTextFile(csvPath)).trim().replace(/\r\n/g, "\n").split("\n");
    if (rows.some(l => l.includes(id))) {
      try {
        await octokit.rest.issues.removeLabel({ owner, repo, issue_number, name: "accepted" });
      } catch (_) { /* label not present */ }
      await octokit.rest.issues.addLabels({ owner, repo, issue_number, labels: ["duplicate"] });
      await octokit.rest.issues.update({ owner, repo, issue_number, state: "closed" });
      return console.log("Duplicate artist");
    }

    rows.push(`${name},${id}`);
    await Deno.writeTextFile(csvPath, [header, ...rows].join("\n"));
    console.log("Artist accepted");
    
    if (action === "opened")
      await octokit.rest.issues.addLabels({ owner, repo, issue_number, labels: ["accepted"] });

    const output = Deno.env.get("GITHUB_OUTPUT");
    if (output) {
      await Deno.writeTextFile(output, `artist_name=${name}\n`, { append: true });
      await Deno.writeTextFile(output, `artist_id=${id}\n`, { append: true });
    }
  }

  if (command === "rejected") {
    await octokit.rest.issues.update({ owner, repo, issue_number, state: "closed" });
    console.log(`Artist rejected: ${name}`);
  }
}

run().catch(err => {
  console.error(err);
  Deno.exit(1);
});
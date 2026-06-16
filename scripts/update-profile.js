const fs = require("node:fs");
const path = require("node:path");

const START = "<!-- AUTO-PROJECTS:START -->";
const END = "<!-- AUTO-PROJECTS:END -->";

function isUsefulPublicRepo(repo) {
  return (
    repo &&
    repo.private === false &&
    repo.fork === false &&
    repo.archived === false &&
    repo.name !== "delevski" &&
    typeof repo.description === "string" &&
    repo.description.trim().length > 0
  );
}

function formatDate(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function buildProjectsSection(repos, options = {}) {
  const limit = options.limit || 6;
  const now = options.now || new Date();
  const generatedAt = now.toISOString().slice(0, 10);

  const rows = repos
    .filter(isUsefulPublicRepo)
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
    .slice(0, limit)
    .map((repo) => {
      const language = repo.language || "Mixed";
      const stars = repo.stargazers_count || 0;
      return `| [${repo.name}](${repo.html_url}) | ${language} | ${stars} | Updated ${formatDate(repo.pushed_at)} |`;
    });

  if (rows.length === 0) {
    return [
      "_No public project updates found yet._",
      "",
      `<sub>Last refreshed: ${generatedAt}</sub>`,
    ].join("\n");
  }

  return [
    "| Project | Language | Stars | Activity |",
    "|---|---:|---:|---|",
    ...rows,
    "",
    `<sub>Auto-updated from public GitHub repositories. Last refreshed: ${generatedAt}</sub>`,
  ].join("\n");
}

function replaceGeneratedSection(readme, section) {
  const start = readme.indexOf(START);
  const end = readme.indexOf(END);

  if (start === -1 || end === -1 || end < start) {
    throw new Error(`README must contain ${START} and ${END} markers.`);
  }

  return [
    readme.slice(0, start + START.length),
    "\n",
    section,
    "\n",
    readme.slice(end),
  ].join("");
}

async function fetchPublicRepos(owner) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "delevski-profile-updater",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const repos = [];
  for (let page = 1; page <= 10; page += 1) {
    const url = `https://api.github.com/users/${owner}/repos?type=owner&sort=pushed&direction=desc&per_page=100&page=${page}`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
    }

    const batch = await response.json();
    repos.push(...batch);

    if (batch.length < 100) {
      break;
    }
  }

  return repos;
}

async function main() {
  const owner = process.env.PROFILE_OWNER || process.env.GITHUB_REPOSITORY_OWNER || "delevski";
  const readmePath = path.join(process.cwd(), "README.md");
  const readme = fs.readFileSync(readmePath, "utf8");
  const repos = await fetchPublicRepos(owner);
  const section = buildProjectsSection(repos);
  const updated = replaceGeneratedSection(readme, section);

  fs.writeFileSync(readmePath, updated);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  buildProjectsSection,
  replaceGeneratedSection,
};

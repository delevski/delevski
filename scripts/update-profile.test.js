const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildProjectsSection,
  replaceGeneratedSection,
} = require("./update-profile");

test("buildProjectsSection renders only useful public source repos without raw descriptions", () => {
  const repos = [
    {
      name: "new-ai-tool",
      html_url: "https://github.com/delevski/new-ai-tool",
      description: "AI workflow assistant",
      language: "TypeScript",
      stargazers_count: 3,
      fork: false,
      archived: false,
      private: false,
      pushed_at: "2026-06-15T10:00:00Z",
    },
    {
      name: "forked-lib",
      html_url: "https://github.com/delevski/forked-lib",
      description: "Fork",
      language: "JavaScript",
      stargazers_count: 50,
      fork: true,
      archived: false,
      private: false,
      pushed_at: "2026-06-16T10:00:00Z",
    },
    {
      name: "empty-description",
      html_url: "https://github.com/delevski/empty-description",
      description: null,
      language: "Python",
      stargazers_count: 1,
      fork: false,
      archived: false,
      private: false,
      pushed_at: "2026-06-14T10:00:00Z",
    },
  ];

  const section = buildProjectsSection(repos, {
    now: new Date("2026-06-16T12:00:00Z"),
    limit: 5,
  });

  assert.match(section, /new-ai-tool/);
  assert.match(section, /TypeScript/);
  assert.match(section, /Updated 2026-06-15/);
  assert.doesNotMatch(section, /AI workflow assistant/);
  assert.doesNotMatch(section, /forked-lib/);
  assert.doesNotMatch(section, /empty-description/);
});

test("replaceGeneratedSection updates only the marked README block", () => {
  const readme = [
    "# Profile",
    "",
    "Keep this text.",
    "",
    "<!-- AUTO-PROJECTS:START -->",
    "old content",
    "<!-- AUTO-PROJECTS:END -->",
    "",
    "Keep this too.",
  ].join("\n");

  const updated = replaceGeneratedSection(readme, "new content");

  assert.equal(
    updated,
    [
      "# Profile",
      "",
      "Keep this text.",
      "",
      "<!-- AUTO-PROJECTS:START -->",
      "new content",
      "<!-- AUTO-PROJECTS:END -->",
      "",
      "Keep this too.",
    ].join("\n"),
  );
});

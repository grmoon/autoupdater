const github = require("@actions/github");

module.exports = async function autoupdater(_github, { GITHUB_TOKEN } = {}) {
  if (!GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN must be set");
  }

  const { repo, ref: base } = github.context;
  console.log("REF: ", base);
  const octokit = github.getOctokit(GITHUB_TOKEN);
  const response = await octokit.pulls.list({ ...repo, base, state: "open" });
  const pullRequests = response.data;

  const promises = pullRequests.map(async (pullRequest) => {
    if (!pullRequest.labels.includes("autoupdate")) {
      // continue
      return false;
    }

    octokit.pulls.updateBranch({
      ...repo,
      pull_number: pullRequest.number,
    });
  });

  await Promise.all(promises);
};

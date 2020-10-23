const github = require("@actions/github");

module.exports = async function autoupdater(_github, { GITHUB_TOKEN } = {}) {
  if (!GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN must be set");
  }

  const repo = github.context.repo;
  const octokit = github.getOctokit(GITHUB_TOKEN);
  const response = await octokit.pulls.list({ ...repo, state: "open" });
  const pullRequests = response.data;

  const promises = pullRequests.map(async (pullRequest) => {
    if (!label.includes("autoupdate")) {
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

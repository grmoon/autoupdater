const github = require("@actions/github");

module.exports = async function autoupdater(_github, { GITHUB_TOKEN } = {}) {
  if (!GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN must be set");
  }

  const repo = github.context.repo;
  const octokit = github.getOctokit(GITHUB_TOKEN);
  const pullRequests = await octokit.pulls.list({ repo: repo.repo });

  console.log(pullRequests.url);

  pullRequests.data.forEach((pullRequest) => {
    console.log(pullRequest);
    console.log("labels", pullRequest.labels);
    console.log("base", pullRequest.base);
  });
};

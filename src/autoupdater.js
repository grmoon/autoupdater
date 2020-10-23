const github = require("@actions/github");

module.exports = async function autoupdater(_github, { GITHUB_TOKEN } = {}) {
  if (!GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN must be set");
  }

  console.log(GITHUB_TOKEN);
  console.log(1);
  const repo = github.context.repo;
  console.log(2);
  const octokit = github.getOctokit(GITHUB_TOKEN);
  console.log(3);
  console.log(repo.repo);
  console.log(repo);
  const pullRequests = await octokit.pulls.list({ ...repo, state: "open" });
  console.log(4);

  pullRequests.data.forEach((pullRequest) => {
    console.log(5);
    console.log(pullRequest);
    console.log(6);
    console.log("labels", pullRequest.labels);
    console.log(7);
    console.log("base", pullRequest.base);
    console.log(8);
  });
};

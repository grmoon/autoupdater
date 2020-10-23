const github = require("@actions/github");

module.exports = async function autoupdater(_github, { GITHUB_TOKEN } = {}) {
  if (!GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN must be set");
  }

  const { repo, ref: base } = github.context;
  const octokit = github.getOctokit(GITHUB_TOKEN);
  const response = await octokit.pulls.list({ ...repo, base, state: "open" });
  const pullRequests = response.data;

  const promises = pullRequests
    .map((pullRequest) => {
      console.log(pullRequest);
      console.log(pullRequest.labels);
      if (!pullRequest.labels.includes("autoupdate")) {
        // continue
        return false;
      }

      // octokit.pulls.updateBranch({
      //   ...repo,
      //   pull_number: pullRequest.number,
      // });
    })
    .filter((promise) => promise);

  // const output = await Promise.all(promises);

  // console.log(output);
};

module.exports = async function autoupdater(github, { GITHUB_TOKEN } = {}) {
  if (!GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN must be set");
  }

  const { repo, ref: base } = github.context;
  const octokit = github.getOctokit(GITHUB_TOKEN);
  const response = await octokit.pulls.list({ ...repo, base, state: "open" });
  const pullRequests = response.data;

  const promises = pullRequests
    .map((pullRequest) => {
      const shouldUpdate = pullRequest.labels.find(
        (label) => label.name === "autoupdate"
      );

      if (!shouldUpdate) {
        return false;
      }

      return octokit.pulls.updateBranch({
        ...repo,
        pull_number: pullRequest.number,
      });
    })
    .filter((promise) => promise);

  await Promise.all(promises);
};

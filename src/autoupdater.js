async function performUpdate({ pullRequest, repo, octokit }) {
  const commitStatusParams = {
    ...repo,
    sha: pullRequest.head.sha,
    context: `autoupdate from ${pullRequest.base.ref}`,
  };

  await octokit.repos.createCommitStatus({
    ...commitStatusParams,
    state: "pending",
    description: "Updating",
  });

  let error;

  try {
    await octokit.pulls.updateBranch({
      ...repo,
      pull_number: pullRequest.number,
    });
  } catch (e) {
    error = e;
  }

  await octokit.repos.createCommitStatus({
    ...commitStatusParams,
    state: error ? "error" : "success",
    description: error ? error.message : "Successfully updated",
  });
}

module.exports = async function autoupdater(github, { GITHUB_TOKEN } = {}) {
  if (!GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN must be set");
  }

  const octokit = github.getOctokit(GITHUB_TOKEN);
  const { repo, ref: base } = github.context;

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

      return performUpdate({ pullRequest, repo, octokit });
    })
    .filter((promise) => promise);

  await Promise.all(promises);
};

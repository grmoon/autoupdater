async function handlePushEvent({ repo, base, octokit }) {
  const response = await octokit.pulls.list({ ...repo, base, state: "open" });
  const pullRequests = response.data;

  const promises = pullRequests
    .map(async (pullRequest) => {
      const shouldUpdate = pullRequest.labels.find(
        (label) => label.name === "autoupdate"
      );

      if (!shouldUpdate) {
        return false;
      }

      const checkParams = {
        ...repo,
        head_sha: pullRequest.head.ref,
        name: `autoupdate from ${pullRequest.base.ref}`,
      };

      await octokit.checks.create({
        ...checkParams,
        status: "in_progress",
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

      const completionParams = {
        status: "completed",
        conclusion: error ? "failure" : "success",
        output: error
          ? {
              title: "Error",
              summary: error.message,
            }
          : undefined,
      };

      await octokit.checks.create({
        ...checkParams,
        ...completionParams,
      });
    })
    .filter((promise) => promise);

  await Promise.all(promises);
}

module.exports = async function autoupdater(github, { GITHUB_TOKEN } = {}) {
  if (!GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN must be set");
  }

  const octokit = github.getOctokit(GITHUB_TOKEN);
  const { repo, ref: base, eventName } = github.context;

  switch (eventName) {
    case "push":
      await handlePushEvent({ repo, base, octokit });
      break;
    default:
      throw new Error(`Unhandled event: ${eventName}`);
  }
};

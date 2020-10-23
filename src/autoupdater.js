async function handlePushEvent({ repo, base, octokit }) {
  console.log(1);
  const response = await octokit.pulls.list({ ...repo, base, state: "open" });
  console.log(2);
  const pullRequests = response.data;
  console.log(3);

  const promises = pullRequests
    .map(async (pullRequest) => {
      console.log(4);
      const shouldUpdate = pullRequest.labels.find(
        (label) => label.name === "autoupdate"
      );

      console.log(5);
      if (!shouldUpdate) {
        return false;
      }

      const checkParams = {
        ...repo,
        sha: pullRequest.head.sha,
        context: `autoupdate from ${pullRequest.base.ref}`,
      };

      console.log(6);
      await octokit.repos.createCommitStatus({
        ...checkParams,
        state: "pending",
        description: "Updating",
      });
      console.log(7);

      let error;

      try {
        console.log(8);
        await octokit.pulls.updateBranch({
          ...repo,
          pull_number: pullRequest.number,
        });
      } catch (e) {
        console.log(9);
        error = e;
      }

      console.log(10);
      await octokit.repos.createCommitStatus({
        ...checkParams,
        state: error ? "error" : "success",
        description: error ? error.message : "Successfully updated",
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

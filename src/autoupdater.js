const core = require("@actions/core");

async function performUpdate({ pullRequest, repo, octokit }) {
  core.startGroup(`Updating PR: Updating ${pullRequest.head.ref}`);

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

  core.endGroup();
}

async function fetchPullRequests(octokit, repo, base) {
  core.startGroup("Fetching PRs");

  const response = await octokit.pulls.list({ ...repo, base, state: "open" });
  const prs = response.data;

  if (prs) {
    core.info(`No PRs have ${base} as their base branch.`);
  } else {
    core.info(
      `The following PRs have ${base} as their base branch: ${prs.join(", ")}`
    );
  }

  core.endGroup();

  return prs;
}

function filterPullRequests(pullRequests, base) {
  core.startGroup("Filtering PRs");

  const prsToUpdate = pullRequests.filter((pr) =>
    pr.labels.find((label) => label.name === "autoupdate")
  );

  if (prsToUpdate.length == 0) {
    core.info(
      `No PRs with ${base} as their base branch have the "autoupdate" label.`
    );
  } else {
    core.info(`The following PRs will be updated: ${prsToUpdate.join(", ")}`);
  }

  core.endGroup();

  return prsToUpdate;
}

async function updatePullRequests(prsToUpdate, repo, octokit) {
  const promises = prsToUpdate.map((pr) =>
    performUpdate({ pullRequest: pr, repo, octokit })
  );

  core.startGroup("Updating PRs");
  await Promise.all(promises);
  core.endGroup();
}

module.exports = async function autoupdater(github, { GITHUB_TOKEN } = {}) {
  if (!GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN must be set");
  }

  const octokit = github.getOctokit(GITHUB_TOKEN);
  const { repo, ref: base } = github.context;

  const pullRequests = await fetchPullRequests(octokit, repo, base);
  const prsToUpdate = filterPullRequests(pullRequests, base);

  return updatePullRequests(prsToUpdate, repo, octokit);
};

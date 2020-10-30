const core = require("@actions/core");

async function getStatusChecks(pr, repo, octokit) {
  core.info(`Getting require status checks for ${pr.head.ref}`);

  const response = await octokit.repos.getStatusChecksProtection({
    ...repo,
    branch: pr.head.ref,
  });
  const statusChecks = response.data;

  core.info(
    `Required Status checks for ${pr.head.ref}: ${statusChecks.contexts.join(
      ", "
    )}`
  );

  return statusChecks;
}

async function waitForStatusChecks(pr, repo, octokit) {
  const requiredChecks = getStatusChecks(pr, repo, octokit);

  let completed;
  let requiredCheckRuns;
  let count = 0;

  do {
    if (count > 0) {
      core.info("Waiting for checks to pass...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    const response = await octokit.checks.listForRef({
      ...repo,
      ref: pr.head.ref,
    });

    const checks = response.data;

    requiredCheckRuns = checks.check_runs.filter((run) =>
      requiredChecks.contexts.includes(run.name)
    );

    completed = requiredCheckRuns.every(
      (run) => run.status == "completed" && run.conclusion == "success"
    );

    count++;
  } while (!completed);
}

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

  const timeout = setTimeout(() => {
    throw Error("Timed out waiting for status checks.");
  }, 30000);

  await waitForStatusChecks(pullRequest, repo, octokit);

  clearTimeout(timeout);

  let error;

  try {
    await octokit.pulls.updateBranch({
      ...repo,
      pull_number: pullRequest.number,
    });
  } catch (e) {
    error = e;
    core.error(e.message);
  }

  await octokit.repos.createCommitStatus({
    ...commitStatusParams,
    state: error ? "error" : "success",
    description: error
      ? "There was an error. Check the action output for more information."
      : "Successfully updated",
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
      `The following PRs have ${base} as their base branch: ${prs
        .map((pr) => pr.number)
        .join(", ")}`
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
    core.info(
      `The following PRs will be updated: ${prsToUpdate
        .map((pr) => pr.number)
        .join(", ")}`
    );
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

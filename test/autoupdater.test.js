const autoupdater = require("../src/autoupdater");

async function expectError(callback, expected) {
  let error;

  try {
    await callback();
  } catch (e) {
    error = e;
  }

  expect(error).toEqual(expected);
}

function createOctokitMock({ prs = [], repos, pulls }) {
  const reposMock = {
    createCommitStatus: jest.fn(),
    ...repos,
  };

  const pullsMock = {
    updateBranch: jest.fn(),
    list: jest
      .fn()
      .mockReturnValue(new Promise((resolve) => resolve({ data: prs }))),
    ...pulls,
  };

  return {
    repos: reposMock,
    pulls: pullsMock,
  };
}

function createGithubMock({ octokit = {}, context = {} } = {}) {
  const contextMock = {
    repo: jest.mock(),
    ...context,
  };

  const octokitMock = {
    pulls: {
      updateBranch: jest.fn(),
      list: jest
        .fn()
        .mockReturnValue(new Promise((resolve) => resolve({ data: [] }))),
    },
    ...octokit,
  };

  return {
    context: contextMock,
    getOctokit: jest.fn().mockReturnValue(octokitMock),
  };
}

describe("autoupdater", () => {
  it("should throw an error if the GITHUB_TOKEN is falsey", () => {
    const githubMock = createGithubMock();

    return expectError(
      () => autoupdater(githubMock),
      new Error("GITHUB_TOKEN must be set")
    );
  });

  it("should make the octokit call to update the correct prs", async () => {
    const repo = { repo: "repo", owner: "owner" };
    const context = { repo, ref: "ref", eventName: "push" };
    const prs = [
      {
        labels: [{ name: "autoupdate" }],
        head: { ref: "head-ref0", sha: "head-sha0" },
        base: { ref: "base-ref0" },
        number: 0,
      },
      {
        labels: [],
        head: { ref: "head-ref1", sha: "head-sha1" },
        base: { ref: "base-ref1" },
        number: 1,
      },
      {
        labels: [{ name: "autoupdate" }, { name: "other" }],
        head: { ref: "head-ref2", sha: "head-sha2" },
        base: { ref: "base-ref2" },
        number: 2,
      },
      {
        labels: [{ name: "other" }],
        head: { ref: "head-ref3", sha: "head-sha3" },
        base: { ref: "base-ref3" },
        number: 3,
      },
    ];

    const octokitMock = createOctokitMock({ prs });
    const githubMock = createGithubMock({ context, octokit: octokitMock });

    await autoupdater(githubMock, { GITHUB_TOKEN: "GITHUB_TOKEN" });

    expect(octokitMock.pulls.list).toHaveBeenCalledTimes(1);
    expect(octokitMock.pulls.list).toHaveBeenCalledWith({
      ...repo,
      base: "ref",
      state: "open",
    });

    expect(octokitMock.pulls.updateBranch).toHaveBeenCalledTimes(2);
    expect(octokitMock.pulls.updateBranch).toHaveBeenCalledWith({
      ...repo,
      pull_number: 0,
    });
    expect(octokitMock.pulls.updateBranch).toHaveBeenCalledWith({
      ...repo,
      pull_number: 2,
    });
  });

  it("should update commit statuses to reflect errors updating", async () => {
    const repo = { repo: "repo", owner: "owner" };
    const context = { repo, ref: "ref", eventName: "push" };
    const prs = [
      {
        labels: [{ name: "autoupdate" }],
        head: { ref: "head-ref0", sha: "head-sha0" },
        base: { ref: "base-ref" },
        number: 0,
      },
      {
        labels: [],
        head: { ref: "head-ref1", sha: "head-sha1" },
        base: { ref: "base-ref" },
        number: 1,
      },
      {
        labels: [{ name: "autoupdate" }, { name: "other" }],
        head: { ref: "head-ref2", sha: "head-sha2" },
        base: { ref: "base-ref" },
        number: 2,
      },
      {
        labels: [{ name: "other" }],
        head: { ref: "head-ref3", sha: "head-sha3" },
        base: { ref: "base-ref" },
        number: 3,
      },
    ];

    const pullsMock = {
      updateBranch: jest
        .fn()
        .mockRejectedValueOnce(new Error("My Error"))
        .mockResolvedValue(),
    };
    const octokitMock = createOctokitMock({ prs, pulls: pullsMock });
    const githubMock = createGithubMock({ context, octokit: octokitMock });

    await autoupdater(githubMock, { GITHUB_TOKEN: "GITHUB_TOKEN" });

    expect(octokitMock.repos.createCommitStatus).toHaveBeenCalledTimes(4);

    // head-sha0 fails
    expect(octokitMock.repos.createCommitStatus).toHaveBeenCalledWith({
      ...repo,
      context: "autoupdate from base-ref",
      description: "Updating",
      sha: "head-sha0",
      state: "pending",
    });

    expect(octokitMock.repos.createCommitStatus).toHaveBeenCalledWith({
      ...repo,
      context: "autoupdate from base-ref",
      description: "My Error",
      sha: "head-sha0",
      state: "error",
    });

    // head-sha2 success
    expect(octokitMock.repos.createCommitStatus).toHaveBeenCalledWith({
      ...repo,
      context: "autoupdate from base-ref",
      description: "Updating",
      sha: "head-sha2",
      state: "pending",
    });

    expect(octokitMock.repos.createCommitStatus).toHaveBeenCalledWith({
      ...repo,
      context: "autoupdate from base-ref",
      description: "Successfully updated",
      sha: "head-sha2",
      state: "success",
    });

    expect(octokitMock.pulls.list).toHaveBeenCalledTimes(1);
    expect(octokitMock.pulls.list).toHaveBeenCalledWith({
      ...repo,
      base: "ref",
      state: "open",
    });

    expect(octokitMock.pulls.updateBranch).toHaveBeenCalledTimes(2);
    expect(octokitMock.pulls.updateBranch).toHaveBeenCalledWith({
      ...repo,
      pull_number: 0,
    });
    expect(octokitMock.pulls.updateBranch).toHaveBeenCalledWith({
      ...repo,
      pull_number: 2,
    });
  });
});

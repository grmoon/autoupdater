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

function createOctokitMock({ prs = [] }) {
  return {
    repos: {
      createCommitStatus: jest.fn(),
    },
    pulls: {
      updateBranch: jest.fn(),
      list: jest
        .fn()
        .mockReturnValue(new Promise((resolve) => resolve({ data: prs }))),
    },
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
        head: { ref: "head-ref0" },
        base: { ref: "base-ref0" },
        number: 0,
      },
      {
        labels: [],
        head: { ref: "head-ref1" },
        base: { ref: "base-ref1" },
        number: 1,
      },
      {
        labels: [{ name: "autoupdate" }, { name: "other" }],
        head: { ref: "head-ref2" },
        base: { ref: "base-ref2" },
        number: 2,
      },
      {
        labels: [{ name: "other" }],
        head: { ref: "head-ref3" },
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

  it("should throw an error if it doesn't recognize an event", async () => {
    const context = { eventName: "abc" };
    const githubMock = createGithubMock({ context });

    return expectError(
      () => autoupdater(githubMock, { GITHUB_TOKEN: "GITHUB_TOKEN" }),
      new Error("Unhandled event: abc")
    );
  });
});

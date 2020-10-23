const autoupdater = require("../src/autoupdater");

function createOctokitMock({ prs = [] }) {
  return {
    pulls: {
      updateBranch: jest.fn(),
      list: jest
        .fn()
        .mockReturnValue(new Promise((resolve) => resolve({ data: prs }))),
    },
  };
}

function createGithubMock({ octokit, context } = {}) {
  const contextMock = context || {
    repo: jest.mock(),
  };

  const octokitMock = octokit || {
    pulls: {
      updateBranch: jest.fn(),
      list: jest
        .fn()
        .mockReturnValue(new Promise((resolve) => resolve({ data: [] }))),
    },
  };

  return {
    context: contextMock,
    getOctokit: jest.fn().mockReturnValue(octokitMock),
  };
}

describe("autoupdater", () => {
  it("should throw an error if the GITHUB_TOKEN is falsey", async () => {
    const githubMock = createGithubMock();
    let error;

    try {
      await autoupdater(githubMock);
    } catch (e) {
      error = e;
    }

    expect(error).toEqual(new Error("GITHUB_TOKEN must be set"));
  });

  it("should make the octokit call to update the correct prs", async () => {
    const repo = { repo: "repo", owner: "owner" };
    const context = { repo, ref: "ref" };
    const prs = [
      {
        labels: [{ name: "autoupdate" }],
        number: 0,
      },
      {
        labels: [],
        number: 1,
      },
      {
        labels: [{ name: "autoupdate" }, { name: "other" }],
        number: 2,
      },
      {
        labels: [{ name: "other" }],
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
});

const autoupdater = require("../src/autoupdater");
const github = {
  context: {
    repo: jest.mock(),
  },
  getOctokit: jest.fn().mockReturnValue({
    pulls: {
      updateBranch: jest.fn(),
      list: jest.fn().mockReturnValue(
        new Promise((resolve, reject) =>
          resolve({
            data: [
              {
                labels: [jest.mock()],
              },
            ],
          })
        )
      ),
    },
  }),
};

describe("autoupdater", () => {
  it("should throw an error if the GITHUB_TOKEN is falsey", async () => {
    let error;

    try {
      await autoupdater(github);
    } catch (e) {
      error = e;
    }

    expect(error).toEqual(new Error("GITHUB_TOKEN must be set"));
  });

  it("should work", async () => {
    await autoupdater(github, { GITHUB_TOKEN: "GITHUB_TOKEN" });
  });
});

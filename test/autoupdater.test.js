const autoupdater = require("../src/autoupdater");

describe("autoupdater", () => {
  it("should throw an error if the GITHUB_TOKEN is falsey", () => {
    expect(() => {
      autoupdater();
    }).toThrow("GITHUB_TOKEN must be set");
  });
});

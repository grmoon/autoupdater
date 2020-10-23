const autoupdater = require("./autoupdater");
const core = require("@actions/core");
const github = require("@actions/github");

(async () => {
  try {
    await autoupdater(github, {
      GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    });
  } catch (error) {
    core.setFailed(error.message);
  }
})();

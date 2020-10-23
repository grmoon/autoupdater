const core = require("@actions/core");
const autoupdater = require("./autoupdater");

try {
  autoupdater({
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  });
} catch (error) {
  core.setFailed(error.message);
}

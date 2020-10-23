const core = require("@actions/core");
const github = require("@actions/github");

try {
  core.setOutput("Test");
} catch (error) {
  core.setFailed(error.message);
}

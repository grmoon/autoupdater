# PR Auto Updater

## Instructions

Add the `autoupdate` label to a PR to automatically update the head branch whenever the base branch is updated. Add the following to `.github/workflows/autoupdate.yaml`. That's it.

```yaml
name: autoupdater
on: push
jobs:
  autoupdate:
    name: autoupdate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: PR Auto Updater
        uses: grmoon/autoupdater@0.0.2
        env:
          # Required
          GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
```

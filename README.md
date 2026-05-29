# EPStudy

This repository publishes the V6 EPStudy app and extension with GitHub Pages.

## Structure

- `index.html` redirects GitHub Pages visitors into `V6/`.
- `V6/index.html` redirects straight into Normal mode.
- `V6/versions/v3/` is the Normal workspace.
- `V6/versions/simple/` is the Simple workspace, opened by config code.
- `V6/shared/` contains images, audio, shared app data, and analytics logging.
- `V6/extension/` contains the Chrome/Edge extension source.

The older local folders (`V1/` through `V5/`) and local analytics viewer are ignored by git so they can stay on this machine without being uploaded to GitHub.

## Publish

From this folder:

```sh
git init
git add .
git commit -m "Publish EPStudy V6"
git branch -M main
git remote add origin https://github.com/<your-username>/Epstudy.git
git push -u origin main
```

Then in GitHub, enable Pages from the `main` branch root. The public URL will open V6 Normal mode automatically.

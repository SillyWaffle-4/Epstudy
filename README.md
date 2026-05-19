# EPStudy

This repository publishes the V5 EPStudy launcher and workspaces with GitHub Pages.

## Structure

- `index.html` redirects GitHub Pages visitors into `V5/`.
- `V5/index.html` is the V5 launcher.
- `V5/versions/v2/` and `V5/versions/v3/` are the two bundled workspaces.
- `V5/extension/` contains the Chrome/Edge extension source.

The older local folders (`V1/` through `V4/`) are ignored by git so they can stay on this machine without being uploaded to GitHub.

## Publish

From this folder:

```sh
git init
git add .
git commit -m "Publish EPStudy V5"
git branch -M main
git remote add origin https://github.com/<your-username>/Epstudy.git
git push -u origin main
```

Then in GitHub, enable Pages from the `main` branch root. The public URL will open V5 automatically.

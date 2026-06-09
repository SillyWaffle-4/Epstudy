# EPStudy V7

V7 is a static React app served directly by GitHub Pages. It uses the existing EPStudy extension bridge for Canvas, TeamSnap, and Membean syncing, while keeping the UI state in localStorage.

- `index.html` loads the React app.
- `src/` contains the V7 React source and CSS.
- `shared/` contains local assets copied from V6.
- `extension/` contains the Chrome/Edge extension source for V7.

The dashboard periods widget exists in V7, but it is hidden by default. Users can turn it on in Settings.

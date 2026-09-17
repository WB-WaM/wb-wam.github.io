# WB-WAM

Project website for **WB-WAM: Heterogeneous Body–Hand Pretraining for Humanoid Loco-Manipulation**.

## Site contents

- Research overview, method, datasets, demonstrations, and evaluation results.
- Optimized 1080p / 60 fps simulation videos with paired camera views.
- Silent web copies of real-robot demonstrations and accelerated consecutive-success videos.

This repository contains only the files needed by the public website and icon attribution. Original recordings, development snapshots, caches, and local tooling are excluded.

## GitHub Pages

Serve the root of the `main` branch using GitHub Pages. No build step or external dependencies are required; `.nojekyll` enables static serving.

## Updating the page

The active files are `index.html`, `assets/research.css`, `assets/research.js`, and `assets/results-data.js`. Resource links and video mappings are configured in `assets/results-data.js`.

The `.gitignore` uses an explicit file allowlist. Add newly referenced assets to that allowlist deliberately. Do not add original recordings; real-robot web videos must have their audio tracks removed before publication.

Icon attribution and licensing notes are in `assets/icons/`.

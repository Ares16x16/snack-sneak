# Snack Sneak

Two short Hong Kong café games. **Snack Sneak:** hold to eat, release before the boss turns. **Tray Chaos:** catch snacks, dodge pigeons. Choose either from the Games menu.

English and Traditional Chinese. Daily challenges reset at Hong Kong midnight. Scores stay on the device. No backend, account, analytics or enabled ads.

## Test locally

Use Node.js 22 or newer. Gameplay, builds and tests need no dependency installation.

```sh
npm run dev
```

Open <http://127.0.0.1:4173/>. Stop the server with Ctrl+C.

```sh
npm run check
```

## Publish on GitHub Pages

1. Create an **empty public repository** on GitHub. Do not add a README, license or gitignore there; this folder already has the project files.
2. In this folder, review and commit the prepared source:

   ```sh
   git status --short
   git add .
   git diff --cached --stat
   git commit -m "Prepare Snack Sneak for GitHub Pages"
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
   git push -u origin main
   ```

   Replace the username and repository. Authenticate through GitHub's own sign-in flow; do not put tokens in source files or the remote URL.
3. In the repository, choose **Settings → Pages → Source → GitHub Actions**.
4. Open **Actions → GitHub Pages → Run workflow**, choose `main`, then run. If the initial push ran before Pages was enabled, this reruns deployment.
5. Open the URL shown by the successful deployment. Later pushes to `main` deploy automatically; pull requests run checks without deploying.

The workflow derives the URL from GitHub Pages settings. Both `https://USERNAME.github.io/REPOSITORY/` and a root/custom-domain site work. It publishes **only `dist-pages/`**, not the repository. No personal access token or Cloudflare account is needed by this workflow; GitHub supplies its deployment credentials.

To build the Pages output yourself:

```sh
npm run build:pages -- --url https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/
```

The public support contact is `ed700a@gmail.com`, configured in `site.contactEmail` in `public/site-config.json`. Review the public About/Privacy pages before promoting the site. The Pages build gets its origin from the workflow, so no placeholder username needs to be committed.

GitHub Pages has [hosting restrictions](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), including restrictions on running an online business. Review these before monetizing; Cloudflare is also supported.

## Cloudflare alternative

```sh
npm ci
npm run deploy:check
npx wrangler login
npm run deploy
```

This deploys static assets with no backend bindings. After the first deployment, set `site.url` in `public/site-config.json` to the actual HTTPS origin, without a path, then redeploy. Cloudflare uses `dist/`; Pages uses `dist-pages/`.

```sh
npm run release
npm run smoke -- https://YOUR-CLOUDFLARE-ADDRESS
```

Release creates checked site/starter ZIPs under `artifacts/`. The smoke command checks Cloudflare routes and security headers; it is not a GitHub Pages check.

## Sharing

Results offer Threads, X and WhatsApp drafts, copy-link, and downloadable Post/Story images. For Instagram Stories, upload the Story image and add the challenge URL with a Link sticker. The website never publishes automatically. Local preview URLs disable public social drafts. Scores are casual client-side claims, not verified leaderboard entries.

## Make another game

```sh
npm run new-game -- noodle-rush --name "Noodle Rush"
cd games/noodle-rush
npm run dev
```

Edit `public/game-config.json` for text, colours and the Games menu. Edit the generated `public/assets/game.js` for gameplay. The generated README describes the adapter. Daily/practice, pause, results and sharing are included. Each generated project has its own Pages workflow and Cloudflare deployment settings. Existing folders are never overwritten.

## What goes into Git

The root `README.md` is the **only Markdown file included**. AI instructions, local research/reviews, `docs/`, `artifacts/`, builds, generated games, dependencies, environment files and common private-key files are ignored. Ignored local files are kept on disk. The reusable game documentation lives in `starter/README.template` so the generator works from a fresh clone.

`.gitignore` does not remove files already committed and cannot detect every secret. Review `git diff --cached` before pushing. Everything under `public/` ships to players; keep credentials out of it.

## Security and ads

The Cloudflare build applies `public/_headers`, including CSP, framing and content-type protections. Pages cannot apply those custom HTTP headers; its build adds supported CSP and referrer meta policies. Meta CSP cannot enforce `frame-ancestors`, so Pages does not have the same framing protection as Cloudflare.

Ads remain disabled. Before enabling them, obtain approval, configure real publisher settings, integrate consent where required, and update privacy/CSP for the actual ad and consent services. The project does not supply AdSense approval or a consent platform.

Tests cover both games, sharing, build references, Pages paths, standalone generation, archive integrity and Cloudflare HTTP behavior. Test the deployed games and native sharing on your phone too. A local pass does not establish successful publication or guarantee the absence of vulnerabilities.

Fonts are self-hosted; their licenses are in `public/assets/fonts/`.

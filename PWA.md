# Quik Former PWA Context

## Purpose

Quik Former is delivered as an installable, offline-capable web application.
PWA support is root application infrastructure rather than a product feature:
its implementation spans the HTML entry point, public assets, React bootstrap,
production hosting behavior, and integration tests.

Read `PLAN.md` for product direction and `ARCHITECTURE.md` for the broader
application architecture.

## Current Behavior

- `index.html` links `/manifest.webmanifest`, declares the application theme
  color, and uses the `Quik Former` document title.
- `public/manifest.webmanifest` uses standalone display and declares 192px and
  512px PNG icons.
- `src/registerServiceWorker.ts` registers `/sw.js` from the root scope after
  page load when service workers are supported.
- `src/main.tsx` starts service-worker registration and mounts the application
  inside React Router's `BrowserRouter`.
- `public/sw.js` provides versioned app-shell caching, offline navigation
  fallback, and same-origin static-asset caching.
- Vite preview serves `index.html` for direct navigation to client-side routes.
  Production hosting must provide the same SPA fallback behavior.

The current shell routes are `/`, `/builder`, `/fill`, `/responses`, and
`/settings`, with a `*` not-found route.

## Service-Worker Invariants

- The worker must continue to register from the fixed root URL `/sw.js`.
- App-shell cache names must be versioned. Increment the version whenever shell
  assets or caching behavior change so activation can remove obsolete caches.
- Installation is fail-closed: a non-successful `index.html` response or any
  required shell-asset failure must reject installation instead of activating
  an incomplete offline shell.
- The worker discovers generated Vite JavaScript and CSS asset paths from the
  production `index.html` and precaches them with the manifest and app icons.
- Navigation is network-first with cached `index.html` as the offline fallback.
- Same-origin scripts, styles, images, fonts, manifest requests, and `/assets/`
  requests are cache-first.
- Cross-origin requests are not intercepted.
- Form packages and responses must not be stored through the HTTP cache. That
  data belongs in the planned IndexedDB storage layer.

Focused regression coverage for installation, activation, precaching, and fetch
strategies lives in `tests/service-worker.test.js` and runs through `pnpm test`.

## Verification

Run these checks after changing routing, the manifest, app icons, generated
shell assets, service-worker registration, or caching behavior:

1. Run `pnpm build`, `pnpm lint`, and `pnpm test`.
2. Start `pnpm preview` and open the production preview in Chromium.
3. Confirm `/`, `/builder`, `/fill`, `/responses`, and `/settings` render.
4. Reload a nested route and confirm the server returns the application shell.
5. Confirm the manifest loads without parsing or installability errors and
   exposes the 192px and 512px icons.
6. Confirm `/sw.js` is activated, controls the root scope, and caches
   `index.html`, generated JavaScript and CSS, the manifest, favicon, and icons.
7. Switch the browser offline and reload a nested route.

### Latest Verification

Verified on 2026-07-19 against the Vite production preview at
`http://127.0.0.1:4173`:

- The build, lint, and service-worker tests passed.
- All planned routes and an unknown nested route returned the application shell
  with status 200.
- Headless Chromium 149, driven by Playwright 1.61.1, rendered every planned
  route without console or page errors.
- The service worker was activated, controlled the root scope, and cached all
  required shell resources.
- Chromium reported no manifest parsing or installability errors.
- Reloading `/responses` while offline rendered the expected route.

## Future Work

- Add update notification UX when a new service worker is waiting.
- Add padded maskable icons and richer install-prompt assets such as
  screenshots.
- Consider `vite-plugin-pwa` when generated precache management, stale-update
  handling, or larger caching rules justify the dependency.
- Add route-level tests when an appropriate browser/React test harness becomes
  part of the project.

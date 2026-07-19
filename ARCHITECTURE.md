# Quik Former Architecture

## Purpose

Quik Former is planned as a local-first PWA for creating, filling, saving, and
exporting reusable forms. The product direction lives in `PLAN.md`; this file
tracks the architecture that is either implemented now or expected by the
current plan.

## Current Implementation State

The repository has a Milestone 1 PWA shell and a Milestone 2 local-first form
builder.

- The app entry point is `src/main.tsx`.
- `src/main.tsx` mounts React inside React Router's `BrowserRouter` and starts
  service worker registration.
- `src/App.tsx` owns the routed shell. Home and builder route behavior lives in
  `src/features/home/` and `src/features/builder/`.
- `src/registerServiceWorker.ts` registers the root service worker after page
  load when service workers are supported.
- Tailwind CSS 4 is integrated through its Vite plugin. `src/index.css` owns
  theme tokens and base styles; existing semantic application styles in
  `src/App.css` are imported into Tailwind's component layer while new shell
  styling uses utilities.
- Static PWA assets live in `public/`, including `manifest.webmanifest`,
  `sw.js`, favicon SVG, and PNG app icons.
- `src/lib/forms/` owns versioned form shapes, IDs, migrations, snapshots, and
  meaningful dirty comparison.
- `src/lib/storage/` owns Dexie schema version 1 and the builder repository.
- The builder creates/reopens multiple drafts, autosaves incomplete work,
  creates immutable valid revisions, and previews ephemeral answers.
- Fill mode, response management, import/export, and PDF export are not yet
  implemented.
- Focused Vitest coverage exercises service-worker installation, activation,
  app-shell precaching, and fetch strategies. `package.json` defines `test`, but
  not a `format` script.

## Tech Stack

- React 19 with React DOM, docs available at https://19.react.dev/reference/react
- Vite 8 for dev server and production bundling, docs available at https://v8.vite.dev/guide/.
- TypeScript 6 with project references for app and Vite config builds, docs available at https://www.typescriptlang.org/docs/.
- React Router is installed, docs available at https://reactrouter.com/home.
- `pdf-lib` is installed for future browser-side PDF generation, docs are available at https://pdf-lib.js.org/docs/api/.
- Oxlint is configured through the package script, with no custom lint config
  file currently present.
- `dnd-kit` is installed for DragDrop behaviour, docs are available at https://dndkit.com/react/quickstart/
- Dexie 4 provides IndexedDB persistence behind the repository seam.
- Testing Library, jsdom, and fake IndexedDB support DOM and repository tests.
- Tailwind CSS 4 is the styling foundation. shadcn/ui remains a separate future
  design-system decision and is not installed.

## Current File Layout

```text
.
├── PLAN.md                  Product direction and MVP scope.
├── PWA.md                   PWA behavior, invariants, and verification.
├── AGENTS.md                Repository instructions for agents.
├── ARCHITECTURE.md          This architecture snapshot.
├── CONTEXT-MAP.md           Agent context map for features and planned docs.
├── public/                  Public static assets.
│   ├── manifest.webmanifest PWA manifest.
│   ├── sw.js                App shell service worker.
│   └── icon-*.png           Manifest icons.
├── src/
│   ├── App.tsx              Routed application shell.
│   ├── App.css              Legacy semantic component-layer styles.
│   ├── components/          Shared dialog and controlled form renderer.
│   ├── features/builder/    Builder route, reducer, operations, validation.
│   ├── features/home/       Local form library route.
│   ├── lib/forms/           Versioned form domain and revisions.
│   ├── lib/storage/         Dexie database and repository adapter.
│   ├── index.css            Global styles and CSS variables.
│   ├── main.tsx             React root/router bootstrap.
│   ├── registerServiceWorker.ts
│   └── assets/              Starter image assets.
├── package.json             Scripts and dependencies.
├── tests/
│   └── service-worker.test.js
├── vite.config.ts           Vite React plugin setup.
└── tsconfig*.json           TypeScript project configuration.
```

The planned `src/features/fill/`, `src/features/responses/`, and
`src/features/export/` directories do not exist yet.

## Planned Application Shape

The planned architecture should keep domain behavior outside UI components.
React components should coordinate rendering and user interaction, while schema,
validation, storage, migration, and export behavior should live in `src/lib/` or
feature-level modules.

Expected high-level areas:

- Form builder: creates mutable drafts and saves immutable revisions.
- Fill mode: renders a single immutable revision and captures draft/submitted
  responses.
- Responses: stores many responses per form, keeps submitted responses
  immutable, and renders historical responses from embedded revision snapshots.
- Import/export: reads and writes versioned JSON form packages and
  self-contained submitted response packages.
- PDF export: renders submitted responses from their embedded revision snapshot.
- PWA shell: installable app behavior and offline support.

## Data Model Direction

`PLAN.md` is the source of truth for the planned data model. The important
architectural constraints are:

- Form packages are versioned JSON documents.
- Form templates and responses are separate first-class objects.
- Form, revision, section, field, option, and response IDs are generated
  internally and remain stable.
- Builder edits happen in mutable drafts.
- Fill mode always uses an immutable form revision.
- Saving builder changes creates a new revision so old responses remain tied to
  the exact revision they used.
- Exported form JSON includes all revisions for a form.
- Exported submitted response JSON embeds the exact form revision snapshot so
  the response remains viewable and exportable if the original form is missing.

Form schema format version 1 is implemented. All stored package reads use a
migration entry point, which currently clones version 1 and rejects unknown
future versions.

## Storage Direction

The planned MVP storage is browser-local and user-controlled:

- IndexedDB is the planned working store and autosave store.
- JSON import/export is the durable backup and manual transfer mechanism.
- Storage helpers should not be embedded in React components.

Dexie schema version 1 stores form packages and drafts in separate tables. The
repository interface hides transactions and Dexie records from React and the
domain model. Response storage remains deferred.

## Routing

React Router is active in declarative routing mode. Implemented routes are:

- `/` for the local form library.
- `/builder/new` for persisted draft creation.
- `/builder/:formId` for reopening a form workspace.
- `/builder` redirects to `/builder/new`.
- `/fill` for the fill mode placeholder.
- `/responses` for the responses placeholder.
- `/settings` for the settings placeholder.
- `*` for a not-found placeholder with a home link.

The route components currently live in `src/App.tsx` while they are simple
placeholders. Move feature routes into `src/features/*` as real behavior lands.

## Export Direction

`pdf-lib` is installed but unused. Planned PDF export should:

- Export only submitted responses in the MVP.
- Render from the submitted response plus its embedded form revision snapshot.
- Include title, metadata, sections, field labels, answers, signature images,
  timestamp, and blank entries for unanswered optional fields.
- Prefer a simple structured PDF over pixel-perfect UI reproduction.

## PWA Direction

The app has the first PWA shell implementation:

- `index.html` links `public/manifest.webmanifest`, sets theme color metadata,
  and uses the `Quik Former` document title.
- `public/manifest.webmanifest` declares standalone display, app colors, and
  192px/512px PNG icons.
- `public/sw.js` uses a versioned app cache, caches the app shell during
  install, and fails installation if any required shell asset cannot be cached.
  It removes old Quik Former caches during activate, serves navigation requests
  network-first with cached `index.html` fallback, and serves same-origin static
  assets cache-first.
- Cross-origin requests are ignored by the service worker.

The production shell, route fallback, service worker, offline reload, manifest,
and Chromium installability checks were last verified on 2026-07-19. The exact
procedure and results are recorded in `PWA.md`.

The service worker does not cache form data. Local-first data belongs in the
future IndexedDB storage layer.

## Testing Direction

Vitest currently covers service-worker installation, activation, precache
failure behavior, and fetch strategies. As product features are introduced,
tests should cover the highest-risk domain behavior first:

- Schema migrations.
- Validation rules.
- Local save/load behavior.
- Form and response import/export.
- PDF export formatting.
- Core builder and fill workflows.

Use colocated unit tests for narrow modules and `tests/` for integration,
workflow, fixture-heavy, or cross-feature tests.

## Documentation Maintenance

Keep this file factual. If code is not implemented, describe it as planned.
When new feature areas are created, update this document with the real module
names, ownership boundaries, and any behavior that differs from `PLAN.md`.

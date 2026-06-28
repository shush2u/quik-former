# Quik Former Architecture

## Purpose

Quik Former is planned as a local-first PWA for creating, filling, saving, and
exporting reusable forms. The product direction lives in `PLAN.md`; this file
tracks the architecture that is either implemented now or expected by the
current plan.

## Current Implementation State

The repository is currently at the initial Vite/React scaffold stage.

- The app entry point is `src/main.tsx`.
- The only rendered application component is `src/App.tsx`.
- Styling is global CSS in `src/index.css` and component-adjacent CSS in
  `src/App.css`.
- Static assets currently include Vite/React starter images under `src/assets/`
  and SVG assets under `public/`.
- There is no implemented form schema, storage layer, routing, builder, fill
  mode, response management, PDF export flow, service worker, or PWA manifest
  yet.
- There are no tests yet, and `package.json` does not currently define a
  `test` or `format` script.

## Tech Stack

- React 19 with React DOM, docs available at https://19.react.dev/reference/react
- Vite 8 for dev server and production bundling, docs available at https://v8.vite.dev/guide/.
- TypeScript 6 with project references for app and Vite config builds, docs available at https://www.typescriptlang.org/docs/.
- React Router is installed, docs available at https://reactrouter.com/home.
- `pdf-lib` is installed for future browser-side PDF generation, docs are available at https://pdf-lib.js.org/docs/api/.
- Oxlint is configured through the package script, with no custom lint config
  file currently present.
- `dnd-kit` is installed for DragDrop behaviour, docs are available at https://dndkit.com/react/quickstart/
- Prefer shad/cn UI components for basic ui like buttons, fields, etc., docs available at https://ui.shadcn.com/docs.

## Current File Layout

```text
.
├── PLAN.md                  Product direction and MVP scope.
├── AGENTS.md                Repository instructions for agents.
├── ARCHITECTURE.md          This architecture snapshot.
├── CONTEXT-MAP.md           Agent context map for features and planned docs.
├── public/                  Public static assets.
├── src/
│   ├── App.tsx              Current starter UI.
│   ├── App.css              Starter UI styles.
│   ├── index.css            Global styles and CSS variables.
│   ├── main.tsx             React root bootstrap.
│   └── assets/              Starter image assets.
├── package.json             Scripts and dependencies.
├── vite.config.ts           Vite React plugin setup.
└── tsconfig*.json           TypeScript project configuration.
```

The intended feature directories from `AGENTS.md` do not exist yet:

- `src/components/` for reusable UI components.
- `src/features/` for builder, fill mode, responses, and export features.
- `src/lib/` for schema, storage, validation, migration, and PDF helpers.
- `tests/` for integration or cross-feature tests.

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

No schema code exists yet. When it is added, keep schema definitions versioned
and migration-ready from the first implementation.

## Storage Direction

The planned MVP storage is browser-local and user-controlled:

- IndexedDB is the planned working store and autosave store.
- JSON import/export is the durable backup and manual transfer mechanism.
- Storage helpers should not be embedded in React components.

No IndexedDB implementation exists yet. The package plan mentions Dexie as a
possible IndexedDB wrapper, but Dexie is not currently installed.

## Routing Direction

React Router is installed but unused. The planned route surface from `PLAN.md`
is:

- Home or dashboard.
- Builder.
- Fill mode.
- Responses and/or settings.

Routing should be introduced once the first real product screens replace the
starter Vite UI.

## Export Direction

`pdf-lib` is installed but unused. Planned PDF export should:

- Export only submitted responses in the MVP.
- Render from the submitted response plus its embedded form revision snapshot.
- Include title, metadata, sections, field labels, answers, signature images,
  timestamp, and blank entries for unanswered optional fields.
- Prefer a simple structured PDF over pixel-perfect UI reproduction.

## PWA Direction

The app is planned as an installable offline-capable PWA. Current PWA state:

- `index.html` has a favicon and viewport metadata.
- `public/favicon.svg` exists.
- There is no `manifest.webmanifest`.
- There is no service worker or offline caching implementation.

## Testing Direction

There is no test runner configured yet. When tests are introduced, they should
cover the highest-risk domain behavior first:

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

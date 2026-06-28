# Quik Former Context Map

This file is the agent-facing map for finding product, architecture, and
feature context. It should stay lightweight and point to deeper `CONTEXT.md`
files as features are implemented.

## How To Use This Map

1. Read `PLAN.md` for product direction and MVP behavior.
2. Read `ARCHITECTURE.md` for the current architecture snapshot.
3. Use this file to find the relevant feature area and its current state.
4. When a feature directory gets substantial behavior, add a local
   `CONTEXT.md` file there and link it from this map.

## Current Reality Check

The product domain behavior is not implemented yet. The repository has a
Milestone 1 PWA shell with routing, installability metadata, and offline app
shell caching. Most feature entries below describe planned areas from
`PLAN.md`, not existing form behavior.

Implemented today:

- React and React Router bootstrap in `src/main.tsx`.
- Routed app shell and placeholder routes in `src/App.tsx`.
- Global and app shell styles in `src/index.css` and `src/App.css`.
- Service worker registration in `src/registerServiceWorker.ts`.
- PWA manifest, service worker, favicon, and app icons in `public/`.
- Dependencies for React, React Router, Vite, TypeScript, Oxlint, and `pdf-lib`.
- Service-worker installation tests using Node's built-in test runner.

Not implemented yet:

- Form builder.
- Form schema/types.
- Form validation.
- Local storage/IndexedDB.
- JSON import/export.
- Fill mode.
- Response lifecycle.
- PDF export.
- Product-domain and route-level tests.

## Canonical Project Context

| File | Purpose |
| --- | --- |
| `PLAN.md` | Product goal, MVP scope, planned data model, milestones. |
| `ARCHITECTURE.md` | Current architecture state and intended module boundaries. |
| `PWA.md` | PWA behavior, invariants, maintenance, and verification. |
| `AGENTS.md` | Repository conventions, commands, and agent rules. |
| `package.json` | Real scripts and installed dependencies. |

## Feature Context Index

### App Shell

- Current code: `src/main.tsx`, `src/App.tsx`, `src/registerServiceWorker.ts`,
  `src/index.css`, `src/App.css`.
- Current state: responsive shell with navigation and placeholder routes for
  `/`, `/builder`, `/fill`, `/responses`, `/settings`, and `*`.
- Planned context file: `src/CONTEXT.md` or `src/app/CONTEXT.md` once the app
  shell has real routing/layout behavior.
- Planned responsibilities: application bootstrap, route registration, shared
  layout, responsive shell, global empty/loading/error surfaces.

### Shared UI Components

- Current code: none.
- Planned directory: `src/components/`.
- Planned context file: `src/components/CONTEXT.md`.
- Planned responsibilities: reusable controls, dialogs, field chrome, buttons,
  layout primitives, and shared accessibility patterns.

Keep shared components free of form persistence and export behavior. Feature
modules should pass data and callbacks into shared UI.

### Form Schema And Migrations

- Current code: none.
- Planned directory: `src/lib/`.
- Suggested future context file: `src/lib/schema/CONTEXT.md` or
  `src/lib/CONTEXT.md`.
- Planned responsibilities: versioned JSON schema definitions, generated ID
  rules, migration helpers, form package import shape, response package shape.

Important planned behavior:

- Forms are versioned JSON packages.
- Form templates and filled responses are separate first-class objects.
- Internal IDs are stable and hidden from normal users.
- Exported form packages include all revisions.
- Exported submitted responses embed the exact revision snapshot.

### Form Builder

- Current code: none.
- Planned directory: `src/features/builder/`.
- Planned context file: `src/features/builder/CONTEXT.md`.
- Planned responsibilities: create/edit form drafts, add/edit/delete/duplicate
  sections and fields, configure options and validation settings, preview form,
  save changes as immutable revisions.

Important planned behavior:

- Builder edits happen in mutable drafts.
- Saving creates a new immutable revision for fill mode.
- Duplicated sections, fields, and options receive fresh generated IDs.
- Undo/redo is deferred; destructive actions should require confirmation.

### Fill Mode

- Current code: none.
- Planned directory: `src/features/fill/`.
- Planned context file: `src/features/fill/CONTEXT.md`.
- Planned responsibilities: render immutable form revisions, collect answers,
  validate required/type constraints, autosave draft responses, submit completed
  responses.

Important planned behavior:

- Fill mode renders from a specific immutable revision.
- Draft responses are editable.
- Submitted responses are immutable.
- Required radio/select fields require exactly one selected option.
- Required checkbox fields require at least one selected option.
- Choice fields with enabled "Other" must store option IDs and write-in text
  explicitly.

### Responses

- Current code: none.
- Planned directory: `src/features/responses/`.
- Planned context file: `src/features/responses/CONTEXT.md`.
- Planned responsibilities: list saved responses, view submitted responses,
  group responses by form when possible, handle orphaned/imported responses,
  support response JSON import/export.

Important planned behavior:

- Each form can have many saved responses.
- Response lifecycle is `draft` to `submitted` for the MVP.
- Drafts are local working state and are not exportable as JSON in the MVP.
- Submitted response exports are self-contained and deduplicate by `responseId`
  on import.

### Local Storage

- Current code: none.
- Planned directory: `src/lib/`.
- Suggested future context file: `src/lib/storage/CONTEXT.md`.
- Planned responsibilities: IndexedDB access, autosave, save/load forms,
  save/load response drafts and submitted responses, import conflict handling.

Important planned behavior:

- IndexedDB is the planned local working store.
- JSON files are the durable user-controlled backup/transfer format.
- If imported form IDs already exist, merge only when matching revision IDs have
  identical content or the revisions are new.
- If matching imported response IDs differ, ask whether to import as a separate
  copy with a new response ID or cancel.

### Validation

- Current code: none.
- Planned directory: `src/lib/`.
- Suggested future context file: `src/lib/validation/CONTEXT.md`.
- Planned responsibilities: required checks, field-type checks, text length
  constraints, number min/max constraints, date range constraints, choice field
  rules.

Deferred behavior:

- Regex/pattern validation.
- Number step validation.
- Default field values.
- Conditional logic.

### PDF Export

- Current code: none.
- Planned directory: `src/features/export/` or `src/lib/pdf/`.
- Planned context file: `src/features/export/CONTEXT.md` or
  `src/lib/pdf/CONTEXT.md`.
- Planned responsibilities: generate PDFs for submitted responses using
  `pdf-lib`.

Important planned behavior:

- PDF export applies only to submitted responses in the MVP.
- PDFs render from the embedded revision snapshot.
- PDFs include unanswered optional fields as blank entries.
- Layout should be simple and structured, not a pixel-perfect print of the UI.

### PWA And Offline

- Current code: `index.html`, `src/registerServiceWorker.ts`,
  `public/manifest.webmanifest`, `public/sw.js`, `public/favicon.svg`,
  `public/icon-192.png`, `public/icon-512.png`,
  `tests/service-worker.test.js`.
- Current context: `PWA.md`.
- Planned responsibilities: installability, offline support, app icons, mobile
  behavior, caching strategy.

Implemented behavior:

- Manifest uses standalone display and includes required 192px and 512px PNG
  icons.
- Service worker registers from `/sw.js` after page load.
- Service worker caches the complete app shell or fails installation, removes
  old Quik Former caches, handles navigation requests network-first with cached
  `index.html` fallback, and handles same-origin static assets cache-first.
- Cross-origin requests and future form data are not cached through the fetch
  handler.
- Production routing, service-worker control, offline nested-route reload, and
  Chromium manifest/installability checks passed on 2026-07-19; see `PWA.md`
  for the verification procedure and record.

### Temporary Links

- Current code: none.
- Planned state: deferred until after the local-first MVP.
- Future context file: likely `src/features/share/CONTEXT.md` plus backend docs
  if a backend is introduced.
- Planned responsibilities: temporary fill links, expiration, hosted storage,
  temporary response collection.

This area should not shape the MVP implementation until storage and backend
decisions are explicit.

## Planned Field Types

The MVP field vocabulary from `PLAN.md`:

- Text.
- Textarea.
- Radio buttons.
- Checkboxes.
- Select.
- Date.
- Number.
- Visual signature.

Deferred or constrained field behavior:

- File uploads are deferred.
- Image uploads are deferred.
- Select fields should not support "Other" write-ins in the MVP.
- Yes/No should be a builder preset that creates a normal radio field, not a
  separate boolean field type.
- Signature fields are visual inputs only, not legal identity verification.

## Context File Convention

When adding a `CONTEXT.md` file, include:

- Current implemented behavior.
- Planned behavior from `PLAN.md` that still applies.
- Important invariants and edge cases.
- Public module boundaries.
- Test coverage expectations.
- Known deferred behavior.

Keep these files factual. If a behavior is planned but not implemented, label it
as planned.

# Form Storage Context

## Implemented Behavior

`database.ts` defines Dexie schema version 1 with `formPackages` and
`formDrafts`, both keyed by `formId` and indexed by `updatedAt`. Storage-only
timestamps wrap domain values and never leak into exported form shapes.

`formRepository.ts` is the builder storage seam. Its interface creates and
loads drafts, lists compact summaries, updates drafts, and saves revisions.
All stored package reads pass through `migrateFormPackage`.

Revision saving is one read-write transaction. It validates the draft, rejects
content equal to the current revision, snapshots nested content, appends the
immutable revision, advances `currentRevisionId`, and updates the draft's
`baseRevisionId`. Thrown validation or write errors abort the transaction.

## Invariants

- Dexie types stay inside storage modules.
- Draft and package values are cloned at storage interfaces to avoid mutable
  reference leaks.
- Draft equality ignores draft/revision IDs and timestamps.
- A missing form ID is not replaced with a new form.

## Deferred

Response storage, JSON import/export, conflicts, whole-package deletion, and
revision history operations are not part of this schema interface yet.

# Form Builder Context

## Implemented Behavior

Milestone 2 provides routed creation at `/builder/new`, editing at
`/builder/:formId`, debounced draft autosave, immutable revision saves, field
and section authoring, confirmed deletion, field movement, and draft preview.

`BuilderPage.tsx` owns route loading/error/not-found behavior.
`BuilderWorkspace.tsx` coordinates the editor and preview. Persisted form data
is held in `BuilderState.draft`; expanded cards, mode, preview answers, and live
announcements are transient reducer state.

Tailwind CSS is the styling foundation. Existing semantic application styles,
including builder drag, dialog, and validation states, remain in Tailwind's
component layer; new general layout work should prefer utilities.

## Module Interfaces

- `builderOperations.ts` contains immutable nested draft operations and field
  factories. New and duplicated entities receive IDs through `IdGenerator`.
- `builderValidation.ts` reports blocking configuration errors separately from
  non-blocking warnings. It does not validate response answers.
- `builderReducer.ts` translates explicit UI actions into pure operations.
- `useDraftAutosave.ts` debounces writes for 500 ms, serializes them, exposes
  visible state, supports retry, and can flush pending work.
- `FormRenderer` in `src/components/form/` is controlled by answer values and
  callbacks. Builder preview owns ephemeral answer state.

## Invariants

- Field types cannot change after creation.
- Autosave writes mutable drafts and never creates revisions.
- Only valid, changed content can create a revision.
- Preview never submits or persists answers.
- Section and field deletion require confirmation.
- Field movement has pointer/keyboard drag handles and explicit move controls.

## Deferred

Section reordering, revision history management, undo/redo, response capture,
multi-tab conflict detection, and field-type conversion remain deferred.

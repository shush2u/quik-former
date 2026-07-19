# Milestone 2: Form Builder Implementation Plan

## Outcome

Milestone 2 delivers a responsive, local-first form builder that can create and
reopen multiple forms, autosave incomplete mutable drafts, save valid drafts as
immutable revisions, and preview the current draft without creating responses.

This milestone intentionally pulls forward only the IndexedDB capabilities
needed by the builder. Milestone 3 will extend the storage layer with response
storage, JSON import/export, conflict handling, and whole-package deletion.

## Confirmed Product Decisions

- Persist builder drafts and saved form revisions in IndexedDB during this
  milestone. Do not use an in-memory-only or `localStorage` interim format.
- Add Dexie behind a repository interface. Dexie types must not leak into domain
  models or React components.
- Support multiple forms with `/builder/new` and `/builder/:formId`. The home
  route gets a minimal list of local forms with an edit action.
- Preview the current draft, including unsaved edits, rather than only the most
  recent saved revision.
- Preview controls are interactive but their answers are ephemeral. Preview
  never saves or submits a response.
- Reorder fields within a section and between sections. Do not reorder sections
  in this milestone.
- Provide pointer, touch, and keyboard drag interactions plus explicit move
  controls as a non-drag fallback.
- Confirm both field deletion and section deletion. Section confirmation states
  how many fields will also be removed.
- Autosave updates the mutable draft only. It never creates a revision.
- “Save revision” creates an immutable revision only when the valid draft
  differs from the latest revision.
- Build configuration controls for all eight MVP field types: text, textarea,
  radio, checkbox, select, date, number, and visual signature.
- A field's type cannot be changed after creation in Milestone 2.
- Use stacked section and field cards, with one field editor expanded at a time,
  rather than a desktop-only properties sidebar.
- Show current revision number, saved timestamp, autosave state, and draft dirty
  state. Do not add revision browsing, comparison, restoration, or deletion.
- Use Tailwind CSS as the styling foundation from Milestone 2 onward and add
  small accessible shared controls in `src/components/`. Keep specialized
  builder styles in Tailwind's component layer while migrating toward utility
  classes. Do not introduce shadcn/ui during this milestone; it can be
  reconsidered separately.
- Add React Testing Library, `user-event`, jsdom, and fake IndexedDB support.
  Defer Playwright until workflows span the builder, fill mode, and storage.

## Scope

### Included

- Versioned form package, revision, section, field, and option domain types.
- Migration-ready format-version boundary for form packages.
- Pure ID generation and draft manipulation operations.
- Form-configuration validation.
- Dexie schema and builder-specific repository operations.
- New-form creation and reopening an existing form draft.
- Minimal local form list on the home route.
- Form metadata, section, field, option, and validation-constraint editing.
- Field and section duplication with fresh generated IDs.
- Confirmed field and section deletion.
- Field ordering within and across sections.
- Debounced draft autosave with visible status and error recovery.
- Explicit immutable revision creation.
- Responsive, interactive, non-submittable preview.
- Unit, repository, component, and route-workflow tests.
- Architecture and context documentation updates after implementation.

### Deferred

- Filling a saved revision and creating response records.
- Response validation, draft responses, and submission.
- Form or response JSON import/export.
- Whole-form deletion and its response-retention choices.
- Revision history browsing, restoration, comparison, or deletion.
- Section reordering.
- Field-type conversion.
- Undo and redo.
- Multi-tab conflict detection or collaborative editing.
- Default field values, pattern validation, number steps, conditional logic,
  columns, grids, and repeatable groups.
- File/image upload fields and legally meaningful e-signatures.
- PDF and CSV export.
- shadcn/ui or a general shell redesign.

## Domain Model

### Package and draft boundary

Keep exported domain shapes independent of IndexedDB records:

```text
FormPackage
  formId
  formatVersion
  currentRevisionId
  revisions[]

FormRevision
  id
  title
  description
  sections[]
  createdAt

FormDraft
  formId
  baseRevisionId | null
  title
  description
  sections[]
  updatedAt
```

The mutable draft is a separate working object, not a revision with a mutable
flag. Saving a revision snapshots the draft content, creates a fresh revision
ID and timestamp, appends the snapshot to the package, and updates
`currentRevisionId`. Section, field, and option IDs remain stable across normal
revisions; only newly added or duplicated entities receive fresh IDs.

Start at `formatVersion: 1` and route all stored package reads through a
`migrateFormPackage` boundary even when version 1 initially returns unchanged.
Reject unknown future versions instead of guessing how to read them.

### Field union

Model fields as a discriminated union with shared properties:

```text
BaseField: id, type, label, helpText, required
TextField: minLength?, maxLength?
TextareaField: minLength?, maxLength?
NumberField: minValue?, maxValue?
DateField: earliestDate?, latestDate?
RadioField: options[], allowOther
CheckboxField: options[], allowOther
SelectField: options[]
SignatureField: no additional Milestone 2 settings
```

Choice options contain generated IDs and editable labels. “Other” is a field
setting, not a normal creator-editable option. Select fields do not support it.
The Yes/No convenience preset creates a normal radio field with two freshly
identified options.

### Injectable platform services

Use small `IdGenerator` and `Clock` interfaces in domain operations. Production
adapters use `crypto.randomUUID()` and the current ISO timestamp; tests use
deterministic implementations. This makes fresh-ID and revision behavior easy
to verify without mocking browser globals throughout the suite.

## Module Boundaries

Create focused modules rather than placing the builder in `App.tsx`:

```text
src/
  components/
    ConfirmDialog.tsx
    form/
      FormRenderer.tsx
      SignatureInput.tsx
  features/
    builder/
      BuilderPage.tsx
      BuilderWorkspace.tsx
      builderReducer.ts
      builderOperations.ts
      builderValidation.ts
      components/
      useDraftAutosave.ts
      CONTEXT.md
    home/
      HomePage.tsx
  lib/
    forms/
      schema.ts
      ids.ts
      migrations.ts
      revisions.ts
    storage/
      database.ts
      formRepository.ts
      CONTEXT.md
```

Exact filenames may be adjusted if implementation reveals a cleaner seam, but
the dependency direction must remain:

```text
React routes/components -> builder application logic -> form domain
                                              `-----> repository interface
Dexie adapter --------------------------------------> repository interface
```

- Domain functions must not import React, Dexie, or browser DOM APIs.
- Components dispatch explicit builder actions; they do not mutate nested form
  data directly.
- Storage modules own transactions and stored-record metadata.
- `FormRenderer` accepts a form-shaped snapshot and controlled answer values.
  Builder preview supplies ephemeral values; Milestone 4 fill mode will supply
  persisted response-draft values and validation state.

## Builder State and Operations

Use a reducer for the loaded workspace. Keep persisted draft data separate from
transient UI state such as expanded field, open confirmation, preview mode,
preview answers, and autosave status.

Pure builder operations should cover:

- Update form title and description.
- Add, update, duplicate, and delete a section.
- Add, update, duplicate, delete, and move a field.
- Add, update, reorder, and delete choice options.
- Enable or disable “Other” for radio and checkbox fields.
- Update type-specific constraints.
- Create a Yes/No radio preset.

Duplication rules:

- Insert a duplicated field immediately after its source.
- Insert a duplicated section immediately after its source.
- Copy all user-facing content and settings unchanged.
- Generate a new section ID for a duplicated section.
- Generate new field IDs for every duplicated field.
- Generate new option IDs for every option in duplicated choice fields.
- Never append “copy” to labels because that would alter user-facing content.

Deletion dialogs dispatch the destructive reducer action only after explicit
confirmation. Cancel leaves the draft untouched.

## Configuration Validation

Incomplete drafts are valid autosave state, but a revision can be saved only
when all blocking configuration errors are resolved.

Block revision creation unless:

- The form title is non-blank after trimming.
- The form contains at least one section.
- Every section title is non-blank after trimming.
- Every section contains at least one field.
- Every field label is non-blank after trimming.
- Every radio, checkbox, and select field has at least two options.
- Every option label is non-blank after trimming.
- Text limits are non-negative integers and minimum does not exceed maximum.
- Number limits are finite and minimum does not exceed maximum.
- Date limits use valid ISO date values and earliest does not exceed latest.
- IDs are unique in their appropriate package scope.

Duplicate displayed option labels do not block saving because responses will
use option IDs, but show a non-blocking warning that duplicate labels can
confuse people filling the form.

Keep this separate from response validation. Required-answer rules and input
value validation belong to Milestone 4.

## Persistence Design

### Dexie version 1

Use two builder-owned tables:

```text
formPackages: &formId, updatedAt
formDrafts:   &formId, updatedAt
```

Stored records may wrap the domain object with internal `createdAt` and
`updatedAt` metadata. Do not add storage-only fields to exported package shapes.
Large nested form content should remain unindexed.

Expose a narrow repository API such as:

```text
createFormDraft()
getBuilderWorkspace(formId)
listFormSummaries()
putDraft(draft)
saveRevision(draft)
```

`saveRevision` runs in one read-write transaction:

1. Read the latest package and draft for the form.
2. Persist the exact current draft.
3. Revalidate the draft.
4. Confirm its content differs from the current revision.
5. Append a newly identified and timestamped deep snapshot.
6. Update `currentRevisionId` and storage metadata.
7. Update the draft's `baseRevisionId` to the new revision.

If validation fails or any write fails, the transaction must not leave a new
revision or a partially updated package.

### Dirty comparison

Compare normalized draft content with the current revision while ignoring
draft-only metadata, revision ID, and revision timestamp. Do not use
`updatedAt` as proof of a content change. Disable “Save revision” when content
matches.

### Autosave

- Schedule a write 500 ms after the latest draft edit.
- Serialize writes so a slower old write cannot overwrite a newer state.
- Display `Saving…`, `Saved`, and actionable error states.
- A later edit retries autosave after an earlier failure; also provide a manual
  retry action while an error is visible.
- Flush a pending write before switching edit/preview mode and before app-owned
  navigation away from the builder.
- Keep the latest draft in memory if persistence fails; do not falsely show it
  as saved.
- Store `updatedAt` for future conflict detection, but treat simultaneous edits
  to the same form in multiple tabs as out of scope.

## Routes and Loading States

- `/builder/new` creates and immediately persists a draft with a generated
  `formId`, empty title, one untitled section, and no fields. Replace the URL
  with `/builder/:formId` so refresh does not create a second form.
- `/builder/:formId` loads the package and draft. When no newer draft exists,
  initialize the workspace from the current immutable revision.
- A missing form ID renders a clear not-found state with a link to the home
  route; it must not silently create a replacement form.
- The home route lists local forms using compact summaries: title or “Untitled
  form,” latest revision number, draft/saved state, last-updated time, and Edit.
- Keep import, export, delete, and response counts out of the list for now.
- Provide explicit initial loading, storage-unavailable, and retry states.

## Builder User Interface

### Edit mode

- Form title and optional description appear before the section list.
- Sections are vertical cards with title, optional description, duplicate, and
  delete actions.
- Fields are vertical cards within sections. Only one field editor is expanded
  at a time; collapsed cards show label, type, required state, drag handle,
  duplicate, and delete actions.
- “Add field” opens an accessible field-type chooser. A Yes/No preset appears
  as a convenience choice but creates a radio field.
- Field type is displayed but cannot be changed after creation.
- Inline messages connect configuration errors to their controls. A save
  summary links or focuses the first blocking error.
- The save area shows latest revision number/time, draft dirty state, autosave
  status, and the “Save revision” action.

### Field movement

Use the installed `@dnd-kit/react` package's current API:

- A semantic, focusable drag-handle button activates movement rather than the
  whole editable card.
- Support pointer, touch, and keyboard sensors.
- Use sortable groups to move fields within and across sections, including into
  an empty section.
- Announce pick-up, destination, drop, and cancellation through an ARIA live
  region.
- Preserve the pre-drag state when a drag is cancelled.
- Also expose Move up, Move down, and Move to section controls so all movement
  is available without performing a drag gesture.
- Autosave only the resulting order, not intermediate hover states.

### Deletion confirmation

Use an accessible modal dialog with focus trapping, Escape/cancel behavior, and
focus restoration. Field copy names the field. Section copy names the section
and states the number of contained fields that will be deleted.

### Responsive behavior

- Use the same stacked-card editing model on desktop and mobile.
- Keep primary edit/preview/save actions reachable without horizontal scrolling.
- Use touch targets of at least 44 by 44 CSS pixels for drag handles and primary
  card actions.
- Avoid relying on hover for required information or actions.
- Verify layouts at narrow mobile width, tablet width, and a typical desktop
  viewport.

## Preview

- Provide an Edit/Preview mode toggle on the builder route.
- Render directly from the current draft, even when it is incomplete.
- Show incomplete configuration as author-facing preview warnings rather than
  crashing or pretending the form is valid.
- Support interactive controls for all MVP field types, including drawing and
  clearing a visual signature.
- Store preview answers only in component state. Never call the form or response
  repositories for them.
- Show a persistent “Preview — answers are not saved” notice and a “Reset
  preview” action.
- Clear preview answers when preview closes. If the draft changes while preview
  is open, preserve compatible values and discard values for removed fields or
  incompatible option IDs.
- Do not show Submit, Save response, response validation, or PDF actions.

## Implementation Sequence

Each phase should leave the code buildable and its new behavior tested.

### Phase 1: Test and dependency foundation

- Add Dexie as a runtime dependency.
- Add React Testing Library, DOM Testing Library, `user-event`, jest-dom,
  jsdom, and `fake-indexeddb` as development dependencies.
- Configure Vitest setup and jsdom only for tests that render DOM behavior;
  keep pure domain tests in the Node environment.
- Preserve the existing service-worker tests.

Verification: `pnpm test`, `pnpm lint`, and `pnpm build` pass with a minimal
component smoke test and fake IndexedDB repository smoke test.

### Phase 2: Form domain foundation

- Add versioned package, revision, draft, section, option, and discriminated
  field types.
- Add deterministic ID/clock interfaces and production adapters.
- Add the version-1 migration entry point and future-version rejection.
- Implement draft creation, deep snapshotting, normalization, and dirty
  comparison.

Verification: unit tests cover all field variants, initial draft shape, stable
IDs across revisions, immutable snapshots, and migration boundaries.

### Phase 3: Builder operations and configuration validation

- Implement reducer actions and pure nested operations.
- Implement all duplication and movement ID rules.
- Implement blocking errors and duplicate-label warnings.
- Keep invalid intermediate edits representable.

Verification: table-driven tests cover each operation, all validation pairs,
  fresh IDs throughout duplicated sections, and cross-section field movement.

### Phase 4: Builder persistence

- Add Dexie database version 1 and the repository interface/adapter.
- Implement new-draft persistence, workspace loading, summary listing, and
  transactional revision saving.
- Test failures and rollback behavior with fake IndexedDB.

Verification: repository tests demonstrate reload recovery, multiple-form
  isolation, atomic revision creation, no-op save rejection, and immutable old
  revisions after later edits.

### Phase 5: Routes and minimal form library

- Extract the placeholder home and builder routes from `App.tsx`.
- Add `/builder/new` and `/builder/:formId`.
- Implement loading, not-found, storage-error, and retry states.
- Replace new-form URLs after creation and list local form summaries at home.

Verification: route tests cover create, URL replacement, refresh/reopen,
  missing IDs, and navigating from the home list.

### Phase 6: Editing UI and destructive actions

- Build form, section, field, option, and constraint editors.
- Add all eight field types and the Yes/No preset.
- Add collapsed/expanded field cards and accessible shared controls.
- Add duplication and confirmed deletion dialogs.

Verification: Testing Library workflows edit every configuration category,
  duplicate nested choice fields with fresh IDs, cancel/confirm deletion, and
  prevent field-type conversion.

### Phase 7: Reordering and accessibility

- Integrate `DragDropProvider` and multi-section sortable fields.
- Add keyboard behavior, live announcements, cancellation restore, empty-section
  targets, and non-drag movement controls.

Verification: pure movement tests cover the ordering algorithm; component tests
  cover keyboard/fallback movement and announcements; manually verify pointer
  and touch behavior because jsdom does not model layout-based dragging well.

### Phase 8: Autosave and revision workflow

- Add debounced, serialized autosave and visible status.
- Flush on mode changes and app-owned navigation.
- Wire dirty/valid state and transactional revision saving.
- Show revision metadata without adding history management.

Verification: fake-timer tests cover debounce, write ordering, retry, flushing,
  invalid/no-op saves, and successful revision creation.

### Phase 9: Shared renderer and preview

- Implement controlled renderers for all field types and visual signature.
- Add ephemeral preview state, reset, invalid-draft warnings, and compatibility
  cleanup when the draft changes.
- Confirm preview does not access response or form persistence APIs.

Verification: interaction tests cover every field renderer, “Other,” signature
  clear, reset, mode changes, structural draft edits, and preview isolation.

### Phase 10: Responsive polish and documentation

- Finish mobile/desktop CSS, focus states, touch targets, empty states, and
  error copy.
- Run keyboard-only and screen-reader-oriented checks on builder operations.
- Update `ARCHITECTURE.md`, `CONTEXT-MAP.md`, and feature `CONTEXT.md` files to
  describe implemented behavior and real paths.
- Keep `PLAN.md` unchanged unless implementation reveals an actual product
  decision that supersedes it.

Verification: complete the full quality gate and manual acceptance checklist.

## Test Matrix

### Pure domain

- Initial draft and all field factory shapes.
- Every draft operation without input mutation.
- Fresh IDs for duplicated sections, fields, and options.
- Stable entity IDs across saved revisions.
- All configuration errors and non-blocking warnings.
- Normalized equality and meaningful dirty detection.
- Deep revision snapshot isolation.
- Supported migration and future-version rejection.

### Repository

- Create, update, reload, and list multiple drafts.
- Reload from the latest draft versus current revision.
- Transactional first and later revision saves.
- No revision for invalid or unchanged content.
- Failed transaction rollback.
- Old revisions remain byte-for-byte unchanged after later draft edits.

### Components and workflows

- Create a form and reopen it from home.
- Add and edit all field types.
- Manage choice options and “Other” restrictions.
- Duplicate and delete fields/sections.
- Move fields within and across sections with non-drag controls.
- Keyboard reorder behavior and accessible announcements.
- Autosave states, retry, and recovered draft after remount.
- Save validity, dirty state, and revision metadata.
- Interactive preview and preview-answer isolation.
- Loading, missing-form, and storage-error states.

### Manual checks

- Pointer and touch dragging, including empty destination sections.
- Keyboard-only create/edit/duplicate/delete/reorder/save/preview flow.
- Focus trapping and restoration in confirmation dialogs.
- Signature drawing with mouse, touch, and pen where available.
- Narrow mobile, tablet, and desktop layouts.
- Refresh after edits and after revision creation.
- Offline reload of builder routes after the PWA shell has cached the build.

## Acceptance Criteria

Milestone 2 is complete when:

1. A user can create multiple forms and reopen each one after a full page reload.
2. A new form begins with an empty title, one untitled section, and no fields.
3. Incomplete drafts autosave but cannot be saved as revisions.
4. All eight MVP field types and their agreed settings can be authored.
5. Fields and sections duplicate user-facing content while receiving fresh IDs,
   including fresh nested option IDs.
6. Fields move within and across sections by pointer, touch, keyboard drag, and
   explicit movement controls.
7. Field and section deletion always requires confirmation.
8. A valid changed draft saves as one new immutable revision; an unchanged draft
   does not.
9. Later edits and revisions never mutate earlier stored revisions.
10. Preview reflects the current draft and supports test input without saving or
    submitting answers.
11. The builder remains usable at mobile and desktop widths and supports the
    complete workflow by keyboard.
12. `pnpm test`, `pnpm lint`, and `pnpm build` pass.
13. Architecture and context documents match the implemented modules and
    behavior.

## Risks and Mitigations

- **Milestone boundary expansion:** Pulling IndexedDB forward could absorb all of
  Milestone 3. Keep the repository restricted to form drafts, form packages,
  summaries, and revision transactions.
- **Mutable reference leaks:** Nested objects could accidentally alter old
  revisions. Centralize revision creation as a deep snapshot and test old
  revision immutability after every operation category.
- **Stale autosave races:** Debounced asynchronous writes can finish out of
  order. Serialize writes and test with controllable delayed promises.
- **Cross-list drag complexity:** UI drag events can corrupt ordering or lose a
  field on cancellation. Keep movement as one pure domain operation, retain a
  pre-drag snapshot, and treat dnd-kit as an interaction adapter.
- **Drag accessibility gaps:** Library defaults are only a starting point. Add a
  focusable handle, tailored instructions/live announcements, and explicit
  movement controls.
- **Preview becoming premature Fill Mode:** Keep preview answers in local
  component state and exclude response lifecycle, submission, and answer
  validation.
- **Schema overreach:** Do not design response, export, or conditional-logic
  shapes in this milestone. Preserve extension points through discriminated
  unions and package versioning instead.
- **UI-system distraction:** Use Tailwind as the established styling foundation
  while keeping focused shared controls; do not add shadcn/ui or combine this
  milestone with a general shell redesign.

## Documentation Consulted

Implementation should recheck exact installed-version APIs when each phase
starts. This plan was prepared against:

- React state-management guidance:
  <https://react.dev/learn/managing-state>
- React Router declarative dynamic routes:
  <https://reactrouter.com/start/declarative/routing>
- Dexie versioned stores:
  <https://dexie.org/docs/Version/Version.stores%28%29>
- dnd-kit React quickstart and multi-list sortable state:
  <https://dndkit.com/react/quickstart/> and
  <https://dndkit.com/react/guides/sortable-state-management/>
- dnd-kit sensors and accessibility guidance:
  <https://dndkit.com/react/guides/sensors/> and
  <https://docs.dndkit.com/guides/accessibility>
- React Testing Library and `user-event` setup:
  <https://testing-library.com/docs/react-testing-library/setup/> and
  <https://testing-library.com/docs/user-event/setup/>

# Quik Former Plan

## Goal

Build a PC and mobile-friendly PWA for creating, sharing, filling, and exporting
forms. Users should be able to design forms, save them locally as files, share
temporary fill links, collect responses, and export completed forms as PDF or
another portable format.

## First Real User

The first version should optimize for a single person creating and filling their
own reusable forms on the same device, with optional manual transfer through
exported JSON and PDF files. This keeps the MVP local-first and avoids pulling
temporary sharing, hosted storage, accounts, permissions, and sync into the
initial design.

## Core Use Cases

1. Create a new form with fields like text, textarea, radio buttons,
   checkboxes, select, date, number, and visual signature.
2. Save a form package as a local JSON file.
3. Reopen and edit a saved form file.
4. Fill out a form on desktop or mobile.
5. Export a completed form as PDF.
6. Generate a temporary link so another person can fill the form.
7. Save or download submitted responses.

## MVP Scope

The first version should focus on local-first behavior:

- Form builder.
- Form preview and fill mode.
- Save and load form packages.
- Save many filled responses per form.
- Export a completed response to PDF.
- PWA installability and offline support.
- Responsive layout for desktop and mobile.

Temporary links should be a later phase, because they require backend and
storage decisions.

File uploads and image uploads should also be deferred from the MVP. Generic
file upload should later mean attaching files to a response. Image upload should
later be a separate field type for one or more uploaded images that can be
displayed in the form and rendered into exports such as PDFs.

## Suggested Architecture

### Frontend

- PWA web app.
- Responsive UI.
- IndexedDB as the working library and autosave storage.
- JSON import and export as durable, user-controlled backup and transfer.
- PDF generation in the browser using a PDF library.

### Backend

The backend is optional for the first version, but likely needed for temporary
sharing:

- API for temporary form links.
- Temporary form storage.
- Temporary response storage.
- Expiration dates for shared links.
- Optional access tokens or passwords.

### Data Format

Forms should be represented as versioned JSON packages so they can be saved,
loaded, shared, and migrated later. Form templates and filled responses are
separate first-class objects.

Form, revision, section, field, and response IDs should be generated internally
and hidden from normal users. Users edit labels and content; stable IDs preserve
response compatibility when labels change.

Options for radio button, checkbox, and select fields should also have
generated internal IDs. Answers should store option IDs, while display and
exports render the option labels from the exact revision snapshot.

Use ordinary UI terminology in the builder and fill mode. Radio buttons are
single-choice fields displayed as circles. Checkboxes are multi-choice fields
displayed as squares. Select fields are single-choice dropdowns.

The builder can offer a user-facing "Yes/No" preset, but it should create a
normal radio button field with two predefined options. It should not introduce a
separate boolean field type or separate response behavior in the MVP.

Radio button and checkbox fields should support an optional "Other" write-in
answer when enabled by the form creator. This is part of the MVP. The response
model should explicitly represent both selected option IDs and any write-in
text so validation, PDF rendering, and future CSV export do not need to infer
meaning from labels. Select fields should not support "Other" write-ins in the
MVP; creators should use radio buttons when they need an "Other" option.

Required radio button and select fields require exactly one selected option.
Required checkbox fields require at least one selected option. If "Other" is
enabled, selecting "Other" only satisfies required validation when its write-in
text is non-empty after trimming.

Text and textarea fields should support optional minimum and maximum length
validation in the MVP. Regex or pattern validation should be deferred.

Number fields should support optional minimum and maximum value validation in
the MVP. Step validation should be deferred.

Date fields should support optional earliest and latest date constraints in the
MVP.

Default field values should be deferred from the MVP. They are expected for the
final product, so the schema design should leave room to add defaults later
without changing existing response meaning.

Form edits happen in a mutable draft. Filling always uses an immutable form
revision. When changes are saved, the app creates a new revision so old
responses remain tied to the exact revision they were filled against.
The MVP should not expose deleting individual old revisions. Users may delete a
whole form package with confirmation, but revision deletion risks breaking old
responses and should remain out of scope initially.
When deleting a whole form package, the app should explicitly ask whether to
delete only the form package or delete both the form package and associated
local responses. Responses are self-contained, so they can remain viewable after
the form package is deleted.

Exported form JSON should include all revisions for that form, not only the
current revision.

When importing a form package whose `formId` already exists locally, the app
should ask whether to merge revisions into the existing form, import as a
separate copy, or cancel. MVP merge behavior should be conservative: merge only
when matching revision IDs have identical content or when revisions are new. If
a matching revision ID has different content, block the merge and require
importing as a separate copy.

```json
{
  "formId": "form-id",
  "formatVersion": 1,
  "currentRevisionId": "revision-id",
  "revisions": [
    {
      "id": "revision-id",
      "title": "Example Form",
      "description": "",
      "sections": [
        {
          "id": "section-id",
          "title": "Contact details",
          "description": "",
          "fields": [
            {
              "id": "field-id",
              "type": "text",
              "label": "Full name",
              "required": true
            }
          ]
        }
      ],
      "createdAt": "2026-06-28T00:00:00.000Z"
    }
  ]
}
```

Responses should be stored separately from form packages. Internally, a response
can reference a `formId` and `revisionId`, but exported response JSON should be
self-contained by embedding the exact form revision snapshot. This allows a
response to be viewed and exported even if the original form package is missing.
When importing a response package, the app should group it under the matching
local form if the `formId` and `revisionId` exist. If the matching form or
revision is missing, keep the response as an orphaned/imported response that is
still viewable and exportable from its embedded revision snapshot.
Response imports should deduplicate by `responseId`. If an imported response ID
already exists with identical content, treat it as already present. If the same
ID exists with different content, ask whether to import it as a separate copy
with a new response ID or cancel.
Old responses should always render from their embedded revision snapshot,
including the field labels from that revision. If a later revision renames a
field, historical responses and PDFs still use the old label text.

Each form should support many saved responses. Response lifecycle in the MVP is
`draft` to `submitted`; drafts are editable and submitted responses are
immutable. Corrections can be handled later by duplicating a submitted response
into a new draft.

MVP forms should be organized into simple vertical sections. Conditional logic,
columns, grids, repeatable groups, and advanced layout should be deferred.
Validation in the MVP should be limited to required checks and field-type
checks.

Signature fields in the MVP are visual signature inputs only. They should not
imply identity verification, audit trails, tamper evidence, or legally binding
e-signature guarantees.

## Milestones

### 1. Project Setup

- Choose the frontend stack.
- Add PWA manifest and service worker.
- Set up basic routing: home, builder, fill, and responses/settings.

### 2. Form Builder

- Add fields.
- Add and edit simple vertical sections.
- Edit labels, required state, help text, and options.
- Duplicate fields and sections.
- Reorder fields.
- Delete fields.
- Save builder changes as immutable revisions used by fill mode.
- Preview the form while building.

Duplicated fields and sections should copy user-facing content and settings but
must receive fresh generated IDs, including fresh option IDs for duplicated
choice fields.

Undo and redo should be deferred from the MVP. Instead, builder drafts should
autosave reliably, and destructive actions such as deleting a section should
require confirmation.

### 3. Local Save and Load

- Save forms and responses in IndexedDB.
- Export form packages with all revisions as `.json`.
- Import form packages from `.json`.
- Export self-contained response packages as `.json`.
- Auto-save form and response drafts.

Draft responses should remain local autosaved working state in the MVP and
should not be exportable as JSON. JSON response export should apply to
submitted responses only.

### 4. Fill Mode

- Render a form from an immutable revision.
- Validate required fields and field types.
- Save draft and submitted responses locally.
- Support mobile-friendly input controls.

### 5. Export

- Export completed responses as PDF.
- Consider JSON and CSV export for raw data.
- Include form title, field labels, answers, and timestamp.
- Render from the response plus its exact revision snapshot.

PDF export should use a PDF library, likely `pdf-lib`, rather than browser print
output. MVP PDFs should use a simple structured layout with the form title,
metadata, sections, labels, answers, signature images, and timestamp. Pixel-
perfect recreation of the fill UI or paper form layout should be deferred.
PDFs should include unanswered optional fields as blank entries so the exported
artifact preserves the full form structure.
Only submitted responses should be exportable to PDF in the MVP. Draft response
PDF export should be deferred to avoid ambiguity around partial or invalid
answers.

### 6. PWA Polish

- Offline support.
- Installable app behavior.
- Mobile layout testing.
- Basic empty, error, and loading states.

### 7. Temporary Links

- Add backend or hosted storage.
- Generate shareable fill links.
- Add expiration time.
- Submit responses through shared links.
- Let the form creator download responses.

## Initial Tech Choices

For a small but serious app:

- Frontend: React, Vite, and TypeScript.
- Styling: CSS modules, Tailwind, or the existing preferred setup.
- Local database: IndexedDB via Dexie.
- PDF export: `pdf-lib` or `jspdf`.
- Forms: custom renderer based on the JSON schema.
- Backend later: Express/Fastify, Supabase, Firebase, or a small API with
  SQLite/Postgres.

## Phase 1 Definition of Done

The app is useful when a user can:

- Create a form.
- Organize the form into simple sections.
- Fill it on desktop or phone.
- Save the form locally.
- Reopen it later.
- Save multiple responses for the form.
- Export a completed form as PDF.
- Install and use the app as a PWA.

Temporary sharing can come after that without disturbing the core design.

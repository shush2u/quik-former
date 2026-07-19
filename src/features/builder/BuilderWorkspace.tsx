import {
  DragDropProvider,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/react";
import { isSortableOperation, useSortable } from "@dnd-kit/react/sortable";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { useNavigate } from "react-router";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormRenderer } from "@/components/form/FormRenderer";
import {
  createBuilderReducer,
  initialBuilderState,
  type BuilderAction,
} from "@/features/builder/builderReducer";
import {
  validateDraft,
  validateFieldConfiguration,
  validateSectionConfiguration,
} from "@/features/builder/builderValidation";
import { useDraftAutosave } from "@/features/builder/useDraftAutosave";
import { FieldSettings } from "@/features/builder/components/FieldSettings";
import { browserIdGenerator } from "@/lib/forms/ids";
import { draftMatchesRevision } from "@/lib/forms/revisions";
import type {
  BuilderWorkspace as Workspace,
  FieldType,
  FormField,
  FormSection,
} from "@/lib/forms/schema";
import type { FormRepository } from "@/lib/storage/formRepository";

const FIELD_TYPES: { type: FieldType | "yes-no"; label: string }[] = [
  { type: "text", label: "Short text" },
  { type: "textarea", label: "Long text" },
  { type: "radio", label: "Multiple choice" },
  { type: "checkbox", label: "Checkboxes" },
  { type: "select", label: "Dropdown" },
  { type: "date", label: "Date" },
  { type: "number", label: "Number" },
  { type: "signature", label: "Visual signature" },
  { type: "yes-no", label: "Yes / No preset" },
];

type PendingDelete =
  | { kind: "field"; id: string; name: string }
  | { kind: "section"; id: string; name: string; fieldCount: number }
  | null;

interface BuilderWorkspaceProps {
  workspace: Workspace;
  repository: FormRepository;
}

export function BuilderWorkspace({
  workspace,
  repository,
}: BuilderWorkspaceProps) {
  const navigate = useNavigate();
  const reducer = useMemo(() => createBuilderReducer(browserIdGenerator), []);
  const [state, dispatch] = useReducer(
    reducer,
    workspace.draft,
    initialBuilderState,
  );
  const [formPackage, setFormPackage] = useState(workspace.formPackage);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [saveError, setSaveError] = useState("");
  const autosave = useDraftAutosave(state.draft, repository, () => undefined);
  const flushAutosave = autosave.flush;
  const validation = useMemo(() => validateDraft(state.draft), [state.draft]);
  const firstErrorHref = useMemo(() => {
    const path = validation.errors[0]?.path;
    if (!path || path === "title") return "#form-title";
    const sectionMatch = /^sections\.(\d+)(?:\.fields\.(\d+))?/.exec(path);
    const section = sectionMatch
      ? state.draft.sections[Number(sectionMatch[1])]
      : undefined;
    const field = sectionMatch?.[2]
      ? section?.fields[Number(sectionMatch[2])]
      : undefined;
    return field
      ? path.endsWith(".label")
        ? `#field-${field.id}-label`
        : `#field-${field.id}-settings`
      : section
        ? path.endsWith(".fields")
          ? `#section-${section.id}-add-field`
          : `#section-${section.id}-title`
        : "#form-title";
  }, [state.draft.sections, validation.errors]);
  const currentRevision = formPackage?.revisions.find(
    (revision) => revision.id === formPackage.currentRevisionId,
  );
  const dirty = !draftMatchesRevision(state.draft, currentRevision);

  useEffect(() => {
    const interceptNavigation = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const target = event.target;
      const anchor =
        target instanceof Element
          ? target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search &&
        destination.hash
      )
        return;
      event.preventDefault();
      void flushAutosave().then((saved) => {
        if (saved)
          navigate(
            `${destination.pathname}${destination.search}${destination.hash}`,
          );
      });
    };
    document.addEventListener("click", interceptNavigation, true);
    return () =>
      document.removeEventListener("click", interceptNavigation, true);
  }, [flushAutosave, navigate]);

  useEffect(() => {
    dispatch({
      type: "reconcilePreviewAnswers",
      fields: state.draft.sections.flatMap((section) => section.fields),
    });
  }, [state.draft]);

  const changeMode = async (mode: "edit" | "preview") => {
    if (await autosave.flush()) dispatch({ type: "setMode", mode });
  };

  const saveRevision = async () => {
    setSaveError("");
    try {
      if (!(await autosave.flush())) return;
      const saved = await repository.saveRevision(state.draft);
      setFormPackage(saved.formPackage);
      dispatch({ type: "replaceWorkspace", draft: saved.draft });
    } catch (reason) {
      setSaveError(
        reason instanceof Error
          ? reason.message
          : "Revision could not be saved.",
      );
    }
  };

  const focusFirstError = () => {
    const path = validation.errors[0]?.path ?? "";
    const fieldMatch = /^sections\.(\d+)\.fields\.(\d+)/.exec(path);
    if (fieldMatch) {
      const field =
        state.draft.sections[Number(fieldMatch[1])]?.fields[
          Number(fieldMatch[2])
        ];
      if (field) dispatch({ type: "expandField", fieldId: field.id });
    }
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(firstErrorHref)?.focus();
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (event.canceled) {
      dispatch({ type: "announce", message: "Field movement cancelled." });
      return;
    }
    const sourceId = String(event.operation.source?.id ?? "");
    const target = event.operation.target;
    if (!sourceId || !target) return;
    let sectionId = "";
    let index = 0;
    if (isSortableOperation(event.operation)) {
      sectionId = String(event.operation.target?.group ?? "");
      index = event.operation.target?.index ?? 0;
    } else {
      const data = target.data as { sectionId?: string } | undefined;
      sectionId = data?.sectionId ?? "";
      const section = state.draft.sections.find(
        (item) => item.id === sectionId,
      );
      index = section?.fields.length ?? 0;
    }
    if (!sectionId) return;
    dispatch({
      type: "moveField",
      fieldId: sourceId,
      sectionId,
      index,
      announcement: `Moved ${state.draft.sections.flatMap((section) => section.fields).find((field) => field.id === sourceId)?.label || "field"} to ${state.draft.sections.find((section) => section.id === sectionId)?.title || "untitled section"}, position ${index + 1}.`,
    });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    dispatch(
      pendingDelete.kind === "field"
        ? { type: "deleteField", fieldId: pendingDelete.id }
        : { type: "deleteSection", sectionId: pendingDelete.id },
    );
    setPendingDelete(null);
  };

  return (
    <div className="builder-workspace">
      <div className="builder-toolbar">
        <button
          type="button"
          className="text-button"
          onClick={() =>
            void autosave.flush().then((saved) => saved && navigate("/"))
          }
        >
          ← Forms
        </button>
        <div className="mode-toggle" aria-label="Builder mode">
          <button
            type="button"
            aria-pressed={state.mode === "edit"}
            onClick={() => void changeMode("edit")}
          >
            Edit
          </button>
          <button
            type="button"
            aria-pressed={state.mode === "preview"}
            onClick={() => void changeMode("preview")}
          >
            Preview
          </button>
        </div>
      </div>

      {state.mode === "preview" ? (
        <section className="preview-surface" aria-label="Form preview">
          <div className="preview-notice">
            <strong>Preview — answers are not saved</strong>
            <button
              type="button"
              className="secondary-button"
              onClick={() => dispatch({ type: "resetPreview" })}
            >
              Reset preview
            </button>
          </div>
          {validation.errors.length > 0 && (
            <p className="author-warning">
              This draft has {validation.errors.length} configuration issue
              {validation.errors.length === 1 ? "" : "s"}. Preview remains
              available.
            </p>
          )}
          <FormRenderer
            form={state.draft}
            answers={state.previewAnswers}
            onAnswer={(fieldId, value) =>
              dispatch({ type: "setPreviewAnswer", fieldId, value })
            }
          />
        </section>
      ) : (
        <DragDropProvider
          onDragStart={(event) =>
            dispatch({
              type: "announce",
              message: `Picked up ${state.draft.sections.flatMap((section) => section.fields).find((field) => field.id === String(event.operation.source?.id ?? ""))?.label || "untitled field"}.`,
            })
          }
          onDragOver={(event) => {
            const target = event.operation
              .target as typeof event.operation.target & {
              group?: string | number;
              index?: number;
              data?: { sectionId?: string };
            };
            const sectionId = String(
              target?.data?.sectionId ?? target?.group ?? "",
            );
            const section = state.draft.sections.find(
              (item) => item.id === sectionId,
            );
            dispatch({
              type: "announce",
              message: target
                ? `Over ${section?.title || "untitled section"}, position ${(target.index ?? section?.fields.length ?? 0) + 1}.`
                : "Field is not over a destination.",
            });
          }}
          onDragEnd={handleDragEnd}
        >
          <main className="builder-editor">
            <section
              className="form-metadata card"
              aria-labelledby="form-details-title"
            >
              <p className="eyebrow">Form builder</p>
              <label>
                Form title
                <input
                  id="form-title"
                  aria-label="Form title"
                  aria-invalid={!state.draft.title.trim()}
                  aria-describedby={
                    !state.draft.title.trim() ? "form-title-error" : undefined
                  }
                  value={state.draft.title}
                  onChange={(event) =>
                    dispatch({ type: "updateForm", title: event.target.value })
                  }
                />
                {!state.draft.title.trim() && (
                  <span id="form-title-error" className="inline-error">
                    Form title is required.
                  </span>
                )}
              </label>
              <label>
                Description <span className="optional">Optional</span>
                <textarea
                  value={state.draft.description}
                  onChange={(event) =>
                    dispatch({
                      type: "updateForm",
                      description: event.target.value,
                    })
                  }
                />
              </label>
            </section>

            <div className="section-list">
              {state.draft.sections.map((section, sectionIndex) => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  sectionIndex={sectionIndex}
                  sections={state.draft.sections}
                  expandedFieldId={state.expandedFieldId}
                  dispatch={dispatch}
                  requestDelete={setPendingDelete}
                />
              ))}
            </div>
            <button
              type="button"
              className="secondary-button add-section"
              onClick={() => dispatch({ type: "addSection" })}
            >
              + Add section
            </button>
          </main>
        </DragDropProvider>
      )}

      <aside className="save-panel" aria-label="Revision status">
        <div>
          <strong>Revision {formPackage?.revisions.length ?? 0}</strong>
          <span>
            {currentRevision
              ? `Saved ${new Date(currentRevision.createdAt).toLocaleString()}`
              : "No revision saved yet"}
          </span>
        </div>
        <div>
          <strong>
            {dirty
              ? "Draft has unsaved changes"
              : "Draft matches latest revision"}
          </strong>
          <span aria-live="polite">
            {autosave.status === "saving"
              ? "Saving…"
              : autosave.status === "saved"
                ? "Draft saved"
                : autosave.status === "error"
                  ? `Autosave error: ${autosave.message}`
                  : "Draft loaded"}
          </span>
          {autosave.status === "error" && (
            <button
              type="button"
              className="text-button"
              onClick={autosave.retry}
            >
              Retry autosave
            </button>
          )}
        </div>
        {validation.errors.length > 0 && (
          <button
            type="button"
            className="validation-summary"
            onClick={focusFirstError}
          >
            Resolve {validation.errors.length} issue
            {validation.errors.length === 1 ? "" : "s"} before saving a
            revision.
          </button>
        )}
        {saveError && <p className="error-message">{saveError}</p>}
        <button
          type="button"
          className="primary-button"
          disabled={
            !dirty ||
            validation.errors.length > 0 ||
            autosave.status === "saving"
          }
          onClick={() => void saveRevision()}
        >
          Save revision
        </button>
      </aside>
      <div className="visually-hidden" aria-live="assertive">
        {state.announcement}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={
          pendingDelete?.kind === "section"
            ? "Delete section?"
            : "Delete field?"
        }
        onCancel={useCallback(() => setPendingDelete(null), [])}
        onConfirm={confirmDelete}
      >
        {pendingDelete?.kind === "section" ? (
          <p>
            “{pendingDelete.name || "Untitled section"}” and its{" "}
            {pendingDelete.fieldCount} field
            {pendingDelete.fieldCount === 1 ? "" : "s"} will be deleted.
          </p>
        ) : (
          <p>“{pendingDelete?.name || "Untitled field"}” will be deleted.</p>
        )}
      </ConfirmDialog>
    </div>
  );
}

interface SectionEditorProps {
  section: FormSection;
  sectionIndex: number;
  sections: FormSection[];
  expandedFieldId: string | null;
  dispatch: React.Dispatch<BuilderAction>;
  requestDelete(value: PendingDelete): void;
}

function SectionEditor({
  section,
  sectionIndex,
  sections,
  expandedFieldId,
  dispatch,
  requestDelete,
}: SectionEditorProps) {
  const sectionValidation = validateSectionConfiguration(section);
  const emptySectionError = sectionValidation.errors.find((issue) =>
    issue.path.endsWith(".fields"),
  );
  const { ref, isDropTarget } = useDroppable({
    id: `section-${section.id}`,
    accept: "field",
    data: { sectionId: section.id },
  });
  return (
    <section
      className={`section-card card ${isDropTarget ? "drop-target" : ""}`}
      aria-labelledby={`section-${section.id}-title`}
    >
      <div className="section-heading">
        <span className="section-number">Section {sectionIndex + 1}</span>
        <div className="card-actions">
          <button
            type="button"
            className="text-button"
            onClick={() =>
              dispatch({ type: "duplicateSection", sectionId: section.id })
            }
          >
            Duplicate
          </button>
          <button
            type="button"
            className="text-button danger-text"
            onClick={() =>
              requestDelete({
                kind: "section",
                id: section.id,
                name: section.title,
                fieldCount: section.fields.length,
              })
            }
          >
            Delete
          </button>
        </div>
      </div>
      <label>
        Section title
        <input
          id={`section-${section.id}-title`}
          aria-label="Section title"
          aria-invalid={!section.title.trim()}
          value={section.title}
          onChange={(event) =>
            dispatch({
              type: "updateSection",
              sectionId: section.id,
              title: event.target.value,
            })
          }
        />
        {!section.title.trim() && (
          <span className="inline-error">Section title is required.</span>
        )}
      </label>
      <label>
        Description <span className="optional">Optional</span>
        <textarea
          value={section.description}
          onChange={(event) =>
            dispatch({
              type: "updateSection",
              sectionId: section.id,
              description: event.target.value,
            })
          }
        />
      </label>
      <div
        ref={ref}
        className="field-list"
        aria-label={`Fields in ${section.title || "untitled section"}`}
        aria-describedby={
          emptySectionError ? `section-${section.id}-fields-error` : undefined
        }
      >
        {section.fields.length === 0 && (
          <p className="empty-drop-zone">
            No fields yet. Add one or move a field here.
          </p>
        )}
        {section.fields.map((field, fieldIndex) => (
          <FieldEditor
            key={field.id}
            field={field}
            index={fieldIndex}
            section={section}
            sections={sections}
            expanded={expandedFieldId === field.id}
            dispatch={dispatch}
            requestDelete={requestDelete}
          />
        ))}
      </div>
      {emptySectionError && (
        <p
          id={`section-${section.id}-fields-error`}
          className="inline-error"
          role="alert"
        >
          {emptySectionError.message}
        </p>
      )}
      <details className="field-chooser">
        <summary id={`section-${section.id}-add-field`}>+ Add field</summary>
        <div className="field-type-grid">
          {FIELD_TYPES.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={(event) => {
                dispatch({
                  type: "addField",
                  sectionId: section.id,
                  fieldType: item.type,
                });
                event.currentTarget.closest("details")?.removeAttribute("open");
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </details>
    </section>
  );
}

interface FieldEditorProps {
  field: FormField;
  index: number;
  section: FormSection;
  sections: FormSection[];
  expanded: boolean;
  dispatch: React.Dispatch<BuilderAction>;
  requestDelete(value: PendingDelete): void;
}

function FieldEditor({
  field,
  index,
  section,
  sections,
  expanded,
  dispatch,
  requestDelete,
}: FieldEditorProps) {
  const fieldValidation = validateFieldConfiguration(field);
  const labelError = fieldValidation.errors.find((issue) =>
    issue.path.endsWith(".label"),
  );
  const { ref, handleRef, isDragging } = useSortable({
    id: field.id,
    index,
    group: section.id,
    type: "field",
    accept: "field",
  });
  const sourceIndex = section.fields.findIndex((item) => item.id === field.id);
  const move = (
    targetSectionId: string,
    targetIndex: number,
    description: string,
  ) =>
    dispatch({
      type: "moveField",
      fieldId: field.id,
      sectionId: targetSectionId,
      index: targetIndex,
      announcement: description,
    });
  return (
    <article ref={ref} className={`field-card ${isDragging ? "dragging" : ""}`}>
      <div className="field-summary">
        <button
          ref={handleRef}
          type="button"
          className="drag-handle"
          aria-label={`Drag ${field.label || "untitled field"}`}
        >
          ↕
        </button>
        <button
          type="button"
          className="field-expand"
          aria-expanded={expanded}
          onClick={() =>
            dispatch({
              type: "expandField",
              fieldId: expanded ? null : field.id,
            })
          }
        >
          <strong>{field.label || "Untitled field"}</strong>
          <span>
            {field.type} {field.required ? "• Required" : ""}
          </span>
        </button>
        <div className="card-actions">
          <button
            type="button"
            className="text-button"
            onClick={() =>
              dispatch({ type: "duplicateField", fieldId: field.id })
            }
          >
            Duplicate
          </button>
          <button
            type="button"
            className="text-button danger-text"
            onClick={() =>
              requestDelete({ kind: "field", id: field.id, name: field.label })
            }
          >
            Delete
          </button>
        </div>
      </div>
      {expanded && (
        <div className="field-editor">
          <p className="field-type-label">
            Type: {field.type} <span>Type cannot be changed</span>
          </p>
          <label>
            Field label
            <input
              id={`field-${field.id}-label`}
              aria-label="Field label"
              aria-invalid={Boolean(labelError)}
              value={field.label}
              onChange={(event) =>
                dispatch({
                  type: "updateField",
                  fieldId: field.id,
                  changes: { label: event.target.value },
                })
              }
            />
            {labelError && (
              <span className="inline-error">{labelError.message}</span>
            )}
          </label>
          <label>
            Help text <span className="optional">Optional</span>
            <textarea
              value={field.helpText}
              onChange={(event) =>
                dispatch({
                  type: "updateField",
                  fieldId: field.id,
                  changes: { helpText: event.target.value },
                })
              }
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(event) =>
                dispatch({
                  type: "updateField",
                  fieldId: field.id,
                  changes: { required: event.target.checked },
                })
              }
            />
            Required
          </label>
          <div id={`field-${field.id}-settings`} tabIndex={-1}>
            <FieldSettings field={field} dispatch={dispatch} />
          </div>
          <div className="move-controls">
            <span>Move field</span>
            <button
              type="button"
              disabled={sourceIndex === 0}
              onClick={() =>
                move(section.id, sourceIndex - 1, `Moved ${field.label} up.`)
              }
            >
              Move up
            </button>
            <button
              type="button"
              disabled={sourceIndex === section.fields.length - 1}
              onClick={() =>
                move(section.id, sourceIndex + 1, `Moved ${field.label} down.`)
              }
            >
              Move down
            </button>
            <label>
              Move to section
              <select
                value={section.id}
                onChange={(event) =>
                  move(
                    event.target.value,
                    sections.find((item) => item.id === event.target.value)
                      ?.fields.length ?? 0,
                    `Moved ${field.label} to another section.`,
                  )
                }
              >
                {sections.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title || "Untitled section"}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}
    </article>
  );
}

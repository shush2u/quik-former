import {
  addField,
  addOption,
  addSection,
  createField,
  createYesNoField,
  deleteField,
  deleteOption,
  deleteSection,
  duplicateField,
  duplicateSection,
  moveField,
  reorderOption,
  updateField,
  updateOption,
  updateSection,
} from "@/features/builder/builderOperations";
import type { IdGenerator } from "@/lib/forms/ids";
import type { FieldType, FormDraft, FormField } from "@/lib/forms/schema";
import type { FormAnswer } from "@/components/form/FormRenderer";

export interface BuilderState {
  draft: FormDraft;
  expandedFieldId: string | null;
  mode: "edit" | "preview";
  previewAnswers: Record<string, FormAnswer>;
  announcement: string;
}

export type BuilderAction =
  | { type: "updateForm"; title?: string; description?: string }
  | { type: "addSection" }
  | { type: "updateSection"; sectionId: string; title?: string; description?: string }
  | { type: "duplicateSection"; sectionId: string }
  | { type: "deleteSection"; sectionId: string }
  | { type: "addField"; sectionId: string; fieldType: FieldType | "yes-no" }
  | { type: "updateField"; fieldId: string; changes: Partial<FormField> }
  | { type: "duplicateField"; fieldId: string }
  | { type: "deleteField"; fieldId: string }
  | { type: "moveField"; fieldId: string; sectionId: string; index: number; announcement?: string }
  | { type: "addOption"; fieldId: string }
  | { type: "updateOption"; fieldId: string; optionId: string; label: string }
  | { type: "deleteOption"; fieldId: string; optionId: string }
  | { type: "reorderOption"; fieldId: string; optionId: string; direction: -1 | 1 }
  | { type: "expandField"; fieldId: string | null }
  | { type: "setMode"; mode: "edit" | "preview" }
  | { type: "setPreviewAnswer"; fieldId: string; value: FormAnswer }
  | { type: "reconcilePreviewAnswers"; fields: FormField[] }
  | { type: "resetPreview" }
  | { type: "replaceWorkspace"; draft: FormDraft }
  | { type: "announce"; message: string };

export function initialBuilderState(draft: FormDraft): BuilderState {
  return {
    draft,
    expandedFieldId: null,
    mode: "edit",
    previewAnswers: {},
    announcement: "",
  };
}

export function createBuilderReducer(ids: IdGenerator) {
  return (state: BuilderState, action: BuilderAction): BuilderState => {
    let draft = state.draft;
    switch (action.type) {
      case "updateForm":
        draft = {
          ...draft,
          ...(action.title !== undefined ? { title: action.title } : {}),
          ...(action.description !== undefined
            ? { description: action.description }
            : {}),
        };
        break;
      case "addSection":
        draft = addSection(draft, ids);
        break;
      case "updateSection":
        draft = updateSection(draft, action.sectionId, {
          ...(action.title !== undefined ? { title: action.title } : {}),
          ...(action.description !== undefined
            ? { description: action.description }
            : {}),
        });
        break;
      case "duplicateSection":
        draft = duplicateSection(draft, action.sectionId, ids);
        break;
      case "deleteSection":
        draft = deleteSection(draft, action.sectionId);
        break;
      case "addField": {
        const field = action.fieldType === "yes-no"
          ? createYesNoField(ids)
          : createField(action.fieldType, ids);
        draft = addField(draft, action.sectionId, field);
        return { ...state, draft, expandedFieldId: field.id };
      }
      case "updateField":
        draft = updateField(draft, action.fieldId, action.changes);
        break;
      case "duplicateField":
        draft = duplicateField(draft, action.fieldId, ids);
        break;
      case "deleteField":
        draft = deleteField(draft, action.fieldId);
        break;
      case "moveField":
        draft = moveField(draft, action.fieldId, action.sectionId, action.index);
        break;
      case "addOption":
        draft = addOption(draft, action.fieldId, ids);
        break;
      case "updateOption":
        draft = updateOption(draft, action.fieldId, action.optionId, action.label);
        break;
      case "deleteOption":
        draft = deleteOption(draft, action.fieldId, action.optionId);
        break;
      case "reorderOption":
        draft = reorderOption(draft, action.fieldId, action.optionId, action.direction);
        break;
      case "expandField":
        return { ...state, expandedFieldId: action.fieldId };
      case "setMode":
        return {
          ...state,
          mode: action.mode,
          previewAnswers: action.mode === "edit" ? {} : state.previewAnswers,
        };
      case "setPreviewAnswer":
        return {
          ...state,
          previewAnswers: { ...state.previewAnswers, [action.fieldId]: action.value },
        };
      case "reconcilePreviewAnswers": {
        const fields = new Map(action.fields.map((field) => [field.id, field]));
        const previewAnswers: Record<string, FormAnswer> = {};
        for (const [fieldId, answer] of Object.entries(state.previewAnswers)) {
          const field = fields.get(fieldId);
          if (!field) continue;
          if (field.type === "radio" || field.type === "select") {
            if (
              typeof answer === "string" &&
              ((field.type === "radio" &&
                field.allowOther &&
                answer.startsWith("other:")) ||
                field.options.some((option) => option.id === answer))
            ) previewAnswers[fieldId] = answer;
            continue;
          }
          if (field.type === "checkbox") {
            if (Array.isArray(answer)) {
              previewAnswers[fieldId] = answer.filter(
                (value) =>
                  field.options.some((option) => option.id === value) ||
                  (field.allowOther && value.startsWith("other:")),
              );
            }
            continue;
          }
          if (typeof answer === "string") previewAnswers[fieldId] = answer;
        }
        return { ...state, previewAnswers };
      }
      case "resetPreview":
        return { ...state, previewAnswers: {} };
      case "replaceWorkspace":
        return { ...state, draft: action.draft };
      case "announce":
        return { ...state, announcement: action.message };
    }
    return {
      ...state,
      draft,
      announcement: "announcement" in action && action.announcement
        ? action.announcement
        : state.announcement,
    };
  };
}

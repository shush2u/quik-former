import { describe, expect, it } from "vitest";
import {
  createBuilderReducer,
  initialBuilderState,
} from "@/features/builder/builderReducer";
import type { FormDraft, FormField } from "@/lib/forms/schema";

const draft: FormDraft = {
  formId: "form",
  baseRevisionId: null,
  title: "Form",
  description: "",
  updatedAt: "time",
  sections: [{ id: "section", title: "Section", description: "", fields: [] }],
};

describe("builder preview state", () => {
  it("preserves compatible answers and removes deleted fields and option IDs", () => {
    const reducer = createBuilderReducer({ generate: () => "unused" });
    let state = initialBuilderState(draft);
    state = reducer(state, { type: "setPreviewAnswer", fieldId: "radio", value: "removed" });
    state = reducer(state, { type: "setPreviewAnswer", fieldId: "checkbox", value: ["kept", "removed"] });
    state = reducer(state, { type: "setPreviewAnswer", fieldId: "deleted", value: "text" });
    const fields: FormField[] = [
      { id: "radio", type: "radio", label: "Radio", helpText: "", required: false, allowOther: false, options: [{ id: "kept", label: "Kept" }, { id: "other", label: "Other" }] },
      { id: "checkbox", type: "checkbox", label: "Checks", helpText: "", required: false, allowOther: false, options: [{ id: "kept", label: "Kept" }, { id: "other", label: "Other" }] },
    ];

    state = reducer(state, { type: "reconcilePreviewAnswers", fields });

    expect(state.previewAnswers).toEqual({ checkbox: ["kept"] });
  });
});

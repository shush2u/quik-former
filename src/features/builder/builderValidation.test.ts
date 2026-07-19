import { describe, expect, it } from "vitest";
import { validateDraft } from "@/features/builder/builderValidation";
import type { FormDraft } from "@/lib/forms/schema";

function draft(): FormDraft {
  return {
    formId: "form",
    baseRevisionId: null,
    title: "Survey",
    description: "",
    updatedAt: "2026-07-19T10:00:00.000Z",
    sections: [
      {
        id: "section",
        title: "Basics",
        description: "",
        fields: [
          {
            id: "field",
            type: "radio",
            label: "Choose",
            helpText: "",
            required: false,
            allowOther: false,
            options: [
              { id: "one", label: "Same" },
              { id: "two", label: "Same" },
            ],
          },
        ],
      },
    ],
  };
}

describe("builder configuration validation", () => {
  it("allows duplicate option labels but warns the author", () => {
    const result = validateDraft(draft());
    expect(result.errors).toEqual([]);
    expect(result.warnings[0]?.message).toMatch(/duplicate option labels/i);
  });

  it("reports blank structure, invalid ranges, and duplicate IDs", () => {
    const value = draft();
    value.title = " ";
    value.sections[0].title = "";
    value.sections[0].fields.push({
      id: "field",
      type: "text",
      label: "",
      helpText: "",
      required: false,
      minLength: 5,
      maxLength: 2,
    });

    const messages = validateDraft(value).errors.map((error) => error.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        "Form title is required.",
        "Section title is required.",
        "Field label is required.",
        "Minimum length cannot exceed maximum length.",
        "Field IDs must be unique.",
      ]),
    );
  });
});

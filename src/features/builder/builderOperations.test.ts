import { describe, expect, it } from "vitest";
import {
  addField,
  createField,
  duplicateSection,
  moveField,
} from "@/features/builder/builderOperations";
import { createInitialDraft } from "@/lib/forms/revisions";

function makeIds() {
  let value = 0;
  return { generate: () => `id-${++value}` };
}
const clock = { now: () => "2026-07-19T10:00:00.000Z" };

describe("builder operations", () => {
  it("creates every supported field with type-safe defaults", () => {
    const ids = makeIds();
    const types = [
      "text",
      "textarea",
      "radio",
      "checkbox",
      "select",
      "date",
      "number",
      "signature",
    ] as const;

    expect(types.map((type) => createField(type, ids).type)).toEqual(types);
    expect(createField("radio", ids)).toMatchObject({
      type: "radio",
      allowOther: false,
      options: [{ label: "Option 1" }, { label: "Option 2" }],
    });
  });

  it("duplicates nested content with fresh IDs without changing the source", () => {
    const ids = makeIds();
    const original = addField(
      createInitialDraft(ids, clock),
      "id-2",
      createField("radio", ids),
    );
    const duplicated = duplicateSection(original, "id-2", ids);

    expect(duplicated.sections).toHaveLength(2);
    expect(duplicated.sections[1]).toMatchObject({
      title: original.sections[0].title,
      fields: [{ label: original.sections[0].fields[0]?.label }],
    });
    expect(duplicated.sections[1].id).not.toBe(original.sections[0].id);
    expect(duplicated.sections[1].fields[0]?.id).not.toBe(
      original.sections[0].fields[0]?.id,
    );
    expect(
      "options" in duplicated.sections[1].fields[0] &&
        duplicated.sections[1].fields[0].options[0]?.id,
    ).not.toBe(
      "options" in original.sections[0].fields[0] &&
        original.sections[0].fields[0].options[0]?.id,
    );
    expect(original.sections).toHaveLength(1);
  });

  it("moves fields across sections, including into an empty section", () => {
    const ids = makeIds();
    const original = addField(
      createInitialDraft(ids, clock),
      "id-2",
      createField("text", ids),
    );
    const withTarget = {
      ...original,
      sections: [
        ...original.sections,
        { id: "target", title: "Target", description: "", fields: [] },
      ],
    };
    const moved = moveField(
      withTarget,
      original.sections[0].fields[0].id,
      "target",
      0,
    );

    expect(moved.sections[0].fields).toEqual([]);
    expect(moved.sections[1].fields[0]?.id).toBe(
      original.sections[0].fields[0].id,
    );
  });

  it("uses the projected final index when moving down within a section", () => {
    const ids = makeIds();
    let draft = createInitialDraft(ids, clock);
    draft = addField(draft, "id-2", createField("text", ids));
    draft = addField(draft, "id-2", createField("number", ids));
    const firstId = draft.sections[0].fields[0].id;

    const moved = moveField(draft, firstId, "id-2", 1);

    expect(moved.sections[0].fields.map((field) => field.id)).toEqual([
      draft.sections[0].fields[1].id,
      firstId,
    ]);
  });
});

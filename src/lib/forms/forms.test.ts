import { describe, expect, it } from "vitest";
import {
  createInitialDraft,
  draftMatchesRevision,
  snapshotRevision,
} from "@/lib/forms/revisions";
import { migrateFormPackage } from "@/lib/forms/migrations";

function makeIds() {
  let value = 0;
  return { generate: () => `id-${++value}` };
}
const clock = { now: () => "2026-07-19T10:00:00.000Z" };

describe("form drafts", () => {
  it("creates a persisted-ready empty form with one untitled section", () => {
    expect(createInitialDraft(makeIds(), clock)).toEqual({
      formId: "id-1",
      baseRevisionId: null,
      title: "",
      description: "",
      sections: [{ id: "id-2", title: "", description: "", fields: [] }],
      updatedAt: "2026-07-19T10:00:00.000Z",
    });
  });

  it("takes deep immutable snapshots while keeping entity IDs stable", () => {
    const ids = makeIds();
    const draft = createInitialDraft(ids, clock);
    draft.sections[0].fields.push({
      id: ids.generate(),
      type: "text",
      label: "Short answer",
      helpText: "",
      required: false,
    });
    draft.title = "Snapshot";
    const revision = snapshotRevision(draft, ids, clock);
    draft.sections[0].fields[0].label = "Changed later";

    expect(revision.sections[0].id).toBe(draft.sections[0].id);
    expect(revision.sections[0].fields[0].label).toBe("Short answer");
    expect(draftMatchesRevision(draft, revision)).toBe(false);
  });

  it("routes package reads through a migration boundary and rejects future formats", () => {
    const packageValue = {
      formId: "form",
      formatVersion: 1,
      currentRevisionId: null,
      revisions: [],
    };
    expect(migrateFormPackage(packageValue)).toEqual(packageValue);
    expect(() => migrateFormPackage({ ...packageValue, formatVersion: 2 })).toThrow(
      /unsupported form package version/i,
    );
  });
});

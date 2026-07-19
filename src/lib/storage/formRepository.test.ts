import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { QuikFormerDatabase } from "@/lib/storage/database";
import { DexieFormRepository } from "@/lib/storage/formRepository";
import type { Clock, IdGenerator } from "@/lib/forms/ids";
import { addField, createField } from "@/features/builder/builderOperations";
import {
  RevisionValidationError,
  UnchangedRevisionError,
} from "@/lib/storage/formRepository";

function dependencies(): { ids: IdGenerator; clock: Clock } {
  let id = 0;
  let time = 0;
  return {
    ids: { generate: () => `id-${++id}` },
    clock: { now: () => `2026-07-19T10:00:0${time++}.000Z` },
  };
}

const databases: QuikFormerDatabase[] = [];

afterEach(async () => {
  await Promise.all(databases.map((database) => database.delete()));
  databases.length = 0;
});

describe("form repository", () => {
  it("creates, reloads, and lists isolated mutable drafts", async () => {
    const database = new QuikFormerDatabase(`test-${crypto.randomUUID()}`);
    databases.push(database);
    const repository = new DexieFormRepository(database, dependencies());
    const first = await repository.createFormDraft();
    const second = await repository.createFormDraft();
    first.title = "First form";
    await repository.putDraft(first);

    expect((await repository.getBuilderWorkspace(first.formId))?.draft.title).toBe("First form");
    expect((await repository.getBuilderWorkspace(second.formId))?.draft.title).toBe("");
    expect(await repository.listFormSummaries()).toHaveLength(2);
  });

  it("creates immutable revisions atomically and rejects unchanged content", async () => {
    const database = new QuikFormerDatabase(`test-${crypto.randomUUID()}`);
    databases.push(database);
    const deps = dependencies();
    const repository = new DexieFormRepository(database, deps);
    let draft = await repository.createFormDraft();
    draft.title = "Survey";
    draft.sections[0].title = "Details";
    draft = addField(draft, draft.sections[0].id, createField("text", deps.ids));

    const first = await repository.saveRevision(draft);
    await expect(repository.saveRevision(first.draft)).rejects.toBeInstanceOf(
      UnchangedRevisionError,
    );
    first.draft.title = "Updated survey";
    const second = await repository.saveRevision(first.draft);

    expect(second.formPackage?.revisions).toHaveLength(2);
    expect(second.formPackage?.revisions[0].title).toBe("Survey");
    expect(second.formPackage?.revisions[1].title).toBe("Updated survey");
  });

  it("rolls back revision creation when configuration is invalid", async () => {
    const database = new QuikFormerDatabase(`test-${crypto.randomUUID()}`);
    databases.push(database);
    const repository = new DexieFormRepository(database, dependencies());
    const draft = await repository.createFormDraft();

    await expect(repository.saveRevision(draft)).rejects.toBeInstanceOf(
      RevisionValidationError,
    );
    expect((await repository.getBuilderWorkspace(draft.formId))?.formPackage).toBeNull();
  });

  it("rolls back the draft and package when a revision write fails", async () => {
    const database = new QuikFormerDatabase(`test-${crypto.randomUUID()}`);
    databases.push(database);
    const deps = dependencies();
    const repository = new DexieFormRepository(database, deps);
    let draft = await repository.createFormDraft();
    draft = {
      ...draft,
      title: "Valid survey",
      sections: [{ ...draft.sections[0], title: "Details", fields: [createField("text", deps.ids)] }],
    };
    database.formPackages.hook("creating", () => {
      throw new Error("simulated write failure");
    });

    await expect(repository.saveRevision(draft)).rejects.toThrow("simulated write failure");
    const reloaded = await repository.getBuilderWorkspace(draft.formId);
    expect(reloaded?.draft.title).toBe("");
    expect(reloaded?.formPackage).toBeNull();
  });
});

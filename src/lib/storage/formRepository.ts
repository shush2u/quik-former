import { validateDraft } from "@/features/builder/builderValidation";
import type { Clock, IdGenerator } from "@/lib/forms/ids";
import { migrateFormPackage } from "@/lib/forms/migrations";
import {
  createEmptyPackage,
  createInitialDraft,
  draftFromRevision,
  draftMatchesRevision,
  snapshotRevision,
} from "@/lib/forms/revisions";
import type {
  BuilderWorkspace,
  FormDraft,
  FormSummary,
} from "@/lib/forms/schema";
import type { QuikFormerDatabase } from "@/lib/storage/database";

export interface FormRepository {
  createFormDraft(): Promise<FormDraft>;
  getBuilderWorkspace(formId: string): Promise<BuilderWorkspace | null>;
  listFormSummaries(): Promise<FormSummary[]>;
  putDraft(draft: FormDraft): Promise<FormDraft>;
  saveRevision(draft: FormDraft): Promise<BuilderWorkspace>;
}

export class RevisionValidationError extends Error {}
export class UnchangedRevisionError extends Error {}

export class DexieFormRepository implements FormRepository {
  private readonly database: QuikFormerDatabase;
  private readonly dependencies: { ids: IdGenerator; clock: Clock };

  constructor(
    database: QuikFormerDatabase,
    dependencies: { ids: IdGenerator; clock: Clock },
  ) {
    this.database = database;
    this.dependencies = dependencies;
  }

  async createFormDraft(): Promise<FormDraft> {
    const draft = createInitialDraft(this.dependencies.ids, this.dependencies.clock);
    const stored = structuredClone(draft);
    await this.database.formDrafts.add({
      formId: draft.formId,
      createdAt: draft.updatedAt,
      updatedAt: draft.updatedAt,
      draft: stored,
    });
    return structuredClone(stored);
  }

  async getBuilderWorkspace(formId: string): Promise<BuilderWorkspace | null> {
    const [draftRecord, packageRecord] = await Promise.all([
      this.database.formDrafts.get(formId),
      this.database.formPackages.get(formId),
    ]);
    const formPackage = packageRecord
      ? migrateFormPackage(packageRecord.formPackage)
      : null;
    if (
      draftRecord &&
      (!packageRecord || draftRecord.updatedAt >= packageRecord.updatedAt)
    ) {
      return { draft: structuredClone(draftRecord.draft), formPackage };
    }
    if (formPackage?.currentRevisionId) {
      const revision = formPackage.revisions.find(
        (item) => item.id === formPackage.currentRevisionId,
      );
      if (revision) {
        const draft = draftFromRevision(
          formId,
          revision,
          packageRecord?.updatedAt ?? this.dependencies.clock.now(),
        );
        await this.putDraft(draft);
        return { draft, formPackage };
      }
    }
    if (draftRecord) {
      return { draft: structuredClone(draftRecord.draft), formPackage };
    }
    return null;
  }

  async listFormSummaries(): Promise<FormSummary[]> {
    const [draftRecords, packageRecords] = await Promise.all([
      this.database.formDrafts.toArray(),
      this.database.formPackages.toArray(),
    ]);
    const packages = new Map(
      packageRecords.map((record) => [record.formId, record]),
    );
    const formIds = new Set([
      ...draftRecords.map((record) => record.formId),
      ...packageRecords.map((record) => record.formId),
    ]);
    const summaries = [...formIds].map((formId): FormSummary => {
      const draftRecord = draftRecords.find((record) => record.formId === formId);
      const packageRecord = packages.get(formId);
      const formPackage = packageRecord
        ? migrateFormPackage(packageRecord.formPackage)
        : null;
      const current = formPackage?.revisions.find(
        (revision) => revision.id === formPackage.currentRevisionId,
      );
      return {
        formId,
        title: draftRecord?.draft.title || current?.title || "",
        revisionNumber: formPackage?.revisions.length ?? 0,
        hasUnsavedDraft: draftRecord
          ? !draftMatchesRevision(draftRecord.draft, current)
          : false,
        updatedAt:
          draftRecord?.updatedAt ?? packageRecord?.updatedAt ?? current?.createdAt ?? "",
      };
    });
    return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async putDraft(draft: FormDraft): Promise<FormDraft> {
    const updatedAt = this.dependencies.clock.now();
    const next = structuredClone({ ...draft, updatedAt });
    const existing = await this.database.formDrafts.get(draft.formId);
    await this.database.formDrafts.put({
      formId: draft.formId,
      createdAt: existing?.createdAt ?? updatedAt,
      updatedAt,
      draft: next,
    });
    return structuredClone(next);
  }

  async saveRevision(draft: FormDraft): Promise<BuilderWorkspace> {
    return this.database.transaction(
      "rw",
      this.database.formDrafts,
      this.database.formPackages,
      async () => {
        const now = this.dependencies.clock.now();
        const nextDraft = structuredClone({ ...draft, updatedAt: now });
        const validation = validateDraft(nextDraft);
        if (validation.errors.length > 0) {
          throw new RevisionValidationError(validation.errors[0].message);
        }
        const packageRecord = await this.database.formPackages.get(draft.formId);
        const formPackage = packageRecord
          ? migrateFormPackage(packageRecord.formPackage)
          : createEmptyPackage(draft.formId);
        const current = formPackage.revisions.find(
          (revision) => revision.id === formPackage.currentRevisionId,
        );
        if (draftMatchesRevision(nextDraft, current)) {
          throw new UnchangedRevisionError("Draft matches the latest revision.");
        }
        const revision = snapshotRevision(nextDraft, this.dependencies.ids, {
          now: () => now,
        });
        const nextPackage = structuredClone({
          ...formPackage,
          currentRevisionId: revision.id,
          revisions: [...formPackage.revisions, revision],
        });
        nextDraft.baseRevisionId = revision.id;
        const draftRecord = await this.database.formDrafts.get(draft.formId);
        await this.database.formDrafts.put({
          formId: draft.formId,
          createdAt: draftRecord?.createdAt ?? now,
          updatedAt: now,
          draft: nextDraft,
        });
        await this.database.formPackages.put({
          formId: draft.formId,
          createdAt: packageRecord?.createdAt ?? now,
          updatedAt: now,
          formPackage: nextPackage,
        });
        return {
          draft: structuredClone(nextDraft),
          formPackage: structuredClone(nextPackage),
        };
      },
    );
  }
}

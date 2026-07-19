import Dexie, { type EntityTable } from "dexie";
import type { FormDraft, FormPackage } from "@/lib/forms/schema";

export interface StoredFormDraft {
  formId: string;
  createdAt: string;
  updatedAt: string;
  draft: FormDraft;
}

export interface StoredFormPackage {
  formId: string;
  createdAt: string;
  updatedAt: string;
  formPackage: FormPackage;
}

export class QuikFormerDatabase extends Dexie {
  formPackages!: EntityTable<StoredFormPackage, "formId">;
  formDrafts!: EntityTable<StoredFormDraft, "formId">;

  constructor(name = "quik-former") {
    super(name);
    this.version(1).stores({
      formPackages: "&formId, updatedAt",
      formDrafts: "&formId, updatedAt",
    });
  }
}

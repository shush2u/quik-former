import type { Clock, IdGenerator } from "@/lib/forms/ids";
import {
  FORM_FORMAT_VERSION,
  type FormDraft,
  type FormPackage,
  type FormRevision,
} from "@/lib/forms/schema";

export function createInitialDraft(ids: IdGenerator, clock: Clock): FormDraft {
  return {
    formId: ids.generate(),
    baseRevisionId: null,
    title: "",
    description: "",
    sections: [
      {
        id: ids.generate(),
        title: "",
        description: "",
        fields: [],
      },
    ],
    updatedAt: clock.now(),
  };
}

export function createEmptyPackage(formId: string): FormPackage {
  return {
    formId,
    formatVersion: FORM_FORMAT_VERSION,
    currentRevisionId: null,
    revisions: [],
  };
}

export function snapshotRevision(
  draft: FormDraft,
  ids: IdGenerator,
  clock: Clock,
): FormRevision {
  return structuredClone({
    id: ids.generate(),
    title: draft.title,
    description: draft.description,
    sections: draft.sections,
    createdAt: clock.now(),
  });
}

export function draftMatchesRevision(
  draft: FormDraft,
  revision: FormRevision | undefined,
): boolean {
  if (!revision) return false;
  return JSON.stringify({
    title: draft.title,
    description: draft.description,
    sections: draft.sections,
  }) === JSON.stringify({
    title: revision.title,
    description: revision.description,
    sections: revision.sections,
  });
}

export function draftFromRevision(
  formId: string,
  revision: FormRevision,
  updatedAt: string,
): FormDraft {
  return structuredClone({
    formId,
    baseRevisionId: revision.id,
    title: revision.title,
    description: revision.description,
    sections: revision.sections,
    updatedAt,
  });
}

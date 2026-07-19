import type { IdGenerator } from "@/lib/forms/ids";
import type {
  ChoiceField,
  ChoiceOption,
  FieldType,
  FormDraft,
  FormField,
  FormSection,
  SelectField,
} from "@/lib/forms/schema";

const FIELD_LABELS: Record<FieldType, string> = {
  text: "Short answer",
  textarea: "Long answer",
  radio: "Multiple choice",
  checkbox: "Checkboxes",
  select: "Dropdown",
  date: "Date",
  number: "Number",
  signature: "Signature",
};

function option(ids: IdGenerator, label: string): ChoiceOption {
  return { id: ids.generate(), label };
}

export function createField(type: FieldType, ids: IdGenerator): FormField {
  const base = {
    id: ids.generate(),
    type,
    label: FIELD_LABELS[type],
    helpText: "",
    required: false,
  };
  if (type === "radio" || type === "checkbox") {
    return {
      ...base,
      type,
      options: [option(ids, "Option 1"), option(ids, "Option 2")],
      allowOther: false,
    };
  }
  if (type === "select") {
    return {
      ...base,
      type,
      options: [option(ids, "Option 1"), option(ids, "Option 2")],
    };
  }
  return base as FormField;
}

export function createYesNoField(ids: IdGenerator): ChoiceField {
  return {
    id: ids.generate(),
    type: "radio",
    label: "Yes or no",
    helpText: "",
    required: false,
    options: [option(ids, "Yes"), option(ids, "No")],
    allowOther: false,
  };
}

export function addSection(draft: FormDraft, ids: IdGenerator): FormDraft {
  return {
    ...draft,
    sections: [
      ...draft.sections,
      { id: ids.generate(), title: "", description: "", fields: [] },
    ],
  };
}

export function updateSection(
  draft: FormDraft,
  sectionId: string,
  changes: Partial<Pick<FormSection, "title" | "description">>,
): FormDraft {
  return {
    ...draft,
    sections: draft.sections.map((section) =>
      section.id === sectionId ? { ...section, ...changes } : section,
    ),
  };
}

function cloneField(field: FormField, ids: IdGenerator): FormField {
  const clone = structuredClone(field);
  clone.id = ids.generate();
  if ("options" in clone) {
    clone.options = clone.options.map((item) => ({
      ...item,
      id: ids.generate(),
    }));
  }
  return clone;
}

export function duplicateSection(
  draft: FormDraft,
  sectionId: string,
  ids: IdGenerator,
): FormDraft {
  const index = draft.sections.findIndex((section) => section.id === sectionId);
  if (index < 0) return draft;
  const source = draft.sections[index];
  const duplicate: FormSection = {
    ...structuredClone(source),
    id: ids.generate(),
    fields: source.fields.map((field) => cloneField(field, ids)),
  };
  const sections = [...draft.sections];
  sections.splice(index + 1, 0, duplicate);
  return { ...draft, sections };
}

export function deleteSection(draft: FormDraft, sectionId: string): FormDraft {
  return {
    ...draft,
    sections: draft.sections.filter((section) => section.id !== sectionId),
  };
}

export function addField(
  draft: FormDraft,
  sectionId: string,
  field: FormField,
): FormDraft {
  return {
    ...draft,
    sections: draft.sections.map((section) =>
      section.id === sectionId
        ? { ...section, fields: [...section.fields, field] }
        : section,
    ),
  };
}

export function updateField(
  draft: FormDraft,
  fieldId: string,
  changes: Partial<FormField>,
): FormDraft {
  return {
    ...draft,
    sections: draft.sections.map((section) => ({
      ...section,
      fields: section.fields.map((field) =>
        field.id === fieldId ? ({ ...field, ...changes, type: field.type } as FormField) : field,
      ),
    })),
  };
}

export function duplicateField(
  draft: FormDraft,
  fieldId: string,
  ids: IdGenerator,
): FormDraft {
  return {
    ...draft,
    sections: draft.sections.map((section) => {
      const index = section.fields.findIndex((field) => field.id === fieldId);
      if (index < 0) return section;
      const fields = [...section.fields];
      fields.splice(index + 1, 0, cloneField(fields[index], ids));
      return { ...section, fields };
    }),
  };
}

export function deleteField(draft: FormDraft, fieldId: string): FormDraft {
  return {
    ...draft,
    sections: draft.sections.map((section) => ({
      ...section,
      fields: section.fields.filter((field) => field.id !== fieldId),
    })),
  };
}

export function moveField(
  draft: FormDraft,
  fieldId: string,
  targetSectionId: string,
  targetIndex: number,
): FormDraft {
  const sourceSection = draft.sections.find((section) =>
    section.fields.some((field) => field.id === fieldId),
  );
  const field = sourceSection?.fields.find((item) => item.id === fieldId);
  if (!sourceSection || !field || !draft.sections.some((section) => section.id === targetSectionId)) {
    return draft;
  }
  const sections = draft.sections.map((section) => ({
    ...section,
    fields: section.fields.filter((item) => item.id !== fieldId),
  }));
  const target = sections.find((section) => section.id === targetSectionId)!;
  target.fields.splice(Math.max(0, Math.min(targetIndex, target.fields.length)), 0, field);
  return { ...draft, sections };
}

export function addOption(
  draft: FormDraft,
  fieldId: string,
  ids: IdGenerator,
): FormDraft {
  return updateChoiceField(draft, fieldId, (field) => ({
    ...field,
    options: [...field.options, option(ids, `Option ${field.options.length + 1}`)],
  }));
}

export function updateOption(
  draft: FormDraft,
  fieldId: string,
  optionId: string,
  label: string,
): FormDraft {
  return updateChoiceField(draft, fieldId, (field) => ({
    ...field,
    options: field.options.map((item) =>
      item.id === optionId ? { ...item, label } : item,
    ),
  }));
}

export function deleteOption(
  draft: FormDraft,
  fieldId: string,
  optionId: string,
): FormDraft {
  return updateChoiceField(draft, fieldId, (field) => ({
    ...field,
    options: field.options.filter((item) => item.id !== optionId),
  }));
}

export function reorderOption(
  draft: FormDraft,
  fieldId: string,
  optionId: string,
  direction: -1 | 1,
): FormDraft {
  return updateChoiceField(draft, fieldId, (field) => {
    const index = field.options.findIndex((item) => item.id === optionId);
    const destination = index + direction;
    if (index < 0 || destination < 0 || destination >= field.options.length) return field;
    const options = [...field.options];
    [options[index], options[destination]] = [options[destination], options[index]];
    return { ...field, options };
  });
}

function updateChoiceField(
  draft: FormDraft,
  fieldId: string,
  update: (field: ChoiceField | SelectField) => ChoiceField | SelectField,
): FormDraft {
  return {
    ...draft,
    sections: draft.sections.map((section) => ({
      ...section,
      fields: section.fields.map((field) =>
        field.id === fieldId && "options" in field ? update(field) : field,
      ),
    })),
  };
}

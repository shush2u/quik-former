import type {
  FormDraft,
  FormField,
  FormSection,
} from "@/lib/forms/schema";

export interface ConfigurationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  errors: ConfigurationIssue[];
  warnings: ConfigurationIssue[];
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function duplicateValues(values: string[]): boolean {
  return new Set(values).size !== values.length;
}

export function validateDraft(draft: FormDraft): ValidationResult {
  const errors: ConfigurationIssue[] = [];
  const warnings: ConfigurationIssue[] = [];
  const error = (path: string, message: string) => errors.push({ path, message });

  if (!draft.title.trim()) error("title", "Form title is required.");
  if (draft.sections.length === 0) error("sections", "Add at least one section.");
  if (duplicateValues(draft.sections.map((section) => section.id))) {
    error("sections", "Section IDs must be unique.");
  }

  const fieldIds: string[] = [];
  const optionIds: string[] = [];
  draft.sections.forEach((section, sectionIndex) => {
    const sectionPath = `sections.${sectionIndex}`;
    if (!section.title.trim()) error(`${sectionPath}.title`, "Section title is required.");
    if (section.fields.length === 0) {
      error(
        `${sectionPath}.fields`,
        "Section must have at least one field.",
      );
    }
    section.fields.forEach((field, fieldIndex) => {
      const fieldPath = `${sectionPath}.fields.${fieldIndex}`;
      fieldIds.push(field.id);
      if (!field.label.trim()) error(`${fieldPath}.label`, "Field label is required.");

      if (field.type === "text" || field.type === "textarea") {
        for (const [name, value] of [["Minimum", field.minLength], ["Maximum", field.maxLength]] as const) {
          if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
            error(fieldPath, `${name} length must be a non-negative integer.`);
          }
        }
        if (
          field.minLength !== undefined &&
          field.maxLength !== undefined &&
          field.minLength > field.maxLength
        ) {
          error(fieldPath, "Minimum length cannot exceed maximum length.");
        }
      }
      if (field.type === "number") {
        if (field.minValue !== undefined && !Number.isFinite(field.minValue)) {
          error(fieldPath, "Minimum value must be finite.");
        }
        if (field.maxValue !== undefined && !Number.isFinite(field.maxValue)) {
          error(fieldPath, "Maximum value must be finite.");
        }
        if (
          field.minValue !== undefined &&
          field.maxValue !== undefined &&
          field.minValue > field.maxValue
        ) {
          error(fieldPath, "Minimum value cannot exceed maximum value.");
        }
      }
      if (field.type === "date") {
        if (field.earliestDate && !isValidIsoDate(field.earliestDate)) {
          error(fieldPath, "Earliest date must be a valid date.");
        }
        if (field.latestDate && !isValidIsoDate(field.latestDate)) {
          error(fieldPath, "Latest date must be a valid date.");
        }
        if (
          field.earliestDate &&
          field.latestDate &&
          isValidIsoDate(field.earliestDate) &&
          isValidIsoDate(field.latestDate) &&
          field.earliestDate > field.latestDate
        ) {
          error(fieldPath, "Earliest date cannot be after latest date.");
        }
      }
      if ("options" in field) {
        if (field.options.length < 2) {
          error(`${fieldPath}.options`, "Add at least two options.");
        }
        field.options.forEach((item, optionIndex) => {
          optionIds.push(item.id);
          if (!item.label.trim()) {
            error(`${fieldPath}.options.${optionIndex}`, "Option label is required.");
          }
        });
        const labels = field.options.map((item) => item.label.trim().toLocaleLowerCase());
        if (labels.some(Boolean) && duplicateValues(labels)) {
          warnings.push({
            path: `${fieldPath}.options`,
            message: "Duplicate option labels can confuse people filling this form.",
          });
        }
      }
    });
  });
  if (duplicateValues(fieldIds)) error("sections", "Field IDs must be unique.");
  if (duplicateValues(optionIds)) error("sections", "Option IDs must be unique.");

  return { errors, warnings };
}

export function validateFieldConfiguration(field: FormField): ValidationResult {
  return validateDraft({
    formId: "validation-form",
    baseRevisionId: null,
    title: "Validation form",
    description: "",
    updatedAt: "",
    sections: [
      {
        id: "validation-section",
        title: "Validation section",
        description: "",
        fields: [field],
      },
    ],
  });
}

export function validateSectionConfiguration(
  section: FormSection,
): ValidationResult {
  return validateDraft({
    formId: "validation-form",
    baseRevisionId: null,
    title: "Validation form",
    description: "",
    updatedAt: "",
    sections: [section],
  });
}

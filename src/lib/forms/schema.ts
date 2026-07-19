export const FORM_FORMAT_VERSION = 1 as const;

export type FieldType =
  | "text"
  | "textarea"
  | "radio"
  | "checkbox"
  | "select"
  | "date"
  | "number"
  | "signature";

export interface ChoiceOption {
  id: string;
  label: string;
}

interface BaseField {
  id: string;
  type: FieldType;
  label: string;
  helpText: string;
  required: boolean;
}

export interface TextField extends BaseField {
  type: "text" | "textarea";
  minLength?: number;
  maxLength?: number;
}

export interface NumberField extends BaseField {
  type: "number";
  minValue?: number;
  maxValue?: number;
}

export interface DateField extends BaseField {
  type: "date";
  earliestDate?: string;
  latestDate?: string;
}

export interface ChoiceField extends BaseField {
  type: "radio" | "checkbox";
  options: ChoiceOption[];
  allowOther: boolean;
}

export interface SelectField extends BaseField {
  type: "select";
  options: ChoiceOption[];
}

export interface SignatureField extends BaseField {
  type: "signature";
}

export type FormField =
  | TextField
  | NumberField
  | DateField
  | ChoiceField
  | SelectField
  | SignatureField;

export interface FormSection {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
}

export interface FormRevision {
  id: string;
  title: string;
  description: string;
  sections: FormSection[];
  createdAt: string;
}

export interface FormPackage {
  formId: string;
  formatVersion: typeof FORM_FORMAT_VERSION;
  currentRevisionId: string | null;
  revisions: FormRevision[];
}

export interface FormDraft {
  formId: string;
  baseRevisionId: string | null;
  title: string;
  description: string;
  sections: FormSection[];
  updatedAt: string;
}

export interface BuilderWorkspace {
  draft: FormDraft;
  formPackage: FormPackage | null;
}

export interface FormSummary {
  formId: string;
  title: string;
  revisionNumber: number;
  hasUnsavedDraft: boolean;
  updatedAt: string;
}

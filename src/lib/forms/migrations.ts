import { FORM_FORMAT_VERSION, type FormPackage } from "@/lib/forms/schema";

export function migrateFormPackage(value: unknown): FormPackage {
  if (!value || typeof value !== "object" || !("formatVersion" in value)) {
    throw new Error("Invalid form package");
  }
  const version = (value as { formatVersion: unknown }).formatVersion;
  if (version !== FORM_FORMAT_VERSION) {
    throw new Error(`Unsupported form package version: ${String(version)}`);
  }
  return structuredClone(value as FormPackage);
}

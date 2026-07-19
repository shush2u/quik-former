import { validateFieldConfiguration } from "@/features/builder/builderValidation";
import type { BuilderAction } from "@/features/builder/builderReducer";
import type { FormField } from "@/lib/forms/schema";

interface FieldSettingsProps {
  field: FormField;
  dispatch: React.Dispatch<BuilderAction>;
}

function optionalNumber(value: string): number | undefined {
  return value === "" ? undefined : Number(value);
}

function Issues({ messages }: { messages: string[] }) {
  return messages.map((message) => (
    <p className="inline-error" key={message}>{message}</p>
  ));
}

export function FieldSettings({ field, dispatch }: FieldSettingsProps) {
  const validation = validateFieldConfiguration(field);
  const settingErrors = validation.errors.filter(
    (issue) => !issue.path.endsWith(".label"),
  );
  const messages = settingErrors.map((issue) => issue.message);

  if (field.type === "text" || field.type === "textarea") {
    return <><div className="constraint-grid"><label>Minimum length<input type="number" min="0" value={field.minLength ?? ""} onChange={(event) => dispatch({ type: "updateField", fieldId: field.id, changes: { minLength: optionalNumber(event.target.value) } })} /></label><label>Maximum length<input type="number" min="0" value={field.maxLength ?? ""} onChange={(event) => dispatch({ type: "updateField", fieldId: field.id, changes: { maxLength: optionalNumber(event.target.value) } })} /></label></div><Issues messages={messages} /></>;
  }
  if (field.type === "number") {
    return <><div className="constraint-grid"><label>Minimum value<input type="number" value={field.minValue ?? ""} onChange={(event) => dispatch({ type: "updateField", fieldId: field.id, changes: { minValue: optionalNumber(event.target.value) } })} /></label><label>Maximum value<input type="number" value={field.maxValue ?? ""} onChange={(event) => dispatch({ type: "updateField", fieldId: field.id, changes: { maxValue: optionalNumber(event.target.value) } })} /></label></div><Issues messages={messages} /></>;
  }
  if (field.type === "date") {
    return <><div className="constraint-grid"><label>Earliest date<input type="date" value={field.earliestDate ?? ""} onChange={(event) => dispatch({ type: "updateField", fieldId: field.id, changes: { earliestDate: event.target.value || undefined } })} /></label><label>Latest date<input type="date" value={field.latestDate ?? ""} onChange={(event) => dispatch({ type: "updateField", fieldId: field.id, changes: { latestDate: event.target.value || undefined } })} /></label></div><Issues messages={messages} /></>;
  }
  if ("options" in field) {
    const optionError = (index: number) => validation.errors.find(
      (issue) => issue.path.endsWith(`.options.${index}`),
    );
    const countErrors = settingErrors.filter(
      (issue) => issue.path.endsWith(".options"),
    );
    return (
      <div className="option-editor">
        <strong>Options</strong>
        <Issues messages={countErrors.map((issue) => issue.message)} />
        {validation.warnings.map((issue) => (
          <p className="author-warning" key={issue.message}>{issue.message}</p>
        ))}
        {field.options.map((item, index) => {
          const issue = optionError(index);
          return (
            <div className="option-row" key={item.id}>
              <input aria-label={`Option ${index + 1}`} aria-invalid={Boolean(issue)} aria-describedby={issue ? `option-${item.id}-error` : undefined} value={item.label} onChange={(event) => dispatch({ type: "updateOption", fieldId: field.id, optionId: item.id, label: event.target.value })} />
              {issue && <span id={`option-${item.id}-error`} className="inline-error">{issue.message}</span>}
              <button type="button" aria-label={`Move option ${index + 1} up`} disabled={index === 0} onClick={() => dispatch({ type: "reorderOption", fieldId: field.id, optionId: item.id, direction: -1 })}>↑</button>
              <button type="button" aria-label={`Move option ${index + 1} down`} disabled={index === field.options.length - 1} onClick={() => dispatch({ type: "reorderOption", fieldId: field.id, optionId: item.id, direction: 1 })}>↓</button>
              <button type="button" aria-label={`Delete option ${index + 1}`} onClick={() => dispatch({ type: "deleteOption", fieldId: field.id, optionId: item.id })}>×</button>
            </div>
          );
        })}
        <button type="button" className="secondary-button" onClick={() => dispatch({ type: "addOption", fieldId: field.id })}>+ Add option</button>
        {(field.type === "radio" || field.type === "checkbox") && (
          <label className="checkbox-label"><input type="checkbox" checked={field.allowOther} onChange={(event) => dispatch({ type: "updateField", fieldId: field.id, changes: { allowOther: event.target.checked } })} />Allow “Other” answer</label>
        )}
      </div>
    );
  }
  return null;
}

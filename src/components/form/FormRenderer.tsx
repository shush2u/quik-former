import { SignatureInput } from "@/components/form/SignatureInput";
import type { FormDraft, FormRevision } from "@/lib/forms/schema";

export type FormAnswer = string | string[];

interface FormRendererProps {
  form: Pick<FormDraft | FormRevision, "title" | "description" | "sections">;
  answers: Record<string, FormAnswer>;
  onAnswer(fieldId: string, value: FormAnswer): void;
}

export function FormRenderer({ form, answers, onAnswer }: FormRendererProps) {
  return (
    <div className="form-renderer">
      <header>
        <h1>{form.title || "Untitled form"}</h1>
        {form.description && <p>{form.description}</p>}
      </header>
      {form.sections.map((section) => (
        <section key={section.id} className="rendered-section">
          <h2>{section.title || "Untitled section"}</h2>
          {section.description && <p>{section.description}</p>}
          {section.fields.length === 0 && (
            <p className="author-warning">This section has no fields.</p>
          )}
          {section.fields.map((field) => {
            const value = answers[field.id] ?? (field.type === "checkbox" ? [] : "");
            const label = field.label || "Untitled field";
            return (
              <div className="rendered-field" key={field.id}>
                <label className="field-label" htmlFor={`preview-${field.id}`}>
                  {label} {field.required && <span aria-label="required">*</span>}
                </label>
                {field.helpText && <p className="field-help">{field.helpText}</p>}
                {(field.type === "text" || field.type === "textarea") &&
                  (field.type === "textarea" ? (
                    <textarea
                      id={`preview-${field.id}`}
                      value={String(value)}
                      minLength={field.minLength}
                      maxLength={field.maxLength}
                      onChange={(event) => onAnswer(field.id, event.target.value)}
                    />
                  ) : (
                    <input
                      id={`preview-${field.id}`}
                      type="text"
                      value={String(value)}
                      minLength={field.minLength}
                      maxLength={field.maxLength}
                      onChange={(event) => onAnswer(field.id, event.target.value)}
                    />
                  ))}
                {field.type === "number" && (
                  <input
                    id={`preview-${field.id}`}
                    type="number"
                    value={String(value)}
                    min={field.minValue}
                    max={field.maxValue}
                    onChange={(event) => onAnswer(field.id, event.target.value)}
                  />
                )}
                {field.type === "date" && (
                  <input
                    id={`preview-${field.id}`}
                    type="date"
                    value={String(value)}
                    min={field.earliestDate}
                    max={field.latestDate}
                    onChange={(event) => onAnswer(field.id, event.target.value)}
                  />
                )}
                {field.type === "select" && (
                  <select
                    id={`preview-${field.id}`}
                    value={String(value)}
                    onChange={(event) => onAnswer(field.id, event.target.value)}
                  >
                    <option value="">Select an option</option>
                    {field.options.map((item) => (
                      <option key={item.id} value={item.id}>{item.label || "Untitled option"}</option>
                    ))}
                  </select>
                )}
                {field.type === "radio" && (
                  <fieldset>
                    <legend className="visually-hidden">{label}</legend>
                    {field.options.map((item) => (
                      <label className="choice-control" key={item.id}>
                        <input
                          type="radio"
                          name={field.id}
                          checked={value === item.id}
                          onChange={() => onAnswer(field.id, item.id)}
                        />
                        {item.label || "Untitled option"}
                      </label>
                    ))}
                    {field.allowOther && (
                      <label className="choice-control">
                        <input
                          type="radio"
                          name={field.id}
                          checked={typeof value === "string" && value.startsWith("other:")}
                          onChange={() => onAnswer(field.id, "other:")}
                        />
                        Other
                        <input
                          aria-label={`${label} other answer`}
                          value={typeof value === "string" && value.startsWith("other:") ? value.slice(6) : ""}
                          onChange={(event) => onAnswer(field.id, `other:${event.target.value}`)}
                        />
                      </label>
                    )}
                  </fieldset>
                )}
                {field.type === "checkbox" && (
                  <fieldset>
                    <legend className="visually-hidden">{label}</legend>
                    {field.options.map((item) => {
                      const selected = Array.isArray(value) ? value : [];
                      return (
                        <label className="choice-control" key={item.id}>
                          <input
                            type="checkbox"
                            checked={selected.includes(item.id)}
                            onChange={(event) => onAnswer(
                              field.id,
                              event.target.checked
                                ? [...selected, item.id]
                                : selected.filter((id) => id !== item.id),
                            )}
                          />
                          {item.label || "Untitled option"}
                        </label>
                      );
                    })}
                    {field.allowOther && (() => {
                      const selected = Array.isArray(value) ? value : [];
                      const other = selected.find((item) => item.startsWith("other:"));
                      return (
                        <label className="choice-control">
                          <input
                            type="checkbox"
                            checked={other !== undefined}
                            onChange={(event) => onAnswer(
                              field.id,
                              event.target.checked
                                ? [...selected, "other:"]
                                : selected.filter((item) => !item.startsWith("other:")),
                            )}
                          />
                          Other
                          <input
                            aria-label={`${label} other answer`}
                            value={other?.slice(6) ?? ""}
                            onChange={(event) => onAnswer(field.id, [
                              ...selected.filter((item) => !item.startsWith("other:")),
                              `other:${event.target.value}`,
                            ])}
                          />
                        </label>
                      );
                    })()}
                  </fieldset>
                )}
                {field.type === "signature" && (
                  <SignatureInput value={String(value)} onChange={(next) => onAnswer(field.id, next)} />
                )}
                {!field.label.trim() && (
                  <p className="author-warning">Add a field label before saving a revision.</p>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

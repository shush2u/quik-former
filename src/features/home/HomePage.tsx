import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import type { FormSummary } from "@/lib/forms/schema";
import { formRepository } from "@/lib/storage";
import type { FormRepository } from "@/lib/storage/formRepository";

export function HomePage({ repository = formRepository }: { repository?: FormRepository }) {
  const [forms, setForms] = useState<FormSummary[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setError("");
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    void repository.listFormSummaries().then(
      (summaries) => active && setForms(summaries),
      (reason: unknown) => active && setError(reason instanceof Error ? reason.message : "Local forms could not be loaded."),
    );
    return () => { active = false; };
  }, [attempt, repository]);

  return (
    <section className="home-page" aria-labelledby="home-title">
      <div className="home-hero">
        <div><p className="eyebrow">Local-first form workspace</p><h1 id="home-title">Your forms</h1><p className="lede">Build reusable forms and keep every draft on this device.</p></div>
        <Link className="button-link" to="/builder/new">Create form</Link>
      </div>
      {error ? <div className="route-state"><h2>Local forms are unavailable</h2><p>{error}</p><button type="button" className="primary-button" onClick={retry}>Retry</button></div>
        : forms === null ? <p aria-live="polite">Loading local forms…</p>
        : forms.length === 0 ? <div className="empty-library"><h2>No forms yet</h2><p>Create your first form. Incomplete drafts will autosave here.</p></div>
        : <ul className="form-library">{forms.map((form) => <li key={form.formId} className="form-summary card"><div><h2>{form.title || "Untitled form"}</h2><p>Revision {form.revisionNumber} · {form.hasUnsavedDraft ? "Draft changes" : "Saved"}</p><time dateTime={form.updatedAt}>Updated {new Date(form.updatedAt).toLocaleString()}</time></div><Link className="secondary-button" to={`/builder/${form.formId}`}>Edit</Link></li>)}</ul>}
    </section>
  );
}

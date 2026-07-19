import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { BuilderWorkspace } from "@/features/builder/BuilderWorkspace";
import type { BuilderWorkspace as Workspace } from "@/lib/forms/schema";
import { formRepository } from "@/lib/storage";
import type { FormRepository } from "@/lib/storage/formRepository";

interface BuilderPageProps {
  repository?: FormRepository;
  createNew?: boolean;
}

export function BuilderPage({ repository = formRepository, createNew = false }: BuilderPageProps) {
  const { formId } = useParams();
  const navigate = useNavigate();
  const request = useRef<Promise<Workspace | null> | null>(null);
  const requestKey = useRef("");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    request.current = null;
    requestKey.current = "";
    setError("");
    setMissing(false);
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const routeKey = createNew ? "new" : (formId ?? "missing");
        if (requestKey.current !== routeKey) {
          requestKey.current = routeKey;
          request.current = null;
          setWorkspace(null);
          setMissing(false);
          setError("");
        }
        if (!request.current) {
          request.current = createNew
            ? repository.createFormDraft().then((draft) => ({
                draft,
                formPackage: null,
              }))
            : formId
              ? repository.getBuilderWorkspace(formId)
              : Promise.resolve(null);
        }
        const loaded = await request.current;
        if (createNew && loaded) {
          if (!active) return;
          navigate(`/builder/${loaded.draft.formId}`, { replace: true });
          setWorkspace(loaded);
          return;
        }
        if (!formId) {
          setMissing(true);
          return;
        }
        if (!active) return;
        if (!loaded) setMissing(true);
        else setWorkspace(loaded);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Local storage is unavailable.");
      }
    })();
    return () => {
      active = false;
    };
  }, [attempt, createNew, formId, navigate, repository]);

  if (error) {
    return <section className="route-state"><p className="eyebrow">Storage unavailable</p><h1>Your form could not be opened</h1><p>{error}</p><button type="button" className="primary-button" onClick={retry}>Retry</button><Link to="/">Return home</Link></section>;
  }
  if (missing) {
    return <section className="route-state"><p className="eyebrow">Form not found</p><h1>This local form does not exist</h1><p>It may have been created on another device or removed from this browser.</p><Link className="button-link" to="/">Return to forms</Link></section>;
  }
  if (!workspace) {
    return <section className="route-state" aria-live="polite"><p className="eyebrow">Loading</p><h1>{createNew ? "Creating your form…" : "Opening your form…"}</h1></section>;
  }
  return <BuilderWorkspace workspace={workspace} repository={repository} />;
}

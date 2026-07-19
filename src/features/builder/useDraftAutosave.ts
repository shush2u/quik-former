import { useCallback, useEffect, useRef, useState } from "react";
import type { FormDraft } from "@/lib/forms/schema";
import type { FormRepository } from "@/lib/storage/formRepository";

export type AutosaveState =
  | { status: "idle" | "saving" | "saved" }
  | { status: "error"; message: string };

export function useDraftAutosave(
  draft: FormDraft,
  repository: FormRepository,
  onSaved: (draft: FormDraft) => void,
  delay = 500,
) {
  const [state, setState] = useState<AutosaveState>({ status: "idle" });
  const initialized = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<FormDraft | null>(null);
  const queue = useRef(Promise.resolve());
  const lastWrite = useRef<Promise<boolean> | null>(null);
  const latest = useRef(draft);
  const onSavedRef = useRef(onSaved);
  latest.current = draft;
  onSavedRef.current = onSaved;

  const persist = useCallback((value: FormDraft) => {
    pending.current = null;
    setState({ status: "saving" });
    const write = queue.current.then(() => repository.putDraft(value));
    const outcome = write.then(
      (saved) => {
        onSavedRef.current(saved);
        setState({ status: "saved" });
        return true;
      },
      (reason: unknown) => {
        pending.current = latest.current;
        setState({
          status: "error",
          message: reason instanceof Error ? reason.message : "Draft could not be saved.",
        });
        return false;
      },
    );
    lastWrite.current = outcome;
    queue.current = outcome.then(() => undefined);
    return outcome;
  }, [repository]);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    let saved = true;
    if (pending.current) saved = await persist(pending.current);
    else if (lastWrite.current) saved = await lastWrite.current;
    await queue.current;
    return saved;
  }, [persist]);

  const retry = useCallback(() => {
    if (pending.current) void persist(pending.current);
  }, [persist]);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    pending.current = draft;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void persist(draft);
    }, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [delay, draft, persist]);

  useEffect(() => {
    const flushBeforeUnload = () => {
      if (pending.current) void persist(pending.current);
    };
    window.addEventListener("beforeunload", flushBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", flushBeforeUnload);
      if (timer.current) clearTimeout(timer.current);
      if (pending.current) void persist(pending.current);
    };
  }, [persist]);

  return { ...state, flush, retry };
}

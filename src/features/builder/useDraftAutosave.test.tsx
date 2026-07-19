/**
 * @vitest-environment jsdom
 */
import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDraftAutosave } from "@/features/builder/useDraftAutosave";
import type { FormDraft } from "@/lib/forms/schema";
import type { FormRepository } from "@/lib/storage/formRepository";

const initial: FormDraft = {
  formId: "form",
  baseRevisionId: null,
  title: "",
  description: "",
  sections: [],
  updatedAt: "time",
};

afterEach(() => vi.useRealTimers());

describe("draft autosave", () => {
  it("debounces edits and flushes the latest draft on demand", async () => {
    vi.useFakeTimers();
    const putDraft = vi.fn(async (draft: FormDraft) => draft);
    const repository = { putDraft } as unknown as FormRepository;

    function Harness() {
      const [draft, setDraft] = useState(initial);
      const autosave = useDraftAutosave(draft, repository, () => undefined);
      return <><button onClick={() => setDraft((value) => ({ ...value, title: `${value.title}x` }))}>Edit</button><button onClick={() => void autosave.flush()}>Flush</button><span>{autosave.status}</span></>;
    }
    render(<Harness />);

    screen.getByRole("button", { name: "Edit" }).click();
    screen.getByRole("button", { name: "Edit" }).click();
    await act(() => vi.advanceTimersByTimeAsync(499));
    expect(putDraft).not.toHaveBeenCalled();
    screen.getByRole("button", { name: "Flush" }).click();
    await act(async () => undefined);

    expect(putDraft).toHaveBeenCalledTimes(1);
    expect(putDraft).toHaveBeenCalledWith(expect.objectContaining({ title: "xx" }));
  });

  it("shows a failure and retries the latest in-memory draft", async () => {
    vi.useFakeTimers();
    const putDraft = vi.fn()
      .mockRejectedValueOnce(new Error("disk unavailable"))
      .mockImplementation(async (draft: FormDraft) => draft);
    const repository = { putDraft } as unknown as FormRepository;

    function Harness() {
      const [draft, setDraft] = useState(initial);
      const autosave = useDraftAutosave(draft, repository, () => undefined);
      return <><button onClick={() => setDraft((value) => ({ ...value, title: "latest" }))}>Edit</button><button onClick={autosave.retry}>Retry</button><span>{autosave.status === "error" ? autosave.message : autosave.status}</span></>;
    }
    render(<Harness />);
    screen.getByRole("button", { name: "Edit" }).click();
    await act(() => vi.advanceTimersByTimeAsync(500));

    expect(screen.getByText("disk unavailable")).toBeVisible();
    screen.getByRole("button", { name: "Retry" }).click();
    await act(async () => undefined);

    expect(putDraft).toHaveBeenCalledTimes(2);
    expect(putDraft).toHaveBeenLastCalledWith(expect.objectContaining({ title: "latest" }));
    expect(screen.getByText("saved")).toBeVisible();
  });

  it("serializes writes so an older slow save cannot overwrite a newer edit", async () => {
    vi.useFakeTimers();
    let resolveFirst!: (draft: FormDraft) => void;
    const firstWrite = new Promise<FormDraft>((resolve) => {
      resolveFirst = resolve;
    });
    const putDraft = vi.fn()
      .mockImplementationOnce(() => firstWrite)
      .mockImplementation(async (draft: FormDraft) => draft);
    const repository = { putDraft } as unknown as FormRepository;

    function Harness() {
      const [draft, setDraft] = useState(initial);
      useDraftAutosave(draft, repository, () => undefined);
      return <button onClick={() => setDraft((value) => ({ ...value, title: `${value.title}x` }))}>Edit</button>;
    }
    render(<Harness />);
    screen.getByRole("button", { name: "Edit" }).click();
    await act(() => vi.advanceTimersByTimeAsync(500));
    screen.getByRole("button", { name: "Edit" }).click();
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(putDraft).toHaveBeenCalledTimes(1);

    await act(async () => resolveFirst({ ...initial, title: "x" }));

    expect(putDraft).toHaveBeenCalledTimes(2);
    expect(putDraft).toHaveBeenLastCalledWith(expect.objectContaining({ title: "xx" }));
  });

  it("reports failure when flush joins an already-running write", async () => {
    vi.useFakeTimers();
    let rejectWrite!: (reason: Error) => void;
    const write = new Promise<FormDraft>((_resolve, reject) => {
      rejectWrite = reject;
    });
    const repository = {
      putDraft: vi.fn().mockImplementationOnce(() => write).mockRejectedValue(new Error("still offline")),
    } as unknown as FormRepository;

    function Harness() {
      const [draft, setDraft] = useState(initial);
      const [result, setResult] = useState("waiting");
      const autosave = useDraftAutosave(draft, repository, () => undefined);
      return <><button onClick={() => setDraft((value) => ({ ...value, title: "edited" }))}>Edit</button><button onClick={() => void autosave.flush().then((saved) => setResult(saved ? "saved" : "blocked"))}>Flush</button><span>{result}</span></>;
    }
    render(<Harness />);
    screen.getByRole("button", { name: "Edit" }).click();
    await act(() => vi.advanceTimersByTimeAsync(500));
    screen.getByRole("button", { name: "Flush" }).click();
    await act(async () => rejectWrite(new Error("still offline")));

    expect(screen.getByText("blocked")).toBeVisible();
  });
});

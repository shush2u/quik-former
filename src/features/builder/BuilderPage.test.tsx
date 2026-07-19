/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { BuilderPage } from "@/features/builder/BuilderPage";
import type { FormDraft } from "@/lib/forms/schema";
import type { FormRepository } from "@/lib/storage/formRepository";

const draft: FormDraft = {
  formId: "new-form",
  baseRevisionId: null,
  title: "",
  description: "",
  sections: [{ id: "section", title: "", description: "", fields: [] }],
  updatedAt: "2026-07-19T10:00:00.000Z",
};

function Location() {
  return <output aria-label="location">{useLocation().pathname}</output>;
}

describe("builder routes", () => {
  it("persists a new draft and replaces the creation URL", async () => {
    const repository = {
      createFormDraft: vi.fn(async () => draft),
      getBuilderWorkspace: vi.fn(async () => ({ draft, formPackage: null })),
      listFormSummaries: vi.fn(),
      putDraft: vi.fn(async (value: FormDraft) => value),
      saveRevision: vi.fn(),
    } satisfies FormRepository;
    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/builder/new"]}>
          <Location />
          <Routes>
            <Route
              path="builder/new"
              element={<BuilderPage repository={repository} createNew />}
            />
            <Route
              path="builder/:formId"
              element={<BuilderPage repository={repository} />}
            />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    );

    await waitFor(() =>
      expect(screen.getByLabelText("location")).toHaveTextContent(
        "/builder/new-form",
      ),
    );
    expect(repository.createFormDraft).toHaveBeenCalledTimes(1);
  });

  it("shows a not-found state without creating a replacement form", async () => {
    const repository = {
      createFormDraft: vi.fn(),
      getBuilderWorkspace: vi.fn(async () => null),
      listFormSummaries: vi.fn(),
      putDraft: vi.fn(),
      saveRevision: vi.fn(),
    } satisfies FormRepository;
    render(
      <MemoryRouter initialEntries={["/builder/missing"]}>
        <Routes>
          <Route
            path="builder/:formId"
            element={<BuilderPage repository={repository} />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "This local form does not exist",
      }),
    ).toBeVisible();
    expect(repository.createFormDraft).not.toHaveBeenCalled();
  });
});

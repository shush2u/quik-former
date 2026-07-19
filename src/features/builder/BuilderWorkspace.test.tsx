/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { BuilderWorkspace } from "@/features/builder/BuilderWorkspace";
import type { FormDraft } from "@/lib/forms/schema";
import type { FormRepository } from "@/lib/storage/formRepository";

function emptyDraft(): FormDraft {
  return {
    formId: "form-1",
    baseRevisionId: null,
    title: "",
    description: "",
    updatedAt: "2026-07-19T10:00:00.000Z",
    sections: [{ id: "section-1", title: "", description: "", fields: [] }],
  };
}

function repository(): FormRepository {
  return {
    createFormDraft: vi.fn(),
    getBuilderWorkspace: vi.fn(),
    listFormSummaries: vi.fn(),
    putDraft: vi.fn(async (draft: FormDraft) => draft),
    saveRevision: vi.fn(),
  };
}

describe("builder workflow", () => {
  it("shows a blocking message inside a section with no fields", () => {
    const draft = emptyDraft();
    draft.title = "Survey";
    draft.sections[0].title = "Empty section";

    render(
      <MemoryRouter>
        <BuilderWorkspace
          workspace={{ draft, formPackage: null }}
          repository={repository()}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Section must have at least one field."),
    ).toBeVisible();
  });

  it("authors a choice field and previews answers without persisting them", async () => {
    const user = userEvent.setup();
    const storage = repository();
    render(
      <MemoryRouter>
        <BuilderWorkspace
          workspace={{ draft: emptyDraft(), formPackage: null }}
          repository={storage}
        />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Form title"), "Survey");
    await user.type(screen.getByLabelText("Section title"), "Basics");
    await user.click(screen.getByText("+ Add field"));
    await user.click(screen.getByRole("button", { name: "Multiple choice" }));
    await user.clear(screen.getByLabelText("Field label"));
    await user.type(screen.getByLabelText("Field label"), "Choose one");
    await user.click(screen.getByRole("button", { name: "Preview" }));

    expect(screen.getByText("Preview — answers are not saved")).toBeVisible();
    await user.click(screen.getByRole("radio", { name: "Option 1" }));
    expect(screen.getByRole("radio", { name: "Option 1" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Reset preview" }));
    expect(screen.getByRole("radio", { name: "Option 1" })).not.toBeChecked();
    expect(storage.saveRevision).not.toHaveBeenCalled();
  });

  it("moves a field with fallback controls and confirms destructive deletion", async () => {
    const user = userEvent.setup();
    const draft = emptyDraft();
    draft.title = "Survey";
    draft.sections[0] = {
      ...draft.sections[0],
      title: "Basics",
      fields: [
        {
          id: "first",
          type: "text",
          label: "First field",
          helpText: "",
          required: false,
        },
        {
          id: "second",
          type: "number",
          label: "Second field",
          helpText: "",
          required: false,
        },
      ],
    };
    render(
      <MemoryRouter>
        <BuilderWorkspace
          workspace={{ draft, formPackage: null }}
          repository={repository()}
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /^First field/ }));
    await user.click(screen.getByRole("button", { name: "Move down" }));
    const fieldButtons = screen.getAllByRole("button", { name: /field/ });
    expect(
      fieldButtons.findIndex((button) =>
        button.textContent?.includes("Second field"),
      ),
    ).toBeLessThan(
      fieldButtons.findIndex((button) =>
        button.textContent?.includes("First field"),
      ),
    );

    const firstCard = screen
      .getByRole("button", { name: /^First field/ })
      .closest("article");
    expect(firstCard).not.toBeNull();
    await user.click(
      within(firstCard!).getByRole("button", { name: "Delete" }),
    );
    expect(screen.getByRole("dialog", { name: "Delete field?" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: /^First field/ })).toBeVisible();
    await user.click(
      within(firstCard!).getByRole("button", { name: "Delete" }),
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Delete",
      }),
    );
    expect(
      screen.queryByRole("button", { name: /^First field/ }),
    ).not.toBeInTheDocument();
  });

  it("keeps the in-memory draft open when navigation autosave fails", async () => {
    const user = userEvent.setup();
    const storage = repository();
    vi.mocked(storage.putDraft).mockRejectedValue(new Error("storage offline"));
    render(
      <MemoryRouter>
        <BuilderWorkspace
          workspace={{ draft: emptyDraft(), formPackage: null }}
          repository={storage}
        />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Form title"), "Unsaved title");
    await user.click(screen.getByRole("button", { name: "← Forms" }));

    await waitFor(() =>
      expect(screen.getByText(/Autosave error: storage offline/)).toBeVisible(),
    );
    expect(screen.getByLabelText("Form title")).toHaveValue("Unsaved title");
  });
});

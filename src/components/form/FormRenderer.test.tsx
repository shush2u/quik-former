/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  FormRenderer,
  type FormAnswer,
} from "@/components/form/FormRenderer";
import type { FormDraft } from "@/lib/forms/schema";

const form: Pick<FormDraft, "title" | "description" | "sections"> = {
  title: "All fields",
  description: "",
  sections: [{
    id: "section",
    title: "Fields",
    description: "",
    fields: [
      { id: "text", type: "text", label: "Text", helpText: "", required: false },
      { id: "textarea", type: "textarea", label: "Textarea", helpText: "", required: false },
      { id: "radio", type: "radio", label: "Radio", helpText: "", required: false, allowOther: true, options: [{ id: "r1", label: "Radio one" }, { id: "r2", label: "Radio two" }] },
      { id: "checkbox", type: "checkbox", label: "Checkbox", helpText: "", required: false, allowOther: true, options: [{ id: "c1", label: "Check one" }, { id: "c2", label: "Check two" }] },
      { id: "select", type: "select", label: "Select", helpText: "", required: false, options: [{ id: "s1", label: "Select one" }, { id: "s2", label: "Select two" }] },
      { id: "date", type: "date", label: "Date", helpText: "", required: false },
      { id: "number", type: "number", label: "Number", helpText: "", required: false },
      { id: "signature", type: "signature", label: "Signature", helpText: "", required: false },
    ],
  }],
};

describe("form renderer", () => {
  it("renders controlled interactive inputs for all MVP field types", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
      return { canvas: this, clearRect: vi.fn() } as unknown as CanvasRenderingContext2D;
    });
    const user = userEvent.setup();
    function Harness() {
      const [answers, setAnswers] = useState<Record<string, FormAnswer>>({});
      return <FormRenderer form={form} answers={answers} onAnswer={(id, value) => setAnswers((current) => ({ ...current, [id]: value }))} />;
    }
    render(<Harness />);

    await user.type(screen.getByLabelText("Text"), "short");
    await user.type(screen.getByLabelText("Textarea"), "long");
    await user.click(screen.getByRole("radio", { name: "Radio one" }));
    await user.click(screen.getByRole("checkbox", { name: "Check one" }));
    await user.selectOptions(screen.getByLabelText("Select"), "s2");
    await user.type(screen.getByLabelText("Date"), "2026-07-19");
    await user.type(screen.getByLabelText("Number"), "42");

    expect(screen.getByLabelText("Text")).toHaveValue("short");
    expect(screen.getByLabelText("Textarea")).toHaveValue("long");
    expect(screen.getByRole("radio", { name: "Radio one" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Check one" })).toBeChecked();
    expect(screen.getByLabelText("Select")).toHaveValue("s2");
    expect(screen.getByLabelText("Date")).toHaveValue("2026-07-19");
    expect(screen.getByLabelText("Number")).toHaveValue(42);
    expect(screen.getByLabelText("Draw signature")).toBeVisible();
    expect(screen.getByRole("button", { name: "Clear signature" })).toBeEnabled();
  });
});

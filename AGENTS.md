# Repository Guidelines

## Project Structure & Module Organization

This repository contains Quik Former, a local-first PWA for building, filling,
saving, and exporting forms. `PLAN.md` is the source of current product
direction. Prefer the existing Vite layout:

- `src/` for React and TypeScript application code.
- `src/components/` for reusable UI.
- `src/features/` for domain areas such as builder, fill mode, responses, and
  export.
- `src/lib/` for schema, storage, validation, and PDF helpers.
- `public/` for PWA assets such as icons and `manifest.webmanifest`.
- Colocated `*.test.ts(x)` files for unit tests, with `tests/` reserved for
  integration, workflow, fixture-heavy, or cross-feature tests.

Keep form schemas versioned JSON so saved files can be migrated later.

## Tech Stack

Refer to ARCHITECTURE.md for tech stack, always check releveant documentation for tool online or locally, if available.

## Build, Test, and Development Commands

Keep these commands synchronized with `package.json`:

- `pnpm install` to install dependencies.
- `pnpm dev` to run the local Vite development server.
- `pnpm build` to create a production build.
- `pnpm lint` to run Oxlint.
- `pnpm test` to run the Vitest suite.
- `pnpm preview` to preview the production build.
- Add `pnpm format` when a formatting script is added.

## Coding Style & Naming Conventions

Use TypeScript for application code. Prefer React function components and small,
focused modules. Name components in `PascalCase`, hooks as `useThing`, utility
functions in `camelCase`, and schema/type definitions with clear domain names
such as `FormSchema`, `FormField`, and `SavedResponse`. Keep browser storage,
PDF export, and validation logic outside UI components.

## Testing Guidelines

Add tests with the implementation. Cover schema migrations, validation rules,
local save/load behavior, PDF export formatting, and core builder/fill flows.
Prefer colocated unit tests; use `tests/` for integration, workflow,
fixture-heavy, or cross-feature tests.
Use descriptive test names that state behavior, for example
`saves a completed response locally`.

## Commit & Pull Request Guidelines

Use concise, imperative commit messages such as `feat: add form schema validation` that follow conventional commits spec (see https://www.conventionalcommits.org/en/v1.0.0/).
Pull requests should describe the change, list
manual or automated checks, link related issues, and include screenshots or
short recordings for visible UI changes.
Do not create commits or pull requests unless explicitly prompted to do so.

## Agent-Specific Instructions

- **Code is the source of truth:** Keep documentation aligned with actual behavior,
  and update this guide when commands, directories, or conventions become real.
- **Consultant Mode:** Analyze my architecture or bugs first. Challenge bad design patterns before making suggestions or writing code.
- **Minimal Code Diffs:** Never write or rewrite full scripts. Only provide specific functions, modified code sections, or unified git diffs.
- **No file changes without explicit consent:** Never change file contents unless explicitly prompted to.

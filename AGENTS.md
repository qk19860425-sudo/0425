# Repository Guidelines

## Project Structure & Module Organization

This workspace currently contains `報修需求筆記.txt`, a Traditional Chinese requirements note for a demonstration repair-request system. No application source, tests, assets, dependency manifests, or Git metadata are present.

Treat the note as project reference material, not as authorization to implement every listed deliverable. It describes a submission form, request list, possible Supabase storage, and supporting documents. Confirm the scope of each contribution before adding implementation files.

When implementation begins, group application code under `src/`, automated tests under `tests/`, static assets under `public/`, and supporting documentation under `docs/`. These are proposed conventions, not existing directories.

## Build, Test, and Development Commands

No build, development, lint, or test commands are currently configured. Do not assume commands such as `npm test` or `npm run build` work.

When introducing a framework, commit its dependency manifest and lockfile, and document the exact installation, local development, build, and test commands here. Keep generated outputs and installed dependencies out of version control.

## Coding Style & Naming Conventions

Preserve the UTF-8 encoding and Traditional Chinese terminology of the requirements note. Use descriptive filenames and consistent names for request fields, categories, urgency levels, and processing states.

Follow the formatter and indentation rules of the chosen language once established. Add formatter or linter configuration with the first code contribution rather than relying on undocumented preferences.

## Testing Guidelines

No testing framework or coverage threshold exists yet. Add behavior-focused tests alongside implementation, using descriptive names such as `request-validation.test.ts` if TypeScript is selected.

Cover required fields, accepted categories and urgency values, automatic timestamps, submission failures, and list rendering. If Supabase is introduced, verify access rules independently of the interface. Clarify the note's unresolved status-update permissions before implementing that behavior.

## Commit & Pull Request Guidelines

No Git history is available to establish existing commit conventions. Use concise, imperative messages, for example `docs: clarify repair request fields`.

Pull requests should describe scope, relevant requirements, validation performed, and unresolved decisions. Include screenshots for interface changes and explain database or access-policy changes.

## Security & Configuration

Use fictional names and locations in examples. Never commit secrets or privileged Supabase keys. If database integration is added, document environment variables and enforce access through row-level security policies.

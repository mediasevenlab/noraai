# Product version history

The admin **Разработка** page is the product version log. Source of truth: `webapp/src/features/steps/model.ts` (`STEP_ITEMS`). Current version is always the last entry (`STEPS_META.currentVersion`). The live UI is `/admin/steps`.

Do not treat npm `package.json` versions as the product version.

## When to add a version

Append a new `STEP_ITEMS` entry (next `v0.x`) when the change is a **new user-visible capability** or a **new product surface**, for example:

- a new role, workspace, or major user journey
- diary, rations, payments, onboarding, or similar product areas going live or changing in a way users would name
- a new integration users feel (Telegram, Gemini/n8n meal analysis, a new client shell)
- a new installable surface (hybrid APK, store build)

One coherent effort = one version. If several related pieces land together, write a single step, not one per file.

## When not to bump

Skip a version for styling, copy, bug fixes, refactors, tests, docs, performance, internal hardening, and sidebar/chrome tweaks that do not change what the product can do.

Do not rewrite past entries. Do not jump to `v1.0` unless the user explicitly asks.

## How to write the entry

- `category`: `Версия · v0.N` (monotonic, never reuse a number)
- `title`: short product name in Russian when the rest of the log is Russian
- `badge`: one English label (`Diary`, `AI`, `Rations`, …)
- `description`: what a non-engineer can now do, in 1–2 sentences; no file lists

`STEPS_META.subtitle`, `itemCount`, `historyLabel`, and `currentVersion` are derived from `STEP_ITEMS` — do not hard-code them.

`STEPS_META.description` stays a short intro paragraph. Do not append version details to it; those belong only in `STEP_ITEMS`.

After adding a step, run `bun test tests/steps-model.test.ts` from `webapp`. In the completion report, say that **Разработка** was updated and name the new current version. If the work was not version-worthy, say the log was left unchanged.

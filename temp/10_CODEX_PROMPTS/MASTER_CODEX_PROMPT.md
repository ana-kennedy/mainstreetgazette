# Master Prompt for Codex in VS Code

You are implementing the Main Street Gazette experience redesign in the attached Expo React Native TypeScript project.

Read all files in this handoff package before editing. Treat `MAIN_STREET_GAZETTE_CONSTITUTION.md` and the numbered phase files as requirements.

Implementation rules:
1. Work one phase at a time in numerical order.
2. Before each phase, inspect the existing components/services and reuse working code where practical.
3. Do not remove legacy functionality until its replacement is implemented and tested.
4. Keep exactly three root tabs: News, Explore, For You. Settings is a gear action from each root tab.
5. Preserve accessibility semantics and improve them according to the standard.
6. Do not expose RSS, cache, parser, API, metadata, source library, or developer language in normal UI.
7. Add migrations for persisted settings/data whenever models change.
8. Run `npm run typecheck` after each logical change and fix all errors before proceeding.
9. Provide a short change log, files changed, migration notes, and manual test list at the end of every phase.
10. Stop after each phase so the owner can review before continuing.

Begin with Phase 00. Do not jump directly to visual changes.

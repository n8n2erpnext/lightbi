# Gemini Coordination Notes

You are working in the same repository as Codex.

Before editing:
- Run `git status --short` and avoid overwriting unrelated user or Codex changes.
- Prefer small, focused changes that match the existing code style.
- If you need Codex to review or continue, write a short handoff in `AGENT_HANDOFF.md`.

While coding:
- Keep implementation changes close to the requested files and behavior.
- Do not delete untracked reports, screenshots, CSV files, or audit documents unless the user explicitly asks.
- After each meaningful change, run the narrowest relevant test/build command and note the result.

Current coordination request:
- Codex is observing repo changes from this VPS.
- Leave a concise summary of intent, touched files, and verification status in `AGENT_HANDOFF.md` when you pause.

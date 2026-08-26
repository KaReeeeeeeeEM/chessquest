# Desktop Product Prompt

## Purpose
Guide an AI agent through building a complete desktop product from a Devcanon product brief.

## Philosophy
Feel native, keep local data safe, and make installation and updates understandable.

## Best Practices
- Read `.ai/product.md` and `.ai/prompts/build-product.md` first.
- Design keyboard, window sizing, local filesystem, update, and offline behavior together.
- Minimize privileged capabilities and validate every filesystem path.

## Rules
- Follow the selected framework, language, database, and tools.
- Do not execute interpolated shell strings or access files outside user-approved scope.
- Verify packaging and the primary journey on supported operating systems.

## Examples
For a local editor, verify opening a project, editing, autosaving, failure recovery, updates, and restart behavior.

## Anti-patterns
Web-only assumptions, hidden filesystem writes, or unverified installers.

## Checklist
- [ ] Keyboard, resizing, offline, local data, and recovery behavior work.
- [ ] Privileged operations are narrow and validated.
- [ ] Installers and updates are tested for supported platforms.

# Web Product Prompt

## Purpose
Guide an AI agent through building a complete web product from a Devcanon product brief.

## Philosophy
Start with the user journey, keep the stack simple, and verify the product in a real browser.

## Best Practices
- Read `.ai/product.md` and `.ai/prompts/build-product.md` first.
- Separate frontend, backend, and data responsibilities clearly.
- Build responsive, accessible default, loading, empty, error, and success states.

## Rules
- Follow the selected frontend, backend, database, and data-tool choices.
- Preserve existing repository conventions and mandatory safeguards.
- Verify the main journey from browser interaction through persisted data.

## Examples
For a booking product, verify discovery, selection, confirmation, persistence, and recovery from a failed request.

## Anti-patterns
Building disconnected screens, inventing requirements, or calling mock-only flows complete.

## Checklist
- [ ] The primary user journey works end to end.
- [ ] Mobile, keyboard, accessibility, security, and failure behavior are verified.
- [ ] The result matches the product brief and any attached design direction.

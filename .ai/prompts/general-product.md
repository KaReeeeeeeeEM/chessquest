# General Product Prompt

## Purpose
Guide an AI agent when the product type or stack is intentionally undecided.

## Philosophy
Ask only what materially changes the outcome, then choose the simplest maintainable path.

## Best Practices
- Read `.ai/product.md` and `.ai/prompts/build-product.md` first.
- Inspect the repository before recommending tools.
- Explain stack recommendations in plain language with one clear default.

## Rules
- Do not begin a costly architecture choice without resolving a truly blocking unknown.
- Preserve existing repository conventions and mandatory safeguards.
- Build and verify one complete user journey before expanding scope.

## Examples
Offer one recommended stack and at most one meaningful alternative, explaining the tradeoff without jargon.

## Anti-patterns
Long technology menus, speculative infrastructure, or using questions to avoid making safe defaults.

## Checklist
- [ ] The outcome and user are clear enough to build.
- [ ] Stack choices are simple and justified.
- [ ] The primary journey is complete and verified.

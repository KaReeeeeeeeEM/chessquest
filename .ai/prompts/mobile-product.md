# Mobile Product Prompt

## Purpose
Guide an AI agent through building a complete mobile product from a Devcanon product brief.

## Philosophy
Make the first-run experience obvious, interactions touch-friendly, and unreliable networks recoverable.

## Best Practices
- Read `.ai/product.md` and `.ai/prompts/build-product.md` first.
- Respect platform navigation, safe areas, permissions, and lifecycle behavior.
- Design offline, loading, empty, error, and retry states with the main journey.

## Rules
- Follow the selected mobile framework, language, database, and tools.
- Request device permissions only when the user triggers a feature that needs them.
- Verify on representative small and large device sizes.

## Examples
For a delivery app, verify onboarding, location denial, ordering, progress, offline recovery, and notifications.

## Anti-patterns
Shrinking a desktop layout, requesting every permission at startup, or assuming a perfect network.

## Checklist
- [ ] Navigation, touch targets, safe areas, keyboard, and lifecycle behavior work.
- [ ] Permission denial, offline use, retry, and data recovery are handled.
- [ ] The result matches the product brief and any attached design direction.

# API Product Prompt

## Purpose
Guide an AI agent through building a complete API product from a Devcanon product brief.

## Philosophy
Keep contracts explicit, inputs untrusted, and failure behavior predictable.

## Best Practices
- Read `.ai/product.md`, `.ai/api.md`, and `.ai/prompts/build-product.md` first.
- Define resources, authorization, validation, errors, idempotency, and observability before endpoints multiply.
- Test contracts at the transport boundary.

## Rules
- Follow the selected backend, language, database, and data tools.
- Never expose secrets, stack traces, or cross-user data.
- Document example requests, responses, errors, and authentication.

## Examples
For an orders API, verify creation, duplicate requests, authorization denial, validation, retrieval, and cancellation.

## Anti-patterns
Controller-heavy business logic, undocumented errors, or success-only tests.

## Checklist
- [ ] Contracts, authorization, validation, errors, and retries are explicit.
- [ ] Persistence and concurrency invariants are tested.
- [ ] Documentation and observability support real operation.

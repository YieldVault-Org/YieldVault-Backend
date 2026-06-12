# Contributing

Thanks for your interest in improving the YieldVault backend. This is a mock,
in-memory service intended for development and demos, so contributions should
keep it lightweight and dependency-light.

## Getting started

```bash
npm install
cp .env.example .env
npm start
```

## Project layout

- `src/routes` — Express routers, one file per resource.
- `src/controllers` — thin HTTP handlers that delegate to services.
- `src/services` — business logic (vault, position, yield, analytics, stellar).
- `src/utils` — pure helpers (math, finance, fees, time, ids, pagination).
- `src/middleware` — cross-cutting concerns (validation, security, errors).
- `test/` — Node's built-in test runner specs.

## Guidelines

- Keep controllers thin; put logic in services and pure helpers in `utils`.
- Prefer the built-in toolchain. Avoid adding runtime dependencies unless there
  is no reasonable in-process alternative.
- Validate request bodies with the `validateBody` middleware rather than
  hand-rolling checks in controllers.
- Throw the helpers in `utils/errors` (e.g. `badRequest`, `notFound`) so the
  central error handler can produce consistent JSON responses.
- Every new file must pass `node --check`.

## Testing

Add a `*.test.js` spec under `test/` for new pure helpers and run:

```bash
npm test
```

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/), for example
`feat(vaults): add stats endpoint` or `fix(math): guard zero shares`.

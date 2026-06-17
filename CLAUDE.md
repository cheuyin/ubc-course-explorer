# UBC Course Explorer

A monorepo exploring UBC course-grade and campus-facility data (the InsightUBC
dataset: grade distributions, instructors, years, departments, rooms/buildings —
**no** prerequisites, descriptions, schedules, or term offerings).

## Layout
- `backend/` — Express 5 + TypeScript API (file-based store, no DB). Runs on port 4321.
- `frontend/` — React 19 + Vite, **Tailwind CSS v4 + shadcn/ui (Base UI primitives)** for the UI (glassy, dark-mode-default), with `react-router-dom` and `@tanstack/react-query`. `recharts` for charts.

## Conventions
- **Package manager: yarn.** Use `yarn install`, `yarn add <pkg>`, `yarn <script>`.
  Do not use npm or create `package-lock.json` (the repo is yarn-only; `yarn.lock` is authoritative).
- **shadcn/ui uses Base UI primitives**, not Radix. To render a component as another
  element (e.g. a router `Link`), use the Base UI `render` prop
  (`<Button render={<Link to="…" />}>`), **not** Radix's `asChild`.
- **Adding shadcn components:** yarn 1 has no `dlx`, so invoke the CLI with
  `npx shadcn@latest add <name>` (npx is only the runner; shadcn detects `yarn.lock`
  and installs deps with yarn).

## Running
- From `frontend/`: `yarn dev` runs Vite (with an `/api` proxy to the backend) and the backend together via `concurrently`.
- The backend reads its dataset from `DATA_DIR` (the dev script uses `frontend/demo_data`).

## API notes
- Search lives at `POST /api/v2/search` (DSL: `WHERE` / `OPTIONS` / `TRANSFORMATIONS`).
  It caps **matched rows at 5000 before** transformations run, so unfiltered
  `GROUP` aggregations over sections will exceed the cap — filter first, or derive
  from the paginated `/api/v1/courses` list instead.
- A course id is `dept` + `code` (e.g. `cpsc110`); search results expose only
  `dept` + `code`, so reconstruct the id from those to link to a course.

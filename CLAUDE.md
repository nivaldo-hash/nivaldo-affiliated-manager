# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # Start Vite dev server with HMR
pnpm build      # tsc -b + Vite bundle → dist/
pnpm lint       # ESLint
pnpm preview    # Preview production build locally
```

No test suite exists in this project.

## Architecture

**Nivaldo Affiliated Manager** is a React + TypeScript dashboard that reads from a Monday.com board and displays projects across two locations (Colorado and Michigan). It supports inline status updates, sub-item tracking, and AI executive summary generation via an n8n webhook.

**Stack:** React 19, TypeScript, Vite 8, Tailwind CSS 4, `@mondaydotcomorg/api` (GraphQL).

### Data flow

1. `useMondayBoard` (hook) calls `fetchBoardData()` in `src/api/monday.ts` on mount.
2. `App.tsx` receives the raw board items and filters them client-side by location.
3. `Dashboard.tsx` paginates and renders `ProjectRow` components; each `ProjectRow` expands into `SubitemRow` children.
4. Status mutations (`updateItemStatus`, `updateSubitemStatus`) are called directly from the row components and update Monday.com via the same API module.
5. Summary generation posts to a `VITE_N8N_SUMMARY_WEBHOOK` URL and `SummaryModal` polls for the result.

### Key files

| File | Responsibility |
|------|---------------|
| `src/api/monday.ts` | **All Monday.com GraphQL calls** — queries, mutations, user caching, n8n trigger |
| `src/config/columns.ts` | Hardcoded board ID, column IDs, location/status constants, status color map |
| `src/hooks/useMondayBoard.ts` | Loads board data on mount, exposes `{ items, loading, error }` |
| `src/components/Dashboard.tsx` | Header, `StatusSummary`, pagination, project list |
| `src/components/SummaryModal.tsx` | Polls n8n webhook with retry/timeout logic |

### Environment variables

Stored in `.env` (committed). Vite exposes them as `import.meta.env.VITE_*`:

- `VITE_N8N_SUMMARY_WEBHOOK` — n8n webhook URL for summary generation
- `VITE_BOARD_ID` — Monday.com board ID (also hardcoded fallback in `columns.ts`)

### Styling

Tailwind 4 with `@theme` tokens in `src/index.css` (no `tailwind.config.js`). Fonts: Geist (UI), JetBrains Mono (code). Icons: Material Symbols Outlined via Google Fonts.

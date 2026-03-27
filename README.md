# Claims Host

A React + TypeScript + Vite host shell application for the Claims Manual Review
workflow. Loads the Member Search and Employer Group Search micro-frontends via
Module Federation at runtime, and serves the Manual Review Dashboard and Client
Manual Match Dashboard pages.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Mock Server](#mock-server)
- [Module Federation](#module-federation)
- [Testing](#testing)
- [Linting & Formatting](#linting--formatting)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
Browser
  └── React (v19) + React Router v7
        ├── MUI (Material UI v7) — component library & theming
        ├── React Hook Form + Zod — search form validation
        ├── Module Federation (host) — loads remote MFEs at runtime
        │   ├── memberSearchApp     → http://localhost:3002/remoteEntry.js
        │   └── employerGroupSearchApp → http://localhost:3003/remoteEntry.js
        └── claimsApi — fetch wrapper for all API calls
```

Pages:

- **ManualReviewDashboard** — Search Criteria collapsible (search by EDP or Client Claim ID) + Claim Counts collapsible (summary table with clickable queue navigation)
- **ClientManualMatchDashboard** — Claim Information collapsible with actions + tabbed Member Search and Employer Group Search MFE panels, auto-searched with `ccode` and `network` from the loaded claim

All data fetching goes through `src/services/claimsApi.ts`, which reads
`VITE_API_MODE` to decide whether to proxy through the mock server (`"mock"`) or
a live backend (`"live"`).

---

## Prerequisites

| Tool                      | Required version                                                  |
| ------------------------- | ----------------------------------------------------------------- |
| Node.js                   | `>=20.16.0` (use [nvm](https://github.com/nvm-sh/nvm): `nvm use`) |
| npm                       | `>=10` (bundled with Node 20)                                     |
| Mock server               | See [mock-server README](../../mock-server/README.md)             |
| Member Search MFE         | Running on port 3002 — see its own repo                           |
| Employer Group Search MFE | Running on port 3003 — `apps/group-search` in this repo           |

> **Tip:** An `.nvmrc` is included. Run `nvm use` in the project root to switch automatically.

---

## Getting Started

```bash
# 1. Start the mock server first (separate terminal)
cd mock-server
npm install
npm run dev

# 2. Start MFE remotes (separate terminals — required for MFE panels)
#    Member Search: see its own repo (port 3002)
cd apps/group-search && npm install && npm run dev   # port 3003

# 3. Install and start the host
cd apps/claims-host
cp .env.example .env
npm install
npm run dev
```

App runs at **http://localhost:5173** by default.

---

## Available Scripts

| Command                | Description                                                    |
| ---------------------- | -------------------------------------------------------------- |
| `npm run dev`          | Start Vite dev server with HMR on port 5173                    |
| `npm run build`        | Type-check then produce optimised production bundle in `dist/` |
| `npm run preview`      | Serve the production build locally for smoke-testing           |
| `npm run typecheck`    | Run `tsc --noEmit` without building                            |
| `npm run lint`         | Run ESLint across all source files                             |
| `npm run lint:fix`     | Run ESLint and auto-fix fixable issues                         |
| `npm run format`       | Run Prettier across all source files                           |
| `npm run format:check` | Check formatting without writing changes (used in CI)          |

---

## Environment Variables

All client-side variables **must** be prefixed with `VITE_` to be exposed to the
browser bundle.

| Variable                 | Required                  | Default                 | Description                                                                            |
| ------------------------ | ------------------------- | ----------------------- | -------------------------------------------------------------------------------------- |
| `VITE_API_MODE`          | Yes                       | `"mock"`                | `"mock"` routes API through the local mock server; `"live"` routes to the real backend |
| `VITE_MOCK_API_BASE_URL` | When `VITE_API_MODE=mock` | `http://localhost:3001` | Base URL for the mock API server                                                       |
| `VITE_API_BASE_URL`      | When `VITE_API_MODE=live` | —                       | Base URL for the real backend. Inject via CI/CD secrets — never commit real values     |

Copy `.env.example` → `.env` and set values. **Never commit `.env` to source control.**

---

## Project Structure

```
src/
├── components/
│   ├── ClaimsTable/
│   │   ├── ClaimsTable.tsx          — summary table with queue navigation
│   │   ├── useClaimsData.ts         — data-fetching hook
│   │   └── utils.ts                 — style constants + cell helpers
│   ├── shared/
│   │   ├── Collapsible.tsx          — reusable accordion wrapper
│   │   └── NotFoundDialog.tsx       — "Halted Claim Not Found" dialog
│   ├── ClaimInformationPanel.tsx    — claim fields + Update CCode / Pend / Deny actions
│   ├── ClaimsSearchForm.tsx         — search by EDP Claim ID or Client Claim ID
│   ├── EmployerGroupSearchPanel.tsx — MFE host panel (Module Federation)
│   ├── EmployerGroupSearchSkeleton.tsx — offline stub for EGS MFE
│   ├── MemberSearchPanel.tsx        — MFE host panel (Module Federation)
│   ├── MemberSearchSkeleton.tsx     — offline stub for Member Search MFE
│   ├── TopBanner.tsx
│   └── BottomBanner.tsx
├── pages/
│   ├── ManualReviewDashboard.tsx    — search + claims counts table
│   └── ClientManualMatchDashboard.tsx — claim detail + MFE panels
├── services/
│   └── claimsApi.ts                 — all API methods
├── types/
│   └── claims.ts                    — shared TypeScript interfaces
├── App.tsx                          — layout shell (TopBanner / Outlet / BottomBanner)
├── main.tsx                         — router setup + theme bootstrap
├── module-federation.d.ts           — ambient type declarations for MFE remotes
├── theme.ts                         — MUI theme factory
├── ThemeModeProvider.tsx            — dark/light mode context
└── vite-env.d.ts                    — typed ImportMetaEnv
```

---

## Mock Server

The mock server lives in **`mock-server/`** at the repo root and runs independently.

```bash
cd mock-server
npm install
npm run dev    # nodemon — auto-restarts on file changes
```

Listens on **http://localhost:3001** by default.

Once running, confirm your `.env` has:

```
VITE_API_MODE="mock"
VITE_MOCK_API_BASE_URL=http://localhost:3001
```

### Searchable test claims

| Claim Number    | Client Claim ID | Stream | Result                                   |
| --------------- | --------------- | ------ | ---------------------------------------- |
| `272120489`     | `CLT-HEOS-001`  | HEOS   | Found → navigates to Client Manual Match |
| `272120490`     | `CLT-HEOS-002`  | HEOS   | Found → navigates to Client Manual Match |
| `272120491`     | `CLT-HEOS-003`  | HEOS   | Locked → shows Not Found dialog          |
| `273010100`     | `CLT-ALC-001`   | ALC    | Found → navigates to Client Manual Match |
| Any other value | —               | —      | Not found → shows Not Found dialog       |

---

## Module Federation

This app is the **host**. It consumes two remote MFEs declared in `vite.config.ts`:

| Remote name              | Entry point                            | Port |
| ------------------------ | -------------------------------------- | ---- |
| `memberSearchApp`        | `http://localhost:3002/remoteEntry.js` | 3002 |
| `employerGroupSearchApp` | `http://localhost:3003/remoteEntry.js` | 3003 |

MFE panels load lazily inside a `<Suspense>` boundary. If a remote is unavailable,
the panel shows a loading spinner indefinitely — use the `*Skeleton` stub components
during development when a remote is not running.

**Consuming the remotes in this host:**

```tsx
// Member Search
const MemberSearchWidget = React.lazy(
  () => import('memberSearchApp/MemberSearchWidget')
);
<MemberSearchWidget
  network={claim.network}
  ccode={claim.insuredId}
  autoSearch
/>;

// Employer Group Search
const EmployerGroupSearchWidget = React.lazy(
  () => import('employerGroupSearchApp/EmployerGroupSearchWidget')
);
<EmployerGroupSearchWidget
  ccode={claim.insuredId}
  network={claim.network}
  autoSearch
/>;
```

Full prop contracts are declared in `src/module-federation.d.ts`.

Shared singletons (React, MUI, Emotion) are declared in `vite.config.ts` to
prevent version conflicts across the federation boundary.

---

## Testing

> No automated test suite exists in this project yet.
> See `KNOWN_ISSUES.md` KI-006 for the plan and priority targets.

Manual verification steps:

1. Start mock server + both MFE remotes + host
2. Search for claim `272120489` → should navigate to Client Manual Match Dashboard
3. Search for claim `272120491` → should show "Halted Claim Not Found" dialog
4. Search for a non-existent value → should show "Halted Claim Not Found" dialog
5. Click a non-zero count in the Claim Counts table → should load next queue claim
6. Verify Member Search and Employer Group Search panels auto-search on tab load

---

## Linting & Formatting

- **ESLint** — TypeScript-aware rules via `typescript-eslint`
- **Prettier** — opinionated formatting; config in `prettier.config.js`
- `eslint-config-prettier` disables any ESLint rules that conflict with Prettier

```bash
npm run lint          # check only
npm run lint:fix      # auto-fix
npm run format        # write formatting fixes
npm run format:check  # check only (for CI)
```

---

## Troubleshooting

**`ECONNREFUSED` / API calls failing in dev**
: The mock server is not running. Start it first: `cd mock-server && npm run dev`.

**`VITE_*` variable is `undefined` at runtime**
: You either forgot to copy `.env.example` → `.env`, or added a variable without
the `VITE_` prefix. Restart the dev server after any `.env` change.

**TypeScript errors on MFE imports**
: Confirm `src/module-federation.d.ts` exists and declares both remote modules.

**MFE panel shows loading spinner indefinitely**
: The remote MFE is not running. Start `member-search` on 3002 and/or `group-search`
on 3003, or temporarily swap the panel for its `*Skeleton` stub component.

**"Halted Claim Not Found" shown for a claim that exists in mock data**
: The claim may have `status: "LOCKED"` in `mock-server/data/haltedClaims.json`.
Locked claims intentionally return a not-found response — see `272120491` as an example.

**Port 5173 already in use**
: Kill the process (`lsof -i :5173`) or override: `vite --port 5174`.

**Module Federation remote not loading after build**
: Ensure `build.target: 'esnext'` is set in `vite.config.ts`. Module Federation
with `@module-federation/vite` requires ESNext output to work correctly.

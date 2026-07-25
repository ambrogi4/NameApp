---
name: project-context
description: >
  Load this skill at the start of EVERY session working on NameApp.
  Contains full architecture, schema, file map, critical patterns, and
  deployment details for this Flask + React + PostgreSQL personal CRM.
  Use whenever resuming work, debugging, adding features, or any time
  project context is needed. Also read progress.md in this same directory
  before doing any work.
---

# NameApp — Personal CRM

## Architecture

Single-container Flask + React app backed by PostgreSQL, deployed via Docker Compose.

```
Frontend (React 19 + AG Grid v35) → Flask API (/api/*) → PostgreSQL 13
                                   ↘ Static files (/)
```

- **Backend**: Flask 3.0 with SQLAlchemy ORM (modular: `backend/app.py`, `models.py`, `routes/`, `services/`)
- **Frontend**: React 19 with AG Grid Community v35 (`frontend/src/`)
- **Database**: PostgreSQL 13 (via Docker Compose)
- **AI**: Anthropic Claude Haiku 4.5 for parsing LinkedIn profiles, conference pages, and URLs
- **Deployment**: Multi-stage Dockerfile (node build → python runtime), 4 Docker Compose instances on ports 5000–5003
- **Access**: Tailscale (100.121.134.27) for multi-machine access; no auth (internal tool)

## Database Schema

### contact (21 columns)
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | auto |
| created_date | DateTime | defaults to now |
| first, last | Text | NOT NULL |
| title, firm | Text | job title, company |
| source, education | Text | |
| tags, comment | Text | comma-separated tags |
| email, phone | Text | |
| street, city, state, zip, country | Text | address fields |
| li_url, photo_url | Text | LinkedIn URL, photo |
| in_crm | Boolean | CRM sync flag |
| index_1, index_2 | Integer | custom indices |

### content (10 columns)
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | auto |
| type | Text | pdf, youtube, article, podcast, webinar |
| short_name | Text | 2–4 word slug |
| title, author | Text | |
| created_date | Date | defaults to today |
| publish_date | Date | optional |
| link | Text | URL |
| tags, comment | Text | |

### activity (11 columns)
| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | auto |
| contact_id | Integer FK → contact | NOT NULL, cascade delete |
| content_id | Integer FK → content | nullable, set null on delete |
| activity_date | Date | defaults to today |
| channel | Text | linkedin, email, phone, text, in_person, other |
| contact_responded, email_opened, in_crm | Boolean | |
| topic, comment | Text | |
| created_at | DateTime | defaults to now |

## API Endpoints

All prefixed with `/api`.

### Contacts
- `GET /contacts` — list all
- `POST /contacts` — create one
- `POST /contacts/batch` — create multiple
- `PUT /contacts/<id>` — update
- `DELETE /contacts/<id>` — delete (cascades to activities)

### Content
- `GET /content` — list all
- `POST /content` — create
- `PUT /content/<id>` — update
- `DELETE /content/<id>` — delete (nullifies activity FK)

### Activities
- `GET /activities[?contact_id=N]` — list, optionally filtered
- `POST /activities` — create (validates contact_id required, channel enum)
- `PUT /activities/<id>` — update
- `DELETE /activities/<id>` — delete

### AI Parsing
- `POST /contacts/parse-linkedin` — `{ text }` → structured contact fields via Claude
- `POST /contacts/parse-conference` — `{ text }` → `{ speakers: [...] }` via Claude
- `POST /content/fetch-url` — `{ url }` → auto-detects type (YouTube/PDF/HTML), fetches content, returns structured metadata via Claude

### Config
- `GET /config` — `{ instanceName, instanceColor }` from env vars

## File Map

### Backend
| File | Purpose |
|------|---------|
| `backend/app.py` | Flask app factory, config, static serving (~70 lines) |
| `backend/extensions.py` | db, migrate instances (breaks circular imports) |
| `backend/models.py` | Contact, Content, Activity SQLAlchemy models |
| `backend/routes/__init__.py` | Blueprint registration |
| `backend/routes/contacts.py` | Contact CRUD + parse-linkedin + parse-conference |
| `backend/routes/content.py` | Content CRUD + fetch-url |
| `backend/routes/activities.py` | Activity CRUD |
| `backend/routes/query.py` | Natural language query endpoint |
| `backend/services/llm.py` | Shared Claude API helpers, JSON parsing, enums |
| `backend/Dockerfile` | Multi-stage: node builds frontend, python serves everything |
| `backend/requirements.txt` | Flask, SQLAlchemy, Flask-Cors, Flask-Migrate, anthropic, beautifulsoup4, pypdf |
| `backend/migrations/` | Alembic migrations (baseline + timestamps) |

### Frontend
| File | Purpose |
|------|---------|
| `frontend/src/App.js` | Main component: tab routing, data fetching, event handlers, keyboard shortcuts, modal orchestration |
| `frontend/src/ContactTable.js` | AG Grid for contacts: 22 cols in 5 collapsible groups, paste support, tag mgmt, dupe detection |
| `frontend/src/ActivityTable.js` | AG Grid for activities: FK dropdowns (contact/content), prefill from other tabs, channel enum |
| `frontend/src/ContentTable.js` | AG Grid for content: type enum, tag mgmt, URL column |
| `frontend/src/gridUtils.js` | Shared constants (CHANNELS, CONTENT_TYPES, field lists), `isPinnedRow`, `createEmptyRow`, `confirmBulkDelete` |
| `frontend/src/SelectCellEditor.js` | Custom AG Grid dropdown editor for FK columns (numeric values, nullable) |
| `frontend/src/SetFilter.js` | Data-type-aware filter: auto-detects boolean/number/date/text, contextual operators |
| `frontend/src/apiService.js` | All API calls using relative `/api` base URL |
| `frontend/src/dupeUtils.js` | `findDuplicate` (LinkedIn URL → name match), `findDuplicates` (batch), `computeMergeFields` (merge decisions) |
| `frontend/src/LinkedInImportModal.js` | Paste LinkedIn profile text → parse → create/merge contact |
| `frontend/src/LinkedInUpdateModal.js` | Update existing contact from LinkedIn profile text |
| `frontend/src/ConferenceImportModal.js` | Paste conference page → parse speakers → batch import |
| `frontend/src/DupeReviewModal.js` | Side-by-side merge UI for duplicate contacts |
| `frontend/src/FancyFilterPage.js` | Advanced cross-entity filtering page |
| `frontend/src/FancyFilterPanel.js` | Filter panel with condition builder |
| `frontend/src/fancyFilterTemplates.js` | Predefined filter templates |
| `frontend/src/ReportsPage.js` | Analytics/reports tab |
| `frontend/src/ContentUrlFetcher.js` | URL input → auto-fetch metadata for new content |
| `frontend/src/TagModal.js` | Add/remove tags on selected rows |
| `frontend/src/TypeAheadInput.js` | Autocomplete text input |

### Infrastructure
| File | Purpose |
|------|---------|
| `docker-compose.yml` | 4 instances: work (:5000), charity (:5001), atc (:5002), test (:5003) — each with own DB |
| `.env` | ANTHROPIC_API_KEY |

## Critical Patterns

### AG Grid v35 Community Constraints
- **No Enterprise clipboard** — paste handled via browser `paste` event listener on grid container div
- **Module API**: uses `AllCommunityModule` + `AgGridProvider` wrapper
- **Theme**: `themeBalham` JS object (not CSS class)
- **singleClickEdit disabled** — allows cell selection without entering edit mode (needed for paste & keyboard nav)

### React Stale Closure Prevention
- `columnDefs` useMemo must have NO callback dependencies — otherwise AG Grid recreates columns, resetting groups/sort/filters
- All callbacks (onDelete, onNewActivity, etc.) stored in refs: `onDeleteRef.current = onDelete`
- Pinned row save reads from `newRowRef.current`, not closure-captured state
- Same ref pattern for paste handler (`onPasteRowsRef`)

### Tab Persistence
- Tabs use `display: none` instead of conditional rendering (`{tab === 'x' && ...}`) to preserve grid state (column groups, sort, filters) across tab switches

### Duplicate Detection
1. LinkedIn URL exact match (case-insensitive)
2. First + last name match (case-insensitive)
3. Intra-batch dedup on batch import
4. Merge logic: source always keeps existing; gap-fill from incoming; existing never erased unless user chooses

### Keyboard Shortcuts
**Global (App.js):**
- `Alt+G` — global contact lookup
- `Alt+I` — LinkedIn import, `Alt+K` — conference import
- `Alt+X` — clear all filters and search
- `Alt+A/C/N/F/R` — switch to Activities/Contacts/Content/Filter/Reports tab
- `Alt+Up/Down` — cycle tabs

**Per-Grid:**
- `Escape` — deselect, `Delete` — delete selected (bulk confirmation for 6+)
- `Alt+U` — open URL from focused cell
- `Alt+L` — Google search for LinkedIn (contacts)
- `Alt+D` — LinkedIn update modal (contacts)
- `Alt+A` — new activity for focused contact/content
- `Ctrl+Enter` / `Alt+Enter` — save new row
- `Shift+Alt+Left/Right` — pagination

### API Communication
- `apiService.js` uses relative `/api` base (not `http://localhost:5000/api`) — works from any host
- All functions: `apiGet`, `apiPost`, `apiPut`, `apiDelete` with `response.ok` checking

### Deployment
- `docker-compose build backend_work && docker-compose stop backend_work && docker-compose rm -f backend_work && docker-compose up -d backend_work`
- Service names: `backend_work`, `backend_charity`, `backend_atc`, `backend_test`
- Must stop + rm before up after rebuild (docker-compose v1.29.2 `ContainerConfig` bug)
- Env vars per instance: `INSTANCE_NAME`, `INSTANCE_COLOR`, `DATABASE_URL`, `ANTHROPIC_API_KEY`

## Dependencies

### Backend (Python)
Flask 3.0, Flask-SQLAlchemy 3.1, Flask-Cors 4.0, Flask-Migrate 4.0, psycopg2-binary 2.9, anthropic, requests, beautifulsoup4, pypdf

### Frontend (Node)
React 19.2, react-dom 19.2, ag-grid-community 35.1, ag-grid-react 35.1, react-scripts 5.0

## Session Continuity

Before starting any new work, read `progress.md` in this same directory to understand:
- What was completed in prior sessions
- Current work-in-progress
- Known bugs / tech debt
- Planned next steps

At the end of each session, update `progress.md` to reflect what changed.

## Standing Rules

- **Never add authentication** — this is an intentional internal-only tool
- **Never switch from AG Grid Community** — Enterprise features are intentionally excluded
- **Always use relative `/api` paths** in frontend — never hardcode localhost
- **Always `down` before `up`** after a backend rebuild (docker-compose v1.29.2 bug)
- **Never add callback dependencies to `columnDefs` useMemo** — causes AG Grid to reset column groups, sort, and filters
- **Schema changes require an Alembic migration** — never mutate the DB directly
- **Keep all instances in sync** — changes to one instance's schema/code apply to all four

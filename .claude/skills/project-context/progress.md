# NameApp — Progress Log

## Completed
- Core CRUD for contacts, activities, content (all three AG Grid tables)
- AG Grid tables with column groups, filtering, sorting, pagination
- LinkedIn import modal (paste profile text → parse → create/merge contact)
- LinkedIn update modal (update existing contact from profile text)
- Conference import modal (batch speaker parsing from conference page)
- Content URL fetcher (YouTube/PDF/HTML auto-detection via Claude)
- Duplicate detection: LinkedIn URL match, name match, intra-batch dedup
- DupeReviewModal: side-by-side merge UI
- TagModal: add/remove tags on selected rows
- FancyFilter page with condition builder and predefined templates
- Reports page (ReportsPage.js)
- Multi-instance Docker Compose: 4 instances on ports 5000–5003
- Tailscale access (100.121.134.27)
- Keyboard shortcuts (global + per-grid)
- Stale closure fix: columnDefs useMemo + ref pattern for callbacks
- Tab persistence via display:none (preserves grid state across tab switches)

## In Progress
<!-- Update this at the start/end of each session -->

## Completed (2026-07-25)
- **Major refactor: Split app.py monolith (826 lines) into modular structure**
  - Created `backend/extensions.py` — db, migrate instances (breaks circular imports)
  - Created `backend/models.py` — Contact, Content, Activity SQLAlchemy models
  - Created `backend/services/llm.py` — shared Claude API helpers, JSON parsing, enums
  - Created `backend/routes/` with Blueprints:
    - `contacts.py` — Contact CRUD + parse-linkedin + parse-conference
    - `content.py` — Content CRUD + fetch-url
    - `activities.py` — Activity CRUD
    - `query.py` — Natural language query endpoint
    - `__init__.py` — Blueprint registration
  - Refactored `backend/app.py` to 67 lines with app factory pattern
- This refactor prepares codebase for ContactStaging table and enrichment services

## Completed (2026-06-25)
- Fixed Activity table filter dropdowns showing IDs instead of names for Contact/Content columns
  - Added `displayFormatter` support to SetFilter component via `filterParams`
  - Filter now shows "John Smith" instead of "601" in Contact filter, and "Article Name" instead of "13" in Content filter
- Added "Saved Queries" dropdown to Filter page (next to "Select a flex query...")
  - Activities: Activity by channel this week/month/quarter (pivot table output showing channel counts)
  - Contacts: Contacts with tag Target1 with no activity since 2 weeks/1 month/2 months/this quarter
  - Content: Content with no activity
  - Saved queries execute immediately on selection (no Run button needed)
- Renamed existing query dropdown from "Select a query..." to "Select a flex query..."
- Added "Content with no activity since [date]" as a new flex query

## Completed (2026-06-05)
- Added Alt+S keyboard shortcut to focus the global search field (selects existing text)
- Made global search field visible on all tabs (was previously hidden on Filter and Reports)
- Added quickFilterText prop to FancyFilterPage — now filters grid results
- Added quickFilterText prop to ReportsPage — filters weekly activities and all report tables
- Added "Focus Search" menu item to AppMenu under Utilities > View Data

## Known Issues / Tech Debt
<!-- Add as discovered -->

## Up Next
- Add ContactStaging model + migration
- Add staging API routes (CRUD + promote-to-contacts endpoint)
- Add Staging tab in frontend (AG Grid, similar to Contacts)
- Redirect existing import flows to target staging instead of contacts
- Build email guesser service
- Consider browser extension for LinkedIn capture

---
*Update this file at the end of every Claude Code session.*

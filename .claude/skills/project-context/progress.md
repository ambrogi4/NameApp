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

## Completed (2026-08-10) — LinkedIn CR Automation

### LinkedIn Connection Request (CR) Automation
- **Added "Capture Profile + CR" button to Chrome extension** (`extension/`)
  - New green button below "Capture Profile"
  - Sends `source_type: 'linkedin_import_cr'` instead of `'linkedin_import'`
  - Visual feedback shows "+ Connection Request" on capture
  - Refactored popup.js to share capture logic between buttons

- **Backend automation on promotion** (`backend/routes/staging.py`)
  - Added `SOURCE_TYPE_TO_SOURCE` mapping:
    - `linkedin_import` → `Contact.source = 'LinkedIn'`
    - `linkedin_import_cr` → `Contact.source = 'LinkedInCR'`
  - After promotion, if `Contact.source == 'LinkedInCR'`, automatically creates Activity:
    - `channel = 'linkedin'`
    - `topic = 'sent connection request'`
    - `activity_date = today`
  - Works for both single promote and batch promote
  - Works for both create and merge actions

- **Frontend update** (`frontend/src/gridUtils.js`)
  - Added `'linkedin_import_cr'` to `SOURCE_TYPES`

**Workflow:**
1. User browses LinkedIn profiles
2. Click "Capture Profile + CR" for profiles where connection request was sent
3. Profile goes to Staging with `source_type: 'linkedin_import_cr'`
4. On promotion, Contact.source becomes 'LinkedInCR' and Activity is auto-created

**To deploy:**
1. Reload Chrome extension (chrome://extensions → Reload)
2. Rebuild backend: `docker-compose build backend_work && docker-compose stop backend_work && docker-compose rm -f backend_work && docker-compose up -d backend_work`

## Completed (2026-07-29) — Admin Cleanup

### 1. Tab Persistence on Browser Refresh
- **Added localStorage persistence for current tab** (`frontend/src/App.js`)
  - Tab state now initializes from `localStorage.getItem('nameApp_currentTab')`
  - Tab changes are saved to localStorage via `useEffect`
  - Refreshing the browser stays on the current view

### 2. Email Guesser Status Workflow Improvement
- **Updated enrichment_status workflow** (backend + frontend)
  - Old statuses: `pending`, `enriched`, `failed`
  - New statuses: `new`, `pending`, `complete`, `enriched`
- **Workflow:**
  - Record arrives → `enrichment_status = 'new'`
  - User clicks Guess Email → `enrichment_status = 'pending'`
  - No valid email found → `enrichment_status = 'complete'`
  - Email successfully guessed → `enrichment_status = 'enriched'`
- **Backend changes** (`backend/routes/staging.py`):
  - Default `enrichment_status` changed from `'pending'` to `'new'`
  - `/guess-emails` endpoint now sets status to `'pending'` immediately, then `'complete'` on failure or `'enriched'` on success
- **Frontend changes** (`frontend/src/StagingTable.js`):
  - "Guess Email" button only appears when selected rows have `enrichment_status === 'new'`
  - Added `anySelectedEligibleForGuess` computed value
- **gridUtils.js**: Updated `ENRICHMENT_STATUSES` array

### 3. Auto-Refresh Contacts After Promote
- **Added `fetchContacts()` calls after promote operations** (`frontend/src/App.js`)
  - `handlePromoteStagedContact`: refreshes contacts after single promote
  - `handlePromoteStagedBatch`: refreshes contacts after batch promote
  - `handlePromoteReviewMerge`: refreshes contacts after merge
  - `handlePromoteReviewCreateAnyway`: refreshes contacts after create
- **Result**: Contacts table now reflects promoted records without manual browser refresh

## Completed (2026-07-28) — CTO/CIO Quick Filter Button
- **Added "CTO/CIO" quick filter button** to contacts tab (`frontend/src/App.js`)
  - Button appears in app-bar-right, to the left of the global search field
  - Only visible on Contacts tab
  - Applies a regex-based filter to the `title` column
- **Added `matchesAny` filter operator** to SetFilter (`frontend/src/SetFilter.js`)
  - New operator that takes a JSON array of regex patterns in the `term` field
  - Matches if ANY pattern matches (case-insensitive)
  - Enables complex OR-based filtering via programmatic API
- **Filter patterns capture:**
  - "Chief Technology Officer" (anywhere in title)
  - "Chief Information Officer" (anywhere in title)
  - "CTO" at word boundaries (standalone, not within words like "Director")
  - "CIO" at word boundaries (same pattern)
- **Added `setCtoFilter()` method** to ContactTable's imperative handle
  - Programmatically sets the title column filter using `api.setFilterModel()`
- **Alt+X (Clear Filters) clears this filter** along with all other filters
- **Added CSS styling** for `.cto-filter-btn` in App.css

## Completed (2026-07-27) — Staging Duplicate Review Feature
- **Created generic MergeReviewModal component** (`frontend/src/MergeReviewModal.js`)
  - Consolidates duplicate review logic into single reusable component
  - Configurable labels for title, columns, buttons
  - Handles queue of items with pagination "(1 of N)"
  - Used by paste→contacts, paste→staging, and promote→staging workflows
- **Refactored DupeReviewModal** (`frontend/src/DupeReviewModal.js`)
  - Now a thin wrapper around MergeReviewModal with paste-specific labels
- **Refactored StagingPromoteModal** (`frontend/src/StagingPromoteModal.js`)
  - Now uses MergeReviewModal with staging-specific labels
- **Added duplicate review on "Promote Selected"** (`frontend/src/StagingTable.js`, `frontend/src/App.js`)
  - When promoting selected `has_match` records, opens "Promote Review (1 of N)" dialog
  - Allows field-by-field merge decisions (e.g., update firm from old company to new)
  - "Merge & Promote" → updates existing contact, deletes staged record
  - "Skip" → advances without action (keeps staged record)
  - "Create New" → creates as new contact, ignoring match
  - No-match records still promote directly without dialog
- **Added paste support to StagingTable** (`frontend/src/StagingTable.js`)
  - Ctrl+Shift+V paste handler matching ContactTable pattern
  - Tab-delimited parsing with header detection
- **Added staging paste workflow in App.js**
  - New state: `pendingStagedPaste`, `stagingDupeReviewQueue`, `stagingPromoteReviewQueue`
  - Duplicate detection on paste runs against existing contacts
- **Updated PasteConfirmBar** (`frontend/src/PasteConfirmBar.js`)
  - Added `entityLabel` prop for customizable text

**Usage - Promote with Review:**
1. Select has_match staged record(s)
2. Click "Promote Selected"
3. "Promote Review (1 of N)" dialog opens for each
4. Choose existing vs staged values per field (e.g., update stale firm/title)
5. Click "Merge & Promote" to update existing contact

## Completed (2026-07-26) — StagingTable Fixes
- **Fixed column persistence bug** (`frontend/src/StagingTable.js`)
  - Bug: `columnDefs` useMemo had `[contactsById]` dependency, causing AG Grid to reset column state whenever contacts changed
  - Fix: Changed to `contactsByIdRef` (ref pattern) with empty dependency array `[]`, matching ContactTable pattern
  - Column groups, widths, order, and sort now persist across browser sessions
- **Added tag functionality to StagingTable** (`frontend/src/StagingTable.js`)
  - Imported TagModal component
  - Added `tagModal` state, `parseTags`/`joinTags` helpers
  - Added `selectedStagedContacts`, `anySelectedHaveTags` derived values
  - Added `handleAddTags`, `handleDeleteTag`, `handleClearAllTags` callbacks
  - Added toolbar buttons: "Add Tags" (2+ selected), "Delete Tag" + "Clear All Tags" (2+ selected with existing tags)
  - Rendered TagModal for add/delete modes
- Cleaned up unused `DUPE_STATUSES` import

## Completed (2026-07-25) — ContactStaging Feature
- **Added ContactStaging model** (`backend/models.py`)
  - All Contact columns plus staging-specific: source_type, dupe_status, matched_contact_id, email_confidence, enrichment_status
  - `to_dict()` for full serialization, `to_contact_dict()` for promotion
  - FK to contact.id with SET NULL on delete
- **Created Alembic migration** (`backend/migrations/versions/b5c9d4e2f8a1_add_contact_staging.py`)
  - Creates contact_staging table with indexes on dupe_status and matched_contact_id
- **Created staging routes** (`backend/routes/staging.py`)
  - GET /api/staging (with optional dupe_status filter)
  - POST /api/staging (single create with auto dupe detection)
  - POST /api/staging/batch (batch create)
  - PUT /api/staging/:id, DELETE /api/staging/:id
  - POST /api/staging/:id/promote (single promote with merge option)
  - POST /api/staging/promote-batch (batch promote with create/merge/skip actions)
  - POST /api/staging/recheck-dupes
  - Server-side dupe detection: LinkedIn URL match, then name match
- **Frontend API service** (`frontend/src/apiService.js`)
  - Added 8 staging API functions
- **Grid utilities** (`frontend/src/gridUtils.js`)
  - Added SOURCE_TYPES, DUPE_STATUSES, EMAIL_CONFIDENCE_LEVELS, ENRICHMENT_STATUSES, STAGED_CONTACT_FIELDS
- **StagingTable component** (`frontend/src/StagingTable.js`)
  - AG Grid table with Status and Enrichment column groups
  - Color-coded dupe_status badges (has_match=yellow, no_match=green, pending=gray)
  - Toolbar: Save New, Promote All No-Match, Promote Selected, Skip Selected
  - Keyboard: Alt+P to promote focused row
- **StagingPromoteModal component** (`frontend/src/StagingPromoteModal.js`)
  - Side-by-side merge review for has_match contacts
  - Reuses computeMergeFields from dupeUtils.js
  - Actions: Merge into Contact, Create New, Cancel
- **App.js integration**
  - Added 'staging' to TAB_ORDER (between activities and contacts)
  - Added stagedContacts state + staging handlers
  - Added Alt+T keyboard shortcut
  - Added Staging tab button with badge showing count
  - Rendered StagingTable and StagingPromoteModal
- **Redirected import flows to staging**
  - LinkedInImportModal now creates staged contact with source_type: 'linkedin_import'
  - ConferenceImportModal now creates staged contacts with source_type: 'conference_import'
- **CSS**: Added .tab-badge style for staging count badge

**To deploy:**
1. Run migration: `flask db upgrade` on all instances
2. Rebuild and restart: `docker-compose build backend_work && docker-compose stop backend_work && docker-compose rm -f backend_work && docker-compose up -d backend_work`

## Completed (2026-07-25) — Earlier
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
- Build email guesser service (pattern-based corporate email derivation)
- Add "Guess Email" button to StagingTable
- Consider browser extension for LinkedIn capture
- Add URL import flow to staging (ContentUrlFetcher for contacts)
- Add manual staging entry from Contacts tab

---
*Update this file at the end of every Claude Code session.*

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

## Known Issues / Tech Debt
<!-- Add as discovered -->

## Up Next
<!-- What you plan to work on -->

---
*Update this file at the end of every Claude Code session.*

/**
 * Salesforce export utilities
 * Validation and CSV generation for Salesforce contact exports
 */

/**
 * Validates contacts for Salesforce export
 * Required fields: first, last, title, firm, (email OR li_url), country
 * @param {Array} contacts - Array of contact objects
 * @returns {Array} Array of error objects with format: { id, name, missing: [...] }
 */
export function validateContactsForSalesforce(contacts) {
  const errors = [];

  for (const contact of contacts) {
    const missing = [];

    if (!contact.first || contact.first.trim() === '') missing.push('first');
    if (!contact.last || contact.last.trim() === '') missing.push('last');
    if (!contact.title || contact.title.trim() === '') missing.push('title');
    if (!contact.firm || contact.firm.trim() === '') missing.push('firm');

    // Email OR LinkedIn required (at least one)
    const hasEmail = contact.email && contact.email.trim() !== '';
    const hasLinkedIn = contact.li_url && contact.li_url.trim() !== '';
    if (!hasEmail && !hasLinkedIn) {
      missing.push('email/LinkedIn');
    }

    if (!contact.country || contact.country.trim() === '') missing.push('country');

    if (missing.length > 0) {
      const displayName = `${contact.first || ''} ${contact.last || ''}`.trim() || `Contact #${contact.id}`;
      errors.push({
        id: contact.id,
        name: displayName,
        missing: missing
      });
    }
  }

  return errors;
}

/**
 * Escapes a CSV field value
 * Wraps in quotes if contains comma, quote, or newline
 * @param {string} value - Field value
 * @returns {string} Escaped CSV field
 */
function escapeCsvField(value) {
  if (value == null) return '';
  const str = String(value);

  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generates CSV content for Salesforce export
 * Columns: first, last, title, firm, email, LinkedIn, Country
 * @param {Array} contacts - Array of contact objects
 * @returns {string} CSV content with headers
 */
export function generateSalesforceCsv(contacts) {
  const headers = ['first', 'last', 'title', 'firm', 'email', 'LinkedIn', 'Country'];
  const csvRows = [headers.join(',')];

  for (const contact of contacts) {
    const row = [
      escapeCsvField(contact.first || ''),
      escapeCsvField(contact.last || ''),
      escapeCsvField(contact.title || ''),
      escapeCsvField(contact.firm || ''),
      escapeCsvField(contact.email || ''),
      escapeCsvField(contact.li_url || ''),
      escapeCsvField(contact.country || '')
    ];
    csvRows.push(row.join(','));
  }

  return csvRows.join('\n');
}

/**
 * Triggers browser download of CSV file
 * @param {Array} contacts - Array of contact objects
 * @param {string} filename - Desired filename (without .csv extension)
 */
export function downloadSalesforceCsv(contacts, filename) {
  const csv = generateSalesforceCsv(contacts);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Gets current date in YYYY-MM-DD format (browser timezone)
 * @returns {string} Date string
 */
export function getTodayDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Gets date 7 days ago in YYYY-MM-DD format (browser timezone)
 * @returns {string} Date string
 */
export function getWeekAgoDateString() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`;
}

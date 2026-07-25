import React, { useState, useCallback } from 'react';
import FancyFilterPanel from './FancyFilterPanel';
import ContactTable from './ContactTable';
import ActivityTable from './ActivityTable';
import ContentTable from './ContentTable';
import NaturalLanguageQueryInput from './NaturalLanguageQueryInput';

function FancyFilterPage({ contacts, activities, content, onUpdateContact, onUpdateActivity, onCreateActivity, onDeleteActivitiesBatch, onNewActivityForContact, onUpdateContent, onDeleteContentBatch, onNewActivityForContent, quickFilterText }) {
  const [fancyFilterResults, setFancyFilterResults] = useState(null);
  const [fancyFilterResultTable, setFancyFilterResultTable] = useState(null);

  // Natural language query state
  const [nlResults, setNlResults] = useState(null);
  const [nlResultTable, setNlResultTable] = useState(null);
  const [nlLoading, setNlLoading] = useState(false);
  const [nlError, setNlError] = useState('');

  const handleRunFancyFilter = useCallback((template, params) => {
    const data = { contacts, activities, content };
    const results = template.execute(data, params);
    setFancyFilterResults(results);
    setFancyFilterResultTable(template.resultTable);
    // Clear NL results when using structured filter
    setNlResults(null);
    setNlResultTable(null);
    setNlError('');
  }, [contacts, activities, content]);

  const handleRunSaved = useCallback((results, resultType) => {
    setFancyFilterResults(results);
    setFancyFilterResultTable(resultType);
    // Clear NL results when using saved query
    setNlResults(null);
    setNlResultTable(null);
    setNlError('');
  }, []);

  const handleNlResults = useCallback((result) => {
    setNlResults(result.results);
    setNlResultTable(result.resultTable);
    // Clear structured filter results when using NL query
    setFancyFilterResults(null);
    setFancyFilterResultTable(null);
  }, []);

  const handleNlClear = useCallback(() => {
    setNlResults(null);
    setNlResultTable(null);
    setNlError('');
  }, []);

  // Determine which results to show
  const showNlResults = nlResults !== null;
  const showFancyResults = fancyFilterResults !== null && !showNlResults;
  const displayResults = showNlResults ? nlResults : fancyFilterResults;
  const displayResultTable = showNlResults ? nlResultTable : fancyFilterResultTable;

  const resultCount = displayResults ? displayResults.length : null;

  return (
    <div className="filter-page">
      <NaturalLanguageQueryInput
        onResults={handleNlResults}
        onLoading={setNlLoading}
        onError={setNlError}
        onClear={handleNlClear}
      />

      {nlError && (
        <div className="nl-query-error">{nlError}</div>
      )}

      {nlLoading && (
        <div className="nl-query-loading">Thinking...</div>
      )}

      <div className="nl-divider">or use structured filters</div>

      <FancyFilterPanel
        contacts={contacts}
        activities={activities}
        content={content}
        onRun={handleRunFancyFilter}
        onRunSaved={handleRunSaved}
        resultCount={resultCount}
        lightMode
      />
      <div className="filter-grid-container">
        {displayResults && displayResultTable === 'pivot' && (
          <div className="pivot-table-container">
            <table className="pivot-table">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {displayResults.map(row => (
                  <tr key={row.channel}>
                    <td>{row.channel}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
                <tr className="pivot-total">
                  <td><strong>Total</strong></td>
                  <td><strong>{displayResults.reduce((sum, r) => sum + r.count, 0)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {displayResults && displayResultTable === 'contacts' && (
          <ContactTable
            contacts={displayResults}
            onUpdateContact={onUpdateContact}
            onNewActivity={onNewActivityForContact}
            quickFilterText={quickFilterText}
            lookupMode
          />
        )}
        {displayResults && displayResultTable === 'activities' && (
          <ActivityTable
            activities={displayResults}
            contacts={contacts}
            content={content}
            onUpdateActivity={onUpdateActivity}
            onCreateActivity={onCreateActivity}
            onDeleteBatch={onDeleteActivitiesBatch}
            quickFilterText={quickFilterText}
            lookupMode
          />
        )}
        {displayResults && displayResultTable === 'content' && (
          <ContentTable
            content={displayResults}
            onUpdateContent={onUpdateContent}
            onCreateContent={() => {}}
            onDeleteBatch={onDeleteContentBatch}
            onNewActivity={onNewActivityForContent}
            quickFilterText={quickFilterText}
            lookupMode
          />
        )}
      </div>
    </div>
  );
}

export default FancyFilterPage;

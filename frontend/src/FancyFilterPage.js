import React, { useState, useCallback } from 'react';
import FancyFilterPanel from './FancyFilterPanel';
import ContactTable from './ContactTable';
import ActivityTable from './ActivityTable';
import ContentTable from './ContentTable';

function FancyFilterPage({ contacts, activities, content, onUpdateContact, onUpdateActivity, onCreateActivity, onDeleteActivity, onNewActivityForContact, onUpdateContent, onDeleteContent, onNewActivityForContent }) {
  const [fancyFilterResults, setFancyFilterResults] = useState(null);
  const [fancyFilterResultTable, setFancyFilterResultTable] = useState(null);

  const handleRunFancyFilter = useCallback((template, params) => {
    const data = { contacts, activities, content };
    const results = template.execute(data, params);
    setFancyFilterResults(results);
    setFancyFilterResultTable(template.resultTable);
  }, [contacts, activities, content]);

  const resultCount = fancyFilterResults ? fancyFilterResults.length : null;

  return (
    <div className="filter-page">
      <FancyFilterPanel
        contacts={contacts}
        content={content}
        onRun={handleRunFancyFilter}
        resultCount={resultCount}
        lightMode
      />
      <div className="filter-grid-container">
        {fancyFilterResults && fancyFilterResultTable === 'contacts' && (
          <ContactTable
            contacts={fancyFilterResults}
            onUpdateContact={onUpdateContact}
            onNewActivity={onNewActivityForContact}
            quickFilterText=""
            lookupMode
          />
        )}
        {fancyFilterResults && fancyFilterResultTable === 'activities' && (
          <ActivityTable
            activities={fancyFilterResults}
            contacts={contacts}
            content={content}
            onUpdateActivity={onUpdateActivity}
            onCreateActivity={onCreateActivity}
            onDelete={onDeleteActivity}
            lookupMode
          />
        )}
        {fancyFilterResults && fancyFilterResultTable === 'content' && (
          <ContentTable
            content={fancyFilterResults}
            onUpdateContent={onUpdateContent}
            onCreateContent={() => {}}
            onDelete={onDeleteContent}
            onNewActivity={onNewActivityForContent}
            lookupMode
          />
        )}
      </div>
    </div>
  );
}

export default FancyFilterPage;

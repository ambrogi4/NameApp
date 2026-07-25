import React, { useState, useMemo } from 'react';

function getQuarterOptions() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const currentQ = Math.floor(month / 3) + 1;
  const options = [];
  let y = year, q = currentQ;
  for (let i = 0; i < 5; i++) {
    options.push({ label: `Q${q} ${y}`, year: y, quarter: q });
    q--;
    if (q === 0) { q = 4; y--; }
  }
  return options;
}

function quarterDateRange(year, quarter) {
  const startMonth = (quarter - 1) * 3; // 0-indexed
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0); // last day of end month
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function formatDate(d) {
  if (!d) return '';
  return d;
}

function matchesSearch(text, search) {
  if (!search) return true;
  if (!text) return false;
  return String(text).toLowerCase().includes(search.toLowerCase());
}

function ReportsPage({ contacts, activities, content, quickFilterText }) {
  const quarterOptions = useMemo(() => getQuarterOptions(), []);
  const [selectedQuarter, setSelectedQuarter] = useState(0); // index into quarterOptions
  const [selectedFirm, setSelectedFirm] = useState('__all__');
  const [hasRun, setHasRun] = useState(false);
  const [reportData, setReportData] = useState(null);

  const firms = useMemo(() => {
    const set = new Set();
    contacts.forEach(c => { if (c.firm) set.add(c.firm); });
    return Array.from(set).sort();
  }, [contacts]);

  const contactMap = useMemo(() => {
    const m = {};
    contacts.forEach(c => { m[c.id] = c; });
    return m;
  }, [contacts]);

  const contentMap = useMemo(() => {
    const m = {};
    content.forEach(c => { m[c.id] = c; });
    return m;
  }, [content]);

  // "This Week's Activity" — last 7 days, auto-computed
  const weeklyActivities = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return activities
      .filter(a => a.activity_date && a.activity_date >= cutoffStr)
      .sort((a, b) => (b.activity_date || '').localeCompare(a.activity_date || ''))
      .map(a => {
        const c = contactMap[a.contact_id];
        const contentItem = a.content_id ? contentMap[a.content_id] : null;
        // Build searchable text for filtering
        const searchText = [
          a.activity_date,
          c?.firm,
          c?.first,
          c?.last,
          c?.title,
          a.channel,
          a.topic,
          contentItem?.short_name || contentItem?.title,
          a.comment
        ].filter(Boolean).join(' ');

        return { activity: a, contact: c, contentItem, searchText };
      })
      .filter(item => matchesSearch(item.searchText, quickFilterText));
  }, [activities, contactMap, contentMap, quickFilterText]);

  const handleRun = () => {
    const opt = quarterOptions[selectedQuarter];
    const { start, end } = quarterDateRange(opt.year, opt.quarter);

    // Filter contacts by firm
    const firmContacts = selectedFirm === '__all__'
      ? contacts
      : contacts.filter(c => c.firm === selectedFirm);
    const firmContactIds = new Set(firmContacts.map(c => c.id));

    // Activities in quarter for these contacts
    const qActivities = activities.filter(a => {
      if (!firmContactIds.has(a.contact_id)) return false;
      const d = a.activity_date;
      return d && d >= start && d <= end;
    });

    // Section 1: Outreach Summary
    const outreachByContact = {};
    qActivities.forEach(a => {
      if (!outreachByContact[a.contact_id]) {
        outreachByContact[a.contact_id] = { count: 0, channels: new Set(), lastDate: null };
      }
      const entry = outreachByContact[a.contact_id];
      entry.count++;
      if (a.channel) entry.channels.add(a.channel);
      if (!entry.lastDate || a.activity_date > entry.lastDate) entry.lastDate = a.activity_date;
    });

    const outreachRows = Object.entries(outreachByContact).map(([cid, info]) => {
      const c = contactMap[Number(cid)];
      return {
        firm: c ? c.firm : '',
        name: c ? `${c.first || ''} ${c.last || ''}`.trim() : `#${cid}`,
        count: info.count,
        channels: Array.from(info.channels).join(', '),
        lastDate: info.lastDate,
      };
    }).sort((a, b) => (a.firm || '').localeCompare(b.firm || '') || a.name.localeCompare(b.name));

    // Section 2: Content Distribution
    const contentDist = {};
    qActivities.forEach(a => {
      if (!a.content_id) return;
      if (!contentDist[a.content_id]) {
        contentDist[a.content_id] = new Set();
      }
      contentDist[a.content_id].add(a.contact_id);
    });

    const contentRows = Object.entries(contentDist).map(([cid, contactIds]) => {
      const item = contentMap[Number(cid)];
      const names = Array.from(contactIds).map(id => {
        const c = contactMap[Number(id)];
        return c ? `${c.first || ''} ${c.last || ''}`.trim() : `#${id}`;
      }).sort();
      return {
        title: item ? (item.title || item.short_name || `#${cid}`) : `#${cid}`,
        recipientCount: contactIds.size,
        recipients: names.join(', '),
      };
    }).sort((a, b) => b.recipientCount - a.recipientCount);

    // Section 3: Responses
    const responseRows = qActivities
      .filter(a => a.contact_responded)
      .map(a => {
        const c = contactMap[a.contact_id];
        return {
          firm: c ? c.firm : '',
          name: c ? `${c.first || ''} ${c.last || ''}`.trim() : `#${a.contact_id}`,
          date: a.activity_date,
          channel: a.channel || '',
          topic: a.topic || '',
          comment: a.comment || '',
        };
      })
      .sort((a, b) => (a.firm || '').localeCompare(b.firm || '') || (b.date || '').localeCompare(a.date || ''));

    // Section 4: Dormant Contacts
    const contactsWithActivity = new Set(qActivities.map(a => a.contact_id));
    const dormantRows = firmContacts
      .filter(c => !contactsWithActivity.has(c.id))
      .map(c => {
        const lastAct = activities
          .filter(a => a.contact_id === c.id && a.activity_date)
          .reduce((latest, a) => (!latest || a.activity_date > latest) ? a.activity_date : latest, null);
        return {
          firm: c.firm || '',
          name: `${c.first || ''} ${c.last || ''}`.trim(),
          lastDate: lastAct || 'never',
        };
      })
      .sort((a, b) => (a.firm || '').localeCompare(b.firm || '') || a.name.localeCompare(b.name));

    // Section 5: Activity Detail with Comments
    const commentRows = qActivities
      .filter(a => a.comment && a.comment.trim())
      .map(a => {
        const c = contactMap[a.contact_id];
        return {
          firm: c ? c.firm : '',
          name: c ? `${c.first || ''} ${c.last || ''}`.trim() : `#${a.contact_id}`,
          date: a.activity_date,
          channel: a.channel || '',
          topic: a.topic || '',
          comment: a.comment,
        };
      })
      .sort((a, b) => (a.firm || '').localeCompare(b.firm || '') || (b.date || '').localeCompare(a.date || ''));

    setReportData({ outreachRows, contentRows, responseRows, dormantRows, commentRows });
    setHasRun(true);
  };

  const showFirmGroup = selectedFirm === '__all__';

  // Filter report data by search term
  const filteredReportData = useMemo(() => {
    if (!reportData) return null;
    if (!quickFilterText) return reportData;
    const search = quickFilterText.toLowerCase();
    return {
      outreachRows: reportData.outreachRows.filter(r =>
        matchesSearch(r.name, search) || matchesSearch(r.firm, search) || matchesSearch(r.channels, search)
      ),
      contentRows: reportData.contentRows.filter(r =>
        matchesSearch(r.title, search) || matchesSearch(r.recipients, search)
      ),
      responseRows: reportData.responseRows.filter(r =>
        matchesSearch(r.name, search) || matchesSearch(r.firm, search) || matchesSearch(r.topic, search) || matchesSearch(r.comment, search)
      ),
      dormantRows: reportData.dormantRows.filter(r =>
        matchesSearch(r.name, search) || matchesSearch(r.firm, search)
      ),
      commentRows: reportData.commentRows.filter(r =>
        matchesSearch(r.name, search) || matchesSearch(r.firm, search) || matchesSearch(r.topic, search) || matchesSearch(r.comment, search)
      ),
    };
  }, [reportData, quickFilterText]);

  function groupByFirm(rows) {
    const groups = {};
    rows.forEach(r => {
      const f = r.firm || '(No Firm)';
      if (!groups[f]) groups[f] = [];
      groups[f].push(r);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }

  function renderGrouped(rows, renderTable) {
    if (!showFirmGroup) return renderTable(rows);
    const groups = groupByFirm(rows);
    if (groups.length === 0) return <p className="report-empty">No results</p>;
    return groups.map(([firm, items]) => (
      <div key={firm}>
        <h4 className="report-firm-header">{firm}</h4>
        {renderTable(items)}
      </div>
    ));
  }

  return (
    <div className="reports-page">
      <div className="report-section">
        <h3>This Week's Activity</h3>
        {weeklyActivities.length === 0
          ? <p className="report-empty">No activity in the last 7 days</p>
          : <div className="report-text-block">
              {weeklyActivities.map(({ activity: a, contact: c, contentItem }, i) => (
                <div key={i} className="report-text-line">
                  {formatDate(a.activity_date)}
                  {'  '}
                  {c?.firm && <><strong>{c.firm}</strong>{'  '}</>}
                  {c ? [c.first, c.last].filter(Boolean).join(' ') : `#${a.contact_id}`}
                  {c?.title && `, ${c.title}`}
                  {a.channel && `  via ${a.channel}`}
                  {a.topic && `  — ${a.topic}`}
                  {contentItem && `  [${contentItem.short_name || contentItem.title || '#' + contentItem.id}]`}
                  {a.comment && `  // ${a.comment}`}
                </div>
              ))}
            </div>
        }
      </div>
      <hr className="report-divider" />
      <div className="reports-controls">
        <select
          value={selectedQuarter}
          onChange={e => setSelectedQuarter(Number(e.target.value))}
          className="reports-select"
        >
          {quarterOptions.map((opt, i) => (
            <option key={i} value={i}>{opt.label}</option>
          ))}
        </select>
        <select
          value={selectedFirm}
          onChange={e => setSelectedFirm(e.target.value)}
          className="reports-select"
        >
          <option value="__all__">All Accounts</option>
          {firms.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <button className="reports-run-btn" onClick={handleRun}>Run All</button>
      </div>

      {hasRun && filteredReportData && (
        <div className="reports-body">
          {/* Section 1: Outreach Summary */}
          <div className="report-section">
            <h3>Outreach Summary</h3>
            {filteredReportData.outreachRows.length === 0
              ? <p className="report-empty">No outreach this quarter</p>
              : renderGrouped(filteredReportData.outreachRows, (rows) => (
                <table className="report-table">
                  <thead>
                    <tr><th>Name</th><th># Activities</th><th>Channels</th><th>Most Recent</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}><td>{r.name}</td><td>{r.count}</td><td>{r.channels}</td><td>{formatDate(r.lastDate)}</td></tr>
                    ))}
                  </tbody>
                </table>
              ))
            }
          </div>

          {/* Section 2: Content Distribution */}
          <div className="report-section">
            <h3>Content Distribution</h3>
            {filteredReportData.contentRows.length === 0
              ? <p className="report-empty">No content sent this quarter</p>
              : (
                <table className="report-table">
                  <thead>
                    <tr><th>Title</th><th># Recipients</th><th>Recipients</th></tr>
                  </thead>
                  <tbody>
                    {filteredReportData.contentRows.map((r, i) => (
                      <tr key={i}><td>{r.title}</td><td>{r.recipientCount}</td><td>{r.recipients}</td></tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </div>

          {/* Section 3: Responses */}
          <div className="report-section">
            <h3>Responses</h3>
            {filteredReportData.responseRows.length === 0
              ? <p className="report-empty">No responses this quarter</p>
              : renderGrouped(filteredReportData.responseRows, (rows) => (
                <table className="report-table">
                  <thead>
                    <tr><th>Name</th><th>Date</th><th>Channel</th><th>Topic</th><th>Comment</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}><td>{r.name}</td><td>{formatDate(r.date)}</td><td>{r.channel}</td><td>{r.topic}</td><td>{r.comment}</td></tr>
                    ))}
                  </tbody>
                </table>
              ))
            }
          </div>

          {/* Section 4: Dormant Contacts */}
          <div className="report-section">
            <h3>Dormant Contacts</h3>
            {filteredReportData.dormantRows.length === 0
              ? <p className="report-empty">No dormant contacts</p>
              : renderGrouped(filteredReportData.dormantRows, (rows) => (
                <table className="report-table">
                  <thead>
                    <tr><th>Name</th><th>Last Activity</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}><td>{r.name}</td><td>{r.lastDate}</td></tr>
                    ))}
                  </tbody>
                </table>
              ))
            }
          </div>

          {/* Section 5: Activity Detail with Comments */}
          <div className="report-section">
            <h3>Activity Detail with Comments</h3>
            {filteredReportData.commentRows.length === 0
              ? <p className="report-empty">No activities with comments this quarter</p>
              : renderGrouped(filteredReportData.commentRows, (rows) => (
                <table className="report-table">
                  <thead>
                    <tr><th>Name</th><th>Date</th><th>Channel</th><th>Topic</th><th>Comment</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}><td>{r.name}</td><td>{formatDate(r.date)}</td><td>{r.channel}</td><td>{r.topic}</td><td className="report-comment-cell">{r.comment}</td></tr>
                    ))}
                  </tbody>
                </table>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportsPage;

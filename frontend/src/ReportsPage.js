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

function ReportsPage({ contacts, activities, content }) {
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

      {hasRun && reportData && (
        <div className="reports-body">
          {/* Section 1: Outreach Summary */}
          <div className="report-section">
            <h3>Outreach Summary</h3>
            {reportData.outreachRows.length === 0
              ? <p className="report-empty">No outreach this quarter</p>
              : renderGrouped(reportData.outreachRows, (rows) => (
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
            {reportData.contentRows.length === 0
              ? <p className="report-empty">No content sent this quarter</p>
              : (
                <table className="report-table">
                  <thead>
                    <tr><th>Title</th><th># Recipients</th><th>Recipients</th></tr>
                  </thead>
                  <tbody>
                    {reportData.contentRows.map((r, i) => (
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
            {reportData.responseRows.length === 0
              ? <p className="report-empty">No responses this quarter</p>
              : renderGrouped(reportData.responseRows, (rows) => (
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
            {reportData.dormantRows.length === 0
              ? <p className="report-empty">No dormant contacts</p>
              : renderGrouped(reportData.dormantRows, (rows) => (
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
            {reportData.commentRows.length === 0
              ? <p className="report-empty">No activities with comments this quarter</p>
              : renderGrouped(reportData.commentRows, (rows) => (
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

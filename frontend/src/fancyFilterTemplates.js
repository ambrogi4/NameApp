// Fancy Filter Templates — cross-table query definitions
// Each template has: id, label, resultTable, params[], execute(data, params)

const templates = [
  {
    id: 'contacts_at_firm_no_outreach',
    label: 'Contacts at [firm] with no outreach since [date]',
    resultTable: 'contacts',
    params: [
      { key: 'firm', type: 'firm', label: 'Firm', required: true },
      { key: 'date', type: 'date', label: 'Since date', required: true },
    ],
    execute: (data, params) => {
      const { contacts, activities } = data;
      const firm = params.firm.toLowerCase();
      const firmContacts = contacts.filter(c => (c.firm || '').toLowerCase() === firm);
      return firmContacts.filter(c => {
        const contactActivities = activities.filter(a => a.contact_id === c.id);
        if (contactActivities.length === 0) return true;
        const latest = contactActivities.reduce((max, a) =>
          (a.activity_date || '') > (max.activity_date || '') ? a : max
        );
        return (latest.activity_date || '') < params.date;
      });
    },
  },
  {
    id: 'recent_outreach_to_firm',
    label: 'Most recent outreach to anyone at [firm]',
    resultTable: 'activities',
    params: [
      { key: 'firm', type: 'firm', label: 'Firm', required: true },
    ],
    execute: (data, params) => {
      const { contacts, activities } = data;
      const firm = params.firm.toLowerCase();
      const firmContactIds = new Set(
        contacts.filter(c => (c.firm || '').toLowerCase() === firm).map(c => c.id)
      );
      const firmActivities = activities.filter(a => firmContactIds.has(a.contact_id));
      // Return all activities sorted by date descending
      return [...firmActivities].sort((a, b) =>
        (b.activity_date || '').localeCompare(a.activity_date || '')
      );
    },
  },
  {
    id: 'all_outreach_to_firm_since',
    label: 'All outreach to [firm] since [date]',
    resultTable: 'activities',
    params: [
      { key: 'firm', type: 'firm', label: 'Firm', required: true },
      { key: 'date', type: 'date', label: 'Since date', required: true },
    ],
    execute: (data, params) => {
      const { contacts, activities } = data;
      const firm = params.firm.toLowerCase();
      const firmContactIds = new Set(
        contacts.filter(c => (c.firm || '').toLowerCase() === firm).map(c => c.id)
      );
      return activities.filter(a =>
        firmContactIds.has(a.contact_id) && (a.activity_date || '') >= params.date
      );
    },
  },
  {
    id: 'contacts_at_firm_sent_content',
    label: 'Contacts at [firm] I sent [content] to',
    resultTable: 'contacts',
    params: [
      { key: 'firm', type: 'firm', label: 'Firm', required: true },
      { key: 'content', type: 'content', label: 'Content', required: true },
    ],
    execute: (data, params) => {
      const { contacts, activities } = data;
      const firm = params.firm.toLowerCase();
      const contentId = Number(params.content);
      const contactIdsWithContent = new Set(
        activities.filter(a => a.content_id === contentId).map(a => a.contact_id)
      );
      return contacts.filter(c =>
        (c.firm || '').toLowerCase() === firm && contactIdsWithContent.has(c.id)
      );
    },
  },
  {
    id: 'contacts_with_tag_no_outreach',
    label: 'Contacts with tag [tag] with no outreach since [date]',
    resultTable: 'contacts',
    params: [
      { key: 'tag', type: 'tag', label: 'Tag', required: true },
      { key: 'date', type: 'date', label: 'Since date', required: true },
    ],
    execute: (data, params) => {
      const { contacts, activities } = data;
      const tag = params.tag.toLowerCase();
      const taggedContacts = contacts.filter(c => {
        const tags = (c.tags || '').split(',').map(t => t.trim().toLowerCase());
        return tags.includes(tag);
      });
      return taggedContacts.filter(c => {
        const contactActivities = activities.filter(a => a.contact_id === c.id);
        if (contactActivities.length === 0) return true;
        const latest = contactActivities.reduce((max, a) =>
          (a.activity_date || '') > (max.activity_date || '') ? a : max
        );
        return (latest.activity_date || '') < params.date;
      });
    },
  },
  {
    id: 'all_outreach_to_contact',
    label: 'All outreach to [contact]',
    resultTable: 'activities',
    params: [
      { key: 'contact', type: 'contact', label: 'Contact', required: true },
    ],
    execute: (data, params) => {
      const { activities } = data;
      const contactId = Number(params.contact);
      return activities.filter(a => a.contact_id === contactId);
    },
  },
];

export default templates;

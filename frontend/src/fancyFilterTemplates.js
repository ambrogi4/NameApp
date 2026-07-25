// Fancy Filter Templates — cross-table query definitions
// Each template has: id, label, resultTable, params[], execute(data, params)
// Sorted: Activities... → Contacts... → Content...

const templates = [
  {
    id: 'activities_to_contact',
    label: 'Activities to [contact]',
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
  {
    id: 'activities_to_firm_since',
    label: 'Activities to [firm] since [date]',
    resultTable: 'activities',
    params: [
      { key: 'firm', type: 'firm', label: 'Firm', required: true },
      { key: 'date', type: 'date', label: 'Since date', required: true,
        defaultValue: () => {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          return d.toISOString().slice(0, 10);
        },
      },
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
    id: 'contacts_at_firm_no_activity',
    label: 'Contacts at [firm] with no activity since [date]',
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
    id: 'contacts_with_tag_no_activity',
    label: 'Contacts with tag [tag] with no activity since [date]',
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
    id: 'content_with_no_activity_since',
    label: 'Content with no activity since [date]',
    resultTable: 'content',
    params: [
      { key: 'date', type: 'date', label: 'Since date', required: true,
        defaultValue: () => {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          return d.toISOString().slice(0, 10);
        },
      },
    ],
    execute: (data, params) => {
      const { content, activities } = data;
      // Find content where there is no activity on or after the given date
      return content.filter(c => {
        const contentActivities = activities.filter(a => a.content_id === c.id);
        if (contentActivities.length === 0) return true;
        const latest = contentActivities.reduce((max, a) =>
          (a.activity_date || '') > (max.activity_date || '') ? a : max
        );
        return (latest.activity_date || '') < params.date;
      });
    },
  },
];

export default templates;

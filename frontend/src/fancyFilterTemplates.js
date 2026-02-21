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
    id: 'content_with_most_activity',
    label: 'Content with most activity',
    resultTable: 'content',
    params: [],
    execute: (data) => {
      const { content, activities } = data;
      if (content.length === 0) return [];
      const counts = {};
      activities.forEach(a => {
        if (a.content_id != null) {
          counts[a.content_id] = (counts[a.content_id] || 0) + 1;
        }
      });
      let maxId = null;
      let maxCount = 0;
      for (const [id, count] of Object.entries(counts)) {
        if (count > maxCount) {
          maxCount = count;
          maxId = Number(id);
        }
      }
      if (maxId == null) return [];
      return content.filter(c => c.id === maxId);
    },
  },
  {
    id: 'content_with_no_activity',
    label: 'Content with no activity',
    resultTable: 'content',
    params: [],
    execute: (data) => {
      const { content, activities } = data;
      const contentIdsWithActivity = new Set(
        activities.map(a => a.content_id).filter(id => id != null)
      );
      return content.filter(c => !contentIdsWithActivity.has(c.id));
    },
  },
];

export default templates;

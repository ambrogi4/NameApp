from datetime import date, datetime
from extensions import db


class Contact(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    created_date = db.Column(db.DateTime, default=datetime.now)
    first = db.Column(db.Text, nullable=False)
    last = db.Column(db.Text, nullable=False)
    title = db.Column(db.Text)
    firm = db.Column(db.Text)
    source = db.Column(db.Text)
    education = db.Column(db.Text)
    tags = db.Column(db.Text)
    comment = db.Column(db.Text)
    email = db.Column(db.Text)
    phone = db.Column(db.Text)
    street = db.Column(db.Text)
    city = db.Column(db.Text)
    state = db.Column(db.Text)
    zip = db.Column(db.Text)
    country = db.Column(db.Text)
    li_url = db.Column(db.Text)
    photo_url = db.Column(db.Text)
    in_crm = db.Column(db.Boolean, default=False)
    index_1 = db.Column(db.Integer)
    index_2 = db.Column(db.Integer)

    activities = db.relationship('Activity', backref='contact',
                                 cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'created_date': self.created_date.isoformat() if self.created_date else None,
            'first': self.first,
            'last': self.last,
            'title': self.title,
            'firm': self.firm,
            'source': self.source,
            'education': self.education,
            'tags': self.tags,
            'comment': self.comment,
            'email': self.email,
            'phone': self.phone,
            'street': self.street,
            'city': self.city,
            'state': self.state,
            'zip': self.zip,
            'country': self.country,
            'li_url': self.li_url,
            'photo_url': self.photo_url,
            'in_crm': self.in_crm,
            'index_1': self.index_1,
            'index_2': self.index_2,
        }


class Content(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.Text)
    short_name = db.Column(db.Text)
    title = db.Column(db.Text)
    author = db.Column(db.Text)
    created_date = db.Column(db.Date, default=date.today)
    publish_date = db.Column(db.Date)
    link = db.Column(db.Text)
    tags = db.Column(db.Text)
    comment = db.Column(db.Text)

    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'short_name': self.short_name,
            'title': self.title,
            'author': self.author,
            'created_date': self.created_date.isoformat() if self.created_date else None,
            'publish_date': self.publish_date.isoformat() if self.publish_date else None,
            'link': self.link,
            'tags': self.tags,
            'comment': self.comment,
        }


class Activity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    contact_id = db.Column(db.Integer, db.ForeignKey('contact.id'), nullable=False)
    content_id = db.Column(db.Integer, db.ForeignKey('content.id'), nullable=True)
    activity_date = db.Column(db.Date, default=date.today)
    channel = db.Column(db.Text)
    contact_responded = db.Column(db.Boolean, default=False)
    email_opened = db.Column(db.Boolean, default=False)
    topic = db.Column(db.Text)
    comment = db.Column(db.Text)
    in_crm = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

    content = db.relationship('Content', backref='activities')

    def to_dict(self):
        return {
            'id': self.id,
            'contact_id': self.contact_id,
            'content_id': self.content_id,
            'activity_date': self.activity_date.isoformat() if self.activity_date else None,
            'channel': self.channel,
            'contact_responded': self.contact_responded,
            'email_opened': self.email_opened,
            'topic': self.topic,
            'comment': self.comment,
            'in_crm': self.in_crm,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

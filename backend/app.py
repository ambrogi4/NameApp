import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import time

app = Flask(__name__)
CORS(app)

# Database Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Model Definition
class Person(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(80), nullable=False)
    last_name = db.Column(db.String(80), nullable=False)
    title = db.Column(db.String(100), nullable=True)
    company = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    tags = db.Column(db.String(200), nullable=True)
    comment = db.Column(db.Text, nullable=True)
    city = db.Column(db.String(100), nullable=True)
    st = db.Column(db.String(50), nullable=True)
    ctry = db.Column(db.String(50), nullable=True)
    LI_url = db.Column(db.String(200), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'title': self.title,
            'company': self.company,
            'email': self.email,
            'phone': self.phone,
            'tags': self.tags,
            'comment': self.comment,
            'city': self.city,
            'st': self.st,
            'ctry': self.ctry,
            'LI_url': self.LI_url
        }

# API Endpoints
@app.route('/api/people', methods=['POST'])
def add_person():
    data = request.get_json()
    new_person = Person(
        first_name=data['first_name'],
        last_name=data['last_name'],
        title=data.get('title'),
        company=data.get('company'),
        email=data.get('email'),
        phone=data.get('phone'),
        tags=data.get('tags'),
        comment=data.get('comment'),
        city=data.get('city'),
        st=data.get('st'),
        ctry=data.get('ctry'),
        LI_url=data.get('LI_url')
    )
    db.session.add(new_person)
    db.session.commit()
    return jsonify(new_person.to_dict()), 201

@app.route('/api/people', methods=['GET'])
def get_people():
    people = Person.query.all()
    return jsonify([person.to_dict() for person in people])

@app.route('/api/people/<int:person_id>', methods=['PUT'])
def update_person(person_id):
    person = Person.query.get_or_404(person_id)
    data = request.get_json()
    
    person.first_name = data.get('first_name', person.first_name)
    person.last_name = data.get('last_name', person.last_name)
    person.title = data.get('title', person.title)
    person.company = data.get('company', person.company)
    person.email = data.get('email', person.email)
    person.phone = data.get('phone', person.phone)
    person.tags = data.get('tags', person.tags)
    person.comment = data.get('comment', person.comment)
    person.city = data.get('city', person.city)
    person.st = data.get('st', person.st)
    person.ctry = data.get('ctry', person.ctry)
    person.LI_url = data.get('LI_url', person.LI_url)
    
    db.session.commit()
    return jsonify(person.to_dict())

@app.route('/api/people/<int:person_id>', methods=['DELETE'])
def delete_person(person_id):
    person = Person.query.get_or_404(person_id)
    db.session.delete(person)
    db.session.commit()
    return jsonify({'message': 'Person deleted successfully'})

if __name__ == '__main__':
    # Wait for the database to be ready
    retries = 5
    while retries > 0:
        try:
            with app.app_context():
                db.create_all()
            print("Database is ready.")
            break
        except Exception as e:
            print(f"Database not ready, retrying... ({e})")
            retries -= 1
            time.sleep(5)
    
    if retries == 0:
        print("Failed to connect to the database.")
    else:
        app.run(host='0.0.0.0', debug=True)

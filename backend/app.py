import os
import time
from flask import Flask, jsonify
from flask_cors import CORS

from extensions import db, migrate
from routes import register_blueprints


def create_app():
    """Application factory."""
    static_dir = os.path.join(os.path.dirname(__file__), 'static')
    app = Flask(__name__, static_folder=static_dir, static_url_path='')
    CORS(app)

    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    migrate.init_app(app, db)

    # Import models so they're registered with SQLAlchemy metadata
    import models  # noqa: F401

    register_blueprints(app)

    # Config endpoint (small enough to keep here)
    @app.route('/api/config')
    def get_config():
        return jsonify({
            'instanceName': os.environ.get('INSTANCE_NAME', 'myCRM'),
            'instanceColor': os.environ.get('INSTANCE_COLOR', '#87CEEB'),
        })

    # Serve React frontend
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return app.send_static_file(path)
        return app.send_static_file('index.html')

    return app


# Module-level app instance for Flask CLI (flask db upgrade, etc.)
app = create_app()


if __name__ == '__main__':
    retries = 5
    while retries > 0:
        try:
            with app.app_context():
                # Migration handles schema; just verify connectivity
                db.engine.connect()
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

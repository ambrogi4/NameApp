from .contacts import contacts_bp
from .content import content_bp
from .activities import activities_bp
from .query import query_bp
from .staging import staging_bp
from .oc_transitions import oc_transitions_bp
from .dashboard import dashboard_bp


def register_blueprints(app):
    """Register all route blueprints with the Flask app."""
    app.register_blueprint(contacts_bp, url_prefix='/api/contacts')
    app.register_blueprint(content_bp, url_prefix='/api/content')
    app.register_blueprint(activities_bp, url_prefix='/api/activities')
    app.register_blueprint(query_bp, url_prefix='/api')
    app.register_blueprint(staging_bp, url_prefix='/api/staging')
    app.register_blueprint(oc_transitions_bp, url_prefix='/api/oc-transitions')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')

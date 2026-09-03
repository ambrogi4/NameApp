from datetime import date, timedelta
from flask import Blueprint, jsonify
from sqlalchemy import func

from extensions import db
from models import Activity

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/metrics', methods=['GET'])
def get_dashboard_metrics():
    """
    Get dashboard metrics for outreach tracking.

    Returns counts of activities by outreach_category for various time periods.
    """
    today = date.today()
    start_of_week = today - timedelta(days=today.weekday())  # Monday
    start_of_month = today.replace(day=1)

    # Cold outreach today
    cold_today = Activity.query.filter(
        Activity.activity_date == today,
        Activity.outreach_category == 'cold'
    ).count()

    # Cold outreach this week (Monday to today)
    cold_this_week = Activity.query.filter(
        Activity.activity_date >= start_of_week,
        Activity.activity_date <= today,
        Activity.outreach_category == 'cold'
    ).count()

    # Cold outreach this month
    cold_this_month = Activity.query.filter(
        Activity.activity_date >= start_of_month,
        Activity.activity_date <= today,
        Activity.outreach_category == 'cold'
    ).count()

    # All outreach today (any category)
    all_today = Activity.query.filter(
        Activity.activity_date == today,
        Activity.outreach_category.isnot(None)
    ).count()

    # Breakdown by category today
    category_breakdown_today = db.session.query(
        Activity.outreach_category,
        func.count(Activity.id)
    ).filter(
        Activity.activity_date == today,
        Activity.outreach_category.isnot(None)
    ).group_by(Activity.outreach_category).all()

    breakdown_today = {cat: count for cat, count in category_breakdown_today}

    return jsonify({
        'cold_outreach_today': cold_today,
        'cold_outreach_this_week': cold_this_week,
        'cold_outreach_this_month': cold_this_month,
        'all_outreach_today': all_today,
        'breakdown_today': breakdown_today,
    })

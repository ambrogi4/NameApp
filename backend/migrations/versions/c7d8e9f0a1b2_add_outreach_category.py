"""add outreach_category to contact, contact_staging, activity and create oc_transition table

Revision ID: c7d8e9f0a1b2
Revises: b5c9d4e2f8a1
Create Date: 2026-09-02 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c7d8e9f0a1b2'
down_revision = 'b5c9d4e2f8a1'
branch_labels = None
depends_on = None


def upgrade():
    # Add outreach_category to contact table
    op.add_column('contact', sa.Column('outreach_category', sa.Text(), nullable=True))

    # Add outreach_category to contact_staging table
    op.add_column('contact_staging', sa.Column('outreach_category', sa.Text(), nullable=True))

    # Add outreach_category to activity table
    op.add_column('activity', sa.Column('outreach_category', sa.Text(), nullable=True))

    # Create oc_transition table
    op.create_table('oc_transition',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('contact_id', sa.Integer(), nullable=False),
        sa.Column('from_oc', sa.Text(), nullable=False),
        sa.Column('to_oc', sa.Text(), nullable=False),
        sa.Column('transition_date', sa.Date(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('last_activity_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['contact_id'], ['contact.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['last_activity_id'], ['activity.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_oc_transition_contact_id', 'oc_transition', ['contact_id'])


def downgrade():
    op.drop_index('ix_oc_transition_contact_id', table_name='oc_transition')
    op.drop_table('oc_transition')
    op.drop_column('activity', 'outreach_category')
    op.drop_column('contact_staging', 'outreach_category')
    op.drop_column('contact', 'outreach_category')

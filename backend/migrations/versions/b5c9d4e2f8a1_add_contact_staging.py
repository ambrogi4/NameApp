"""add contact_staging table

Revision ID: b5c9d4e2f8a1
Revises: a3f8c2d1e5b7
Create Date: 2026-07-25 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b5c9d4e2f8a1'
down_revision = 'a3f8c2d1e5b7'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('contact_staging',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_date', sa.DateTime(), nullable=True),
        # Contact columns
        sa.Column('first', sa.Text(), nullable=False),
        sa.Column('last', sa.Text(), nullable=False),
        sa.Column('title', sa.Text(), nullable=True),
        sa.Column('firm', sa.Text(), nullable=True),
        sa.Column('source', sa.Text(), nullable=True),
        sa.Column('education', sa.Text(), nullable=True),
        sa.Column('tags', sa.Text(), nullable=True),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('email', sa.Text(), nullable=True),
        sa.Column('phone', sa.Text(), nullable=True),
        sa.Column('street', sa.Text(), nullable=True),
        sa.Column('city', sa.Text(), nullable=True),
        sa.Column('state', sa.Text(), nullable=True),
        sa.Column('zip', sa.Text(), nullable=True),
        sa.Column('country', sa.Text(), nullable=True),
        sa.Column('li_url', sa.Text(), nullable=True),
        sa.Column('photo_url', sa.Text(), nullable=True),
        sa.Column('in_crm', sa.Boolean(), nullable=True),
        sa.Column('index_1', sa.Integer(), nullable=True),
        sa.Column('index_2', sa.Integer(), nullable=True),
        # Staging-specific columns
        sa.Column('source_type', sa.Text(), nullable=True),
        sa.Column('dupe_status', sa.Text(), nullable=True),
        sa.Column('matched_contact_id', sa.Integer(), nullable=True),
        sa.Column('email_confidence', sa.Text(), nullable=True),
        sa.Column('enrichment_status', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['matched_contact_id'], ['contact.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_contact_staging_dupe_status', 'contact_staging', ['dupe_status'])
    op.create_index('ix_contact_staging_matched_contact_id', 'contact_staging', ['matched_contact_id'])


def downgrade():
    op.drop_index('ix_contact_staging_matched_contact_id', table_name='contact_staging')
    op.drop_index('ix_contact_staging_dupe_status', table_name='contact_staging')
    op.drop_table('contact_staging')

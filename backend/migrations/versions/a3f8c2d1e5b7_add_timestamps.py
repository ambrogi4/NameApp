"""add timestamp precision to created_date and activity created_at

Revision ID: a3f8c2d1e5b7
Revises: 71d4cf1d907c
Create Date: 2026-03-14 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a3f8c2d1e5b7'
down_revision = '71d4cf1d907c'
branch_labels = None
depends_on = None


def upgrade():
    # Change contact.created_date from DATE to TIMESTAMP
    op.alter_column('contact', 'created_date',
                    type_=sa.DateTime(),
                    existing_type=sa.Date(),
                    existing_nullable=True)
    # Add created_at timestamp to activity
    op.add_column('activity', sa.Column('created_at', sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column('activity', 'created_at')
    op.alter_column('contact', 'created_date',
                    type_=sa.Date(),
                    existing_type=sa.DateTime(),
                    existing_nullable=True)

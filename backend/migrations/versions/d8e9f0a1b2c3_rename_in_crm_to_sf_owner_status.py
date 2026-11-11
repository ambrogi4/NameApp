"""rename in_crm to sf_owner_status with check constraint

Revision ID: d8e9f0a1b2c3
Revises: c7d8e9f0a1b2
Create Date: 2026-11-07 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd8e9f0a1b2c3'
down_revision = 'c7d8e9f0a1b2'
branch_labels = None
depends_on = None


def upgrade():
    # Contact table: rename in_crm -> sf_owner_status, change type Boolean -> Text, add CHECK constraint
    op.alter_column('contact', 'in_crm',
                    new_column_name='sf_owner_status',
                    type_=sa.Text(),
                    existing_type=sa.Boolean(),
                    nullable=True)

    # Set all existing values to NULL
    op.execute("UPDATE contact SET sf_owner_status = NULL")

    # Add CHECK constraint for contact
    op.create_check_constraint(
        'ck_contact_sf_owner_status',
        'contact',
        "sf_owner_status IS NULL OR sf_owner_status IN ('my', 'colleague', 'NISF')"
    )

    # ContactStaging table: same transformation
    op.alter_column('contact_staging', 'in_crm',
                    new_column_name='sf_owner_status',
                    type_=sa.Text(),
                    existing_type=sa.Boolean(),
                    nullable=True)

    # Set all existing staging values to NULL
    op.execute("UPDATE contact_staging SET sf_owner_status = NULL")

    # Add CHECK constraint for contact_staging
    op.create_check_constraint(
        'ck_contact_staging_sf_owner_status',
        'contact_staging',
        "sf_owner_status IS NULL OR sf_owner_status IN ('my', 'colleague', 'NISF')"
    )


def downgrade():
    # Remove CHECK constraints
    op.drop_constraint('ck_contact_staging_sf_owner_status', 'contact_staging', type_='check')
    op.drop_constraint('ck_contact_sf_owner_status', 'contact', type_='check')

    # ContactStaging: rename back and change type Text -> Boolean
    op.alter_column('contact_staging', 'sf_owner_status',
                    new_column_name='in_crm',
                    type_=sa.Boolean(),
                    existing_type=sa.Text(),
                    nullable=True)

    # Contact: rename back and change type Text -> Boolean
    op.alter_column('contact', 'sf_owner_status',
                    new_column_name='in_crm',
                    type_=sa.Boolean(),
                    existing_type=sa.Text(),
                    nullable=True)

    # Set all values to False (default)
    op.execute("UPDATE contact_staging SET in_crm = FALSE WHERE in_crm IS NULL")
    op.execute("UPDATE contact SET in_crm = FALSE WHERE in_crm IS NULL")

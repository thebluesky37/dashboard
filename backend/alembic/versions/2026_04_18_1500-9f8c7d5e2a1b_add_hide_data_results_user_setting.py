"""add_hide_data_results_user_setting

Revision ID: 9f8c7d5e2a1b
Revises: 8956fdf03bbb
Create Date: 2026-04-18 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f8c7d5e2a1b'
down_revision: Union[str, None] = '84029ea1446b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.add_column(sa.Column("hide_data_results", sa.Boolean(), server_default=sa.text("0"), nullable=False))


def downgrade() -> None:
    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.drop_column("hide_data_results")

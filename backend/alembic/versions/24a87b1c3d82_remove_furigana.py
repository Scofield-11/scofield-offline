"""remove_furigana

Revision ID: 24a87b1c3d82
Revises: 333a343ffc7b
Create Date: 2026-09-09 12:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '24a87b1c3d82'
down_revision: Union[str, Sequence[str], None] = '333a343ffc7b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('vocabularies', 'furigana')


def downgrade() -> None:
    op.add_column('vocabularies', sa.Column('furigana', sa.String(length=255), nullable=True))
"""add folder_path to kanji_sets

Revision ID: abcdef123456
Revises: 998d2d2e065e
Create Date: 2026-09-24 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'abcdef123456'
down_revision: Union[str, Sequence[str], None] = '998d2d2e065e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('kanji_sets', sa.Column('folder_path', sa.String(length=500), nullable=True))

def downgrade() -> None:
    op.drop_column('kanji_sets', 'folder_path')
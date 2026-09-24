"""add_kanji_tables

Revision ID: 5b6c7d8e9f0a
Revises: 24a87b1c3d82
Create Date: 2026-09-09 12:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5b6c7d8e9f0a'
down_revision: Union[str, Sequence[str], None] = '24a87b1c3d82'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('kanji_sets',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_kanji_sets_id'), 'kanji_sets', ['id'], unique=False)

    op.create_table('kanjis',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('kanji', sa.String(length=255), nullable=False),
    sa.Column('hanviet', sa.String(length=255), nullable=False),
    sa.Column('hiragana', sa.String(length=255), nullable=False),
    sa.Column('meaning', sa.String(length=500), nullable=False),
    sa.Column('kanji_set_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['kanji_set_id'], ['kanji_sets.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_kanjis_id'), 'kanjis', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_kanjis_id'), table_name='kanjis')
    op.drop_table('kanjis')
    op.drop_index(op.f('ix_kanji_sets_id'), table_name='kanji_sets')
    op.drop_table('kanji_sets')
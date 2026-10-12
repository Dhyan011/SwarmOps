"""Store owner-linked GitHub App installations without access tokens.

Revision ID: 0002_repo_connections
Revises: 0001_initial
Create Date: 2026-10-12
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002_repo_connections"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "repository_connections",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.String(length=255), nullable=False),
        sa.Column("installation_id", sa.String(length=40), nullable=False),
        sa.Column("account_login", sa.String(length=255), nullable=False),
        sa.Column("account_type", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("installation_id"),
        sa.UniqueConstraint("owner_id", "installation_id", name="uq_repo_conn_owner_installation"),
    )
    op.create_index("ix_repo_connections_owner", "repository_connections", ["owner_id"])


def downgrade() -> None:
    op.drop_index("ix_repo_connections_owner", table_name="repository_connections")
    op.drop_table("repository_connections")

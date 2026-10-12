"""Persist owner-scoped public repository scans and publication state.

Revision ID: 0003_contribution_scans
Revises: 0002_repo_connections
Create Date: 2026-10-12
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003_contribution_scans"
down_revision: Union[str, None] = "0002_repo_connections"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "contribution_scans",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("scan_id", sa.String(length=36), nullable=False),
        sa.Column("owner_id", sa.String(length=255), nullable=False),
        sa.Column("repository", sa.String(length=511), nullable=False),
        sa.Column("target_url", sa.String(length=500), nullable=False),
        sa.Column("default_branch", sa.String(length=255), nullable=False),
        sa.Column("source_sha", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=50), server_default="ready", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("publication_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("result_json", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("scan_id"),
    )
    op.create_index(
        "ix_contribution_scans_owner_created",
        "contribution_scans",
        ["owner_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_contribution_scans_owner_created", table_name="contribution_scans")
    op.drop_table("contribution_scans")

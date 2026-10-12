"""Create tenant-owned incidents and audit events.

Revision ID: 0001_initial
Revises:
Create Date: 2026-10-12
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "incidents",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("incident_id", sa.String(length=80), nullable=False),
        sa.Column("owner_id", sa.String(length=255), server_default="", nullable=False),
        sa.Column("service", sa.String(length=100), server_default="", nullable=False),
        sa.Column("status", sa.String(length=50), server_default="unknown", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("report_json", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("incident_id"),
    )
    op.create_index("ix_incidents_owner_id", "incidents", ["owner_id"])
    op.create_index("ix_incidents_owner_created", "incidents", ["owner_id", "created_at"])
    op.create_index("ix_incidents_owner_status", "incidents", ["owner_id", "status"])

    op.create_table(
        "audit_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("incident_id", sa.String(length=80), nullable=False),
        sa.Column("owner_id", sa.String(length=255), nullable=False),
        sa.Column("actor_id", sa.String(length=255), nullable=False),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("outcome", sa.String(length=50), nullable=False),
        sa.Column("correlation_id", sa.String(length=100), server_default="", nullable=False),
        sa.Column("detail", sa.Text(), server_default="", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_events_incident_id", "audit_events", ["incident_id"])
    op.create_index("ix_audit_events_owner_id", "audit_events", ["owner_id"])
    op.create_index("ix_audit_events_incident_created", "audit_events", ["incident_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_audit_events_incident_created", table_name="audit_events")
    op.drop_index("ix_audit_events_owner_id", table_name="audit_events")
    op.drop_index("ix_audit_events_incident_id", table_name="audit_events")
    op.drop_table("audit_events")
    op.drop_index("ix_incidents_owner_status", table_name="incidents")
    op.drop_index("ix_incidents_owner_created", table_name="incidents")
    op.drop_index("ix_incidents_owner_id", table_name="incidents")
    op.drop_table("incidents")

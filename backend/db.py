"""Async SQLAlchemy persistence for incidents and immutable audit events.

No implicit database or JSON fallback exists. Configure DATABASE_URL explicitly;
production deployments are required to use PostgreSQL.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy import DateTime, Index, Integer, JSON, String, Text, UniqueConstraint, delete, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from models.schemas import IncidentReport


class Base(DeclarativeBase):
    pass


class IncidentRecord(Base):
    __tablename__ = "incidents"
    __table_args__ = (
        Index("ix_incidents_owner_created", "owner_id", "created_at"),
        Index("ix_incidents_owner_status", "owner_id", "status"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    incident_id: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    owner_id: Mapped[str] = mapped_column(String(255), nullable=False, default="", index=True)
    service: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="unknown")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    report_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)


class AuditEvent(Base):
    __tablename__ = "audit_events"
    __table_args__ = (Index("ix_audit_events_incident_created", "incident_id", "created_at"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    incident_id: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    owner_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    actor_id: Mapped[str] = mapped_column(String(255), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    outcome: Mapped[str] = mapped_column(String(50), nullable=False)
    correlation_id: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    detail: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class RepositoryConnection(Base):
    __tablename__ = "repository_connections"
    __table_args__ = (
        UniqueConstraint("owner_id", "installation_id", name="uq_repo_conn_owner_installation"),
        Index("ix_repo_connections_owner", "owner_id"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    owner_id: Mapped[str] = mapped_column(String(255), nullable=False)
    installation_id: Mapped[str] = mapped_column(String(40), nullable=False, unique=True)
    account_login: Mapped[str] = mapped_column(String(255), nullable=False)
    account_type: Mapped[str] = mapped_column(String(40), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class ContributionScanRecord(Base):
    __tablename__ = "contribution_scans"
    __table_args__ = (Index("ix_contribution_scans_owner_created", "owner_id", "created_at"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    scan_id: Mapped[str] = mapped_column(String(36), unique=True, nullable=False)
    owner_id: Mapped[str] = mapped_column(String(255), nullable=False)
    repository: Mapped[str] = mapped_column(String(511), nullable=False)
    target_url: Mapped[str] = mapped_column(String(500), nullable=False)
    default_branch: Mapped[str] = mapped_column(String(255), nullable=False)
    source_sha: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="ready")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    publication_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    result_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)


class AIProviderCredential(Base):
    __tablename__ = "ai_provider_credentials"

    owner_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    model: Mapped[str] = mapped_column(String(200), nullable=False)
    encrypted_key: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class IncidentDB:
    """Database access object with no implicit persistence fallback."""

    def __init__(self, database_url: str | None = None):
        self.database_url = database_url if database_url is not None else os.getenv("DATABASE_URL", "")
        self._engine: AsyncEngine | None = None
        self._sessions: async_sessionmaker | None = None

    def _normalize_url(self) -> str:
        url = self.database_url.strip()
        if not url:
            raise HTTPException(status_code=503, detail="Database is not configured.")
        if url.startswith("postgres://"):
            url = "postgresql+asyncpg://" + url.removeprefix("postgres://")
        elif url.startswith("postgresql://"):
            url = "postgresql+asyncpg://" + url.removeprefix("postgresql://")
        if os.getenv("APP_ENV", "development").lower() == "production" and not url.startswith("postgresql+asyncpg://"):
            raise HTTPException(status_code=503, detail="Production requires a PostgreSQL DATABASE_URL.")
        if not url.startswith(("postgresql+asyncpg://", "sqlite+aiosqlite://")):
            raise HTTPException(status_code=503, detail="Unsupported database URL scheme.")
        return url

    def _session_factory(self) -> async_sessionmaker:
        if self._sessions is None:
            url = self._normalize_url()
            self._engine = create_async_engine(
                url,
                pool_pre_ping=True,
                pool_size=5 if url.startswith("postgresql") else 1,
                max_overflow=10 if url.startswith("postgresql") else 0,
            )
            self._sessions = async_sessionmaker(self._engine, expire_on_commit=False)
        return self._sessions

    async def health(self) -> bool:
        sessions = self._session_factory()
        async with sessions() as session:
            # Fail readiness if connectivity exists but the required migrations were not applied.
            await session.execute(select(IncidentRecord.id).limit(1))
        return True

    async def get_all(self, owner_id: str, limit: int = 100, offset: int = 0) -> list[IncidentReport]:
        sessions = self._session_factory()
        async with sessions() as session:
            result = await session.execute(
                select(IncidentRecord)
                .where(IncidentRecord.owner_id == owner_id)
                .order_by(IncidentRecord.created_at.desc(), IncidentRecord.incident_id.desc())
                .offset(max(0, offset))
                .limit(min(max(1, limit), 200))
            )
            return [IncidentReport.model_validate(row.report_json) for row in result.scalars()]

    async def get(self, incident_id: str, owner_id: str) -> IncidentReport | None:
        sessions = self._session_factory()
        async with sessions() as session:
            result = await session.execute(
                select(IncidentRecord).where(
                    IncidentRecord.incident_id == incident_id,
                    IncidentRecord.owner_id == owner_id,
                )
            )
            record = result.scalar_one_or_none()
            return IncidentReport.model_validate(record.report_json) if record else None

    async def exists(self, incident_id: str) -> bool:
        sessions = self._session_factory()
        async with sessions() as session:
            result = await session.execute(
                select(IncidentRecord.id).where(IncidentRecord.incident_id == incident_id)
            )
            return result.scalar_one_or_none() is not None

    async def set(self, incident_id: str, report: IncidentReport) -> None:
        sessions = self._session_factory()
        async with sessions() as session, session.begin():
            result = await session.execute(
                select(IncidentRecord)
                .where(IncidentRecord.incident_id == incident_id)
                .with_for_update()
            )
            record = result.scalar_one_or_none()
            payload = report.model_dump(mode="json")
            if record is None:
                record = IncidentRecord(
                    incident_id=incident_id,
                    owner_id=report.owner_id,
                    service=report.service,
                    status=report.status,
                    created_at=_parse_timestamp(report.created_at),
                    report_json=payload,
                )
                session.add(record)
            else:
                if record.owner_id != report.owner_id:
                    raise HTTPException(status_code=403, detail="Incident owner cannot be changed.")
                record.service = report.service
                record.status = report.status
                record.report_json = payload
                record.version += 1

    async def append_audit_event(
        self,
        *,
        incident_id: str,
        owner_id: str,
        actor_id: str,
        action: str,
        outcome: str,
        correlation_id: str = "",
        detail: str = "",
    ) -> None:
        sessions = self._session_factory()
        async with sessions() as session, session.begin():
            session.add(AuditEvent(
                incident_id=incident_id,
                owner_id=owner_id,
                actor_id=actor_id,
                action=action,
                outcome=outcome,
                correlation_id=correlation_id[:100],
                detail=detail[:2000],
                created_at=datetime.now(timezone.utc),
            ))

    async def claim_pr_creation(
        self, *, incident_id: str, owner_id: str, actor_id: str, report: IncidentReport
    ) -> None:
        """Atomically claim an eligible review and record the start event."""
        sessions = self._session_factory()
        now = datetime.now(timezone.utc)
        async with sessions() as session, session.begin():
            result = await session.execute(
                select(IncidentRecord)
                .where(IncidentRecord.incident_id == incident_id, IncidentRecord.owner_id == owner_id)
                .with_for_update()
            )
            record = result.scalar_one_or_none()
            if record is None:
                raise HTTPException(status_code=404, detail="Incident not found.")
            if record.status == "pr_creating":
                started = record.report_json.get("pr_action_started_at", "")
                try:
                    start_time = _parse_timestamp(started)
                except Exception:
                    start_time = now
                if now - start_time < timedelta(minutes=10):
                    raise HTTPException(status_code=409, detail="Pull request creation is already in progress.")
            elif record.status != "awaiting_review":
                raise HTTPException(status_code=409, detail="Incident is not available for PR creation.")

            report.status = "pr_creating"
            report.pr_action_started_at = now.isoformat()
            record.status = report.status
            record.report_json = report.model_dump(mode="json")
            record.version += 1
            session.add(AuditEvent(
                incident_id=incident_id,
                owner_id=owner_id,
                actor_id=actor_id,
                action="github_pr_create",
                outcome="started",
                correlation_id="",
                detail="Reviewer started pull request creation.",
                created_at=now,
            ))

    async def save_repository_connection(
        self, *, owner_id: str, installation_id: str, account_login: str, account_type: str
    ) -> None:
        sessions = self._session_factory()
        async with sessions() as session, session.begin():
            result = await session.execute(
                select(RepositoryConnection)
                .where(RepositoryConnection.installation_id == installation_id)
                .with_for_update()
            )
            row = result.scalar_one_or_none()
            if row is not None and row.owner_id != owner_id:
                raise HTTPException(status_code=409, detail="This repository installation is already linked to another account.")
            if row is None:
                row = RepositoryConnection(
                    owner_id=owner_id,
                    installation_id=installation_id,
                    account_login=account_login,
                    account_type=account_type,
                    created_at=datetime.now(timezone.utc),
                )
                session.add(row)
            else:
                row.account_login = account_login
                row.account_type = account_type

    async def get_repository_connections(self, owner_id: str) -> list[dict[str, str]]:
        sessions = self._session_factory()
        async with sessions() as session:
            result = await session.execute(
                select(RepositoryConnection)
                .where(RepositoryConnection.owner_id == owner_id)
                .order_by(RepositoryConnection.created_at.desc())
            )
            return [
                {"installation_id": row.installation_id, "account_login": row.account_login, "account_type": row.account_type}
                for row in result.scalars()
            ]

    async def remove_repository_connection(self, owner_id: str, installation_id: str) -> bool:
        sessions = self._session_factory()
        async with sessions() as session, session.begin():
            result = await session.execute(
                delete(RepositoryConnection).where(
                    RepositoryConnection.owner_id == owner_id,
                    RepositoryConnection.installation_id == installation_id,
                )
            )
            return bool(result.rowcount)

    async def save_ai_provider_credential(
        self, *, owner_id: str, provider: str, model: str, encrypted_key: str
    ) -> None:
        sessions = self._session_factory()
        async with sessions() as session, session.begin():
            row = await session.get(AIProviderCredential, owner_id, with_for_update=True)
            if row is None:
                row = AIProviderCredential(
                    owner_id=owner_id, provider=provider, model=model,
                    encrypted_key=encrypted_key, updated_at=datetime.now(timezone.utc),
                )
                session.add(row)
            else:
                row.provider = provider
                row.model = model
                row.encrypted_key = encrypted_key
                row.updated_at = datetime.now(timezone.utc)

    async def get_ai_provider_credential(self, owner_id: str) -> dict[str, str] | None:
        sessions = self._session_factory()
        async with sessions() as session:
            row = await session.get(AIProviderCredential, owner_id)
            if row is None:
                return None
            return {
                "owner_id": row.owner_id,
                "provider": row.provider,
                "model": row.model,
                "encrypted_key": row.encrypted_key,
            }

    async def delete_ai_provider_credential(self, owner_id: str) -> bool:
        sessions = self._session_factory()
        async with sessions() as session, session.begin():
            result = await session.execute(
                delete(AIProviderCredential).where(AIProviderCredential.owner_id == owner_id)
            )
            return bool(result.rowcount)

    async def save_contribution_scan(
        self,
        *,
        scan_id: str,
        owner_id: str,
        repository: str,
        target_url: str,
        default_branch: str,
        source_sha: str,
        result_json: dict[str, Any],
    ) -> None:
        sessions = self._session_factory()
        async with sessions() as session, session.begin():
            session.add(ContributionScanRecord(
                scan_id=scan_id,
                owner_id=owner_id,
                repository=repository,
                target_url=target_url,
                default_branch=default_branch,
                source_sha=source_sha,
                status=result_json.get("status", "ready"),
                created_at=datetime.now(timezone.utc),
                result_json=result_json,
            ))

    async def get_contribution_scan(self, scan_id: str, owner_id: str) -> dict[str, Any] | None:
        sessions = self._session_factory()
        async with sessions() as session:
            result = await session.execute(
                select(ContributionScanRecord).where(
                    ContributionScanRecord.scan_id == scan_id,
                    ContributionScanRecord.owner_id == owner_id,
                )
            )
            row = result.scalar_one_or_none()
            if row is None:
                return None
            return {
                "scan_id": row.scan_id,
                "owner_id": row.owner_id,
                "repository": row.repository,
                "target_url": row.target_url,
                "default_branch": row.default_branch,
                "source_sha": row.source_sha,
                "status": row.status,
                "created_at": row.created_at.isoformat(),
                "result": row.result_json,
            }

    async def claim_contribution_publication(self, *, scan_id: str, owner_id: str) -> None:
        sessions = self._session_factory()
        now = datetime.now(timezone.utc)
        async with sessions() as session, session.begin():
            result = await session.execute(
                select(ContributionScanRecord)
                .where(
                    ContributionScanRecord.scan_id == scan_id,
                    ContributionScanRecord.owner_id == owner_id,
                )
                .with_for_update()
            )
            row = result.scalar_one_or_none()
            if row is None:
                raise HTTPException(status_code=404, detail="Contribution scan not found.")
            if row.status == "published":
                raise HTTPException(status_code=409, detail="This contribution is already published.")
            if row.status == "publishing" and row.publication_started_at:
                started_at = row.publication_started_at
                if started_at.tzinfo is None:
                    started_at = started_at.replace(tzinfo=timezone.utc)
                if now - started_at < timedelta(minutes=10):
                    raise HTTPException(status_code=409, detail="Contribution publication is already in progress.")
            if row.status not in {"ready", "pr_created_issue_failed", "publishing"}:
                raise HTTPException(status_code=409, detail="This scan is not eligible for publication.")
            row.status = "publishing"
            row.publication_started_at = now

    async def update_contribution_scan(
        self, *, scan_id: str, owner_id: str, status: str, result_json: dict[str, Any]
    ) -> None:
        sessions = self._session_factory()
        async with sessions() as session, session.begin():
            result = await session.execute(
                select(ContributionScanRecord)
                .where(
                    ContributionScanRecord.scan_id == scan_id,
                    ContributionScanRecord.owner_id == owner_id,
                )
                .with_for_update()
            )
            row = result.scalar_one_or_none()
            if row is None:
                raise HTTPException(status_code=404, detail="Contribution scan not found.")
            row.status = status
            row.result_json = result_json
            if status != "publishing":
                row.publication_started_at = None

    async def close(self) -> None:
        if self._engine is not None:
            await self._engine.dispose()
            self._engine = None
            self._sessions = None


def _parse_timestamp(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


db = IncidentDB()

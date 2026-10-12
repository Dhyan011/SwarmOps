import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import create_async_engine

from db import Base, IncidentDB


@pytest.mark.asyncio
async def test_repository_installations_are_owner_scoped_and_cannot_be_claimed_twice(tmp_path):
    url = f"sqlite+aiosqlite:///{tmp_path / 'repo-connections.db'}"
    engine = create_async_engine(url)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    await engine.dispose()

    store = IncidentDB(database_url=url)
    await store.save_repository_connection(
        owner_id="user-a", installation_id="12345", account_login="acme", account_type="Organization"
    )
    assert await store.get_repository_connections("user-a") == [{
        "installation_id": "12345", "account_login": "acme", "account_type": "Organization"
    }]
    assert await store.get_repository_connections("user-b") == []

    with pytest.raises(HTTPException) as error:
        await store.save_repository_connection(
            owner_id="user-b", installation_id="12345", account_login="acme", account_type="Organization"
        )
    assert error.value.status_code == 409

    assert await store.remove_repository_connection("user-b", "12345") is False
    assert await store.get_repository_connections("user-a")
    assert await store.remove_repository_connection("user-a", "12345") is True
    assert await store.get_repository_connections("user-a") == []
    await store.close()

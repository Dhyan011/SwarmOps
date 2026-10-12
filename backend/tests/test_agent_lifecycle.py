import asyncio
from types import SimpleNamespace

import pytest

import agents.base as base_module
from agents.base import BaseAgent


class FakeSocket:
    async def emit(self, *args, **kwargs):
        return None


class Chunk:
    def __init__(self, content):
        self.choices = [SimpleNamespace(delta=SimpleNamespace(content=content))]


class FakeClient:
    def __init__(self, *, slow=False):
        self.closed = False
        self.slow = slow
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self.create))

    async def create(self, **kwargs):
        if self.slow:
            await asyncio.sleep(30)
        async def stream():
            yield Chunk('{"status":"ok"}')
        return stream()

    async def close(self):
        self.closed = True


@pytest.mark.asyncio
async def test_agent_closes_provider_client_after_success(monkeypatch):
    client = FakeClient()
    monkeypatch.setattr(base_module, "AsyncOpenAI", lambda **kwargs: client)
    agent = BaseAgent("test", "test", "Return JSON", FakeSocket())
    result = await agent.run({"api_key": "test-key", "owner_id": "user-a"})
    assert result["status"] == "ok"
    assert client.closed is True


@pytest.mark.asyncio
async def test_agent_closes_provider_client_when_request_is_cancelled(monkeypatch):
    client = FakeClient(slow=True)
    monkeypatch.setattr(base_module, "AsyncOpenAI", lambda **kwargs: client)
    agent = BaseAgent("test", "test", "Return JSON", FakeSocket())
    task = asyncio.create_task(agent.run({"api_key": "test-key", "owner_id": "user-a"}))
    await asyncio.sleep(0)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    assert client.closed is True

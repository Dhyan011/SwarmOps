import asyncio

import pytest

import agents.base as base_module
from agents.base import BaseAgent


class FakeSocket:
    async def emit(self, *args, **kwargs):
        return None


@pytest.mark.asyncio
async def test_agent_routes_to_selected_user_provider_and_model(monkeypatch):
    calls = []

    async def complete_chat(**kwargs):
        calls.append(kwargs)
        return '{"status":"ok"}'

    monkeypatch.setattr(base_module, "complete_chat", complete_chat)
    agent = BaseAgent("test", "test", "Return JSON", FakeSocket())
    provider = {"provider": "anthropic", "model": "claude-test", "api_key": "user-a-key"}
    result = await agent.run({"provider_config": provider, "owner_id": "user-a"})
    assert result["status"] == "ok"
    assert calls[0]["provider"] == "anthropic"
    assert calls[0]["model"] == "claude-test"
    assert calls[0]["api_key"] == "user-a-key"
    assert "user-a-key" not in str(calls[0]["messages"])


@pytest.mark.asyncio
async def test_agent_rejects_context_without_authenticated_provider_config():
    agent = BaseAgent("test", "test", "Return JSON", FakeSocket())
    with pytest.raises(ValueError, match="authenticated user's configured AI provider"):
        await agent.run({"api_key": "must-not-be-used", "owner_id": "user-a"})


@pytest.mark.asyncio
async def test_agent_cancellation_propagates_through_selected_provider(monkeypatch):
    started = asyncio.Event()

    async def slow_complete_chat(**kwargs):
        started.set()
        await asyncio.Event().wait()

    monkeypatch.setattr(base_module, "complete_chat", slow_complete_chat)
    agent = BaseAgent("test", "test", "Return JSON", FakeSocket())
    context = {"provider_config": {"provider": "openai", "model": "model-a", "api_key": "key-a"}, "owner_id": "user-a"}
    task = asyncio.create_task(agent.run(context))
    await started.wait()
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task

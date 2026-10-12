import asyncio
import socket

import pytest

from tools.github_fetcher import PublicOnlyResolver, validate_public_url


@pytest.mark.parametrize(
    "url",
    [
        "http://example.com/path",
        "https://127.0.0.1/",
        "https://10.1.2.3/",
        "https://169.254.169.254/latest/meta-data/",
        "https://[::1]/",
        "https://[fd00::1]/",
        "https://localhost/",
        "https://service.local/",
        "https://user:password@example.com/",
        "https://example.com:8443/",
        "https://example.com:invalid/",
    ],
)
def test_url_validator_rejects_non_public_or_ambiguous_targets(url):
    with pytest.raises(ValueError):
        validate_public_url(url)


def test_url_validator_accepts_canonical_public_https():
    parsed = validate_public_url("https://github.com/acme/project")
    assert parsed.hostname == "github.com"


@pytest.mark.asyncio
async def test_dns_resolver_rejects_private_answer_even_for_public_looking_name(monkeypatch):
    loop = asyncio.get_running_loop()

    async def private_dns(host, port, **kwargs):
        return [(socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", ("10.0.0.4", port))]

    monkeypatch.setattr(loop, "getaddrinfo", private_dns)
    with pytest.raises(OSError, match="Non-public"):
        await PublicOnlyResolver().resolve("attacker.example", 443, socket.AF_UNSPEC)


@pytest.mark.asyncio
async def test_dns_resolver_returns_public_ip_pinned_to_hostname(monkeypatch):
    loop = asyncio.get_running_loop()

    async def public_dns(host, port, **kwargs):
        return [(socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", ("8.8.8.8", port))]

    monkeypatch.setattr(loop, "getaddrinfo", public_dns)
    records = await PublicOnlyResolver().resolve("example.org", 443, socket.AF_UNSPEC)
    assert records == [{
        "hostname": "example.org",
        "host": "8.8.8.8",
        "port": 443,
        "family": socket.AF_INET,
        "proto": socket.IPPROTO_TCP,
        "flags": socket.AI_NUMERICHOST,
    }]

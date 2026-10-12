"""Application authentication backed by Supabase Auth JWTs.

Provider API keys are deliberately not accepted as user identity credentials.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

import jwt
from fastapi import Depends, Header, HTTPException, status
from jwt import PyJWKClient

from config import SUPABASE_JWT_SECRET, SUPABASE_URL, SUPABASE_JWT_AUDIENCE


@dataclass(frozen=True)
class Principal:
    """Identity established only from a verified Supabase access token."""

    user_id: str
    claims: dict[str, Any]


def _issuer() -> str:
    if not SUPABASE_URL:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured.",
        )
    return f"{SUPABASE_URL.rstrip('/')}/auth/v1"


@lru_cache(maxsize=8)
def _jwks_client(url: str) -> PyJWKClient:
    return PyJWKClient(url, cache_jwk_set=True, lifespan=300, timeout=5)


def _decode_access_token(token: str) -> dict[str, Any]:
    issuer = _issuer()
    options = {"require": ["sub", "exp", "iss", "aud"]}
    try:
        if SUPABASE_JWT_SECRET:
            claims = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience=SUPABASE_JWT_AUDIENCE,
                issuer=issuer,
                options=options,
                leeway=30,
            )
        else:
            signing_key = _jwks_client(
                f"{SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
            ).get_signing_key_from_jwt(token)
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["ES256", "RS256"],
                audience=SUPABASE_JWT_AUDIENCE,
                issuer=issuer,
                options=options,
                leeway=30,
            )
    except HTTPException:
        raise
    except jwt.PyJWTError as exc:
        # Expose no details about signing keys, token contents, or verifier internals.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication verification is temporarily unavailable.",
        ) from exc

    subject = claims.get("sub")
    if not isinstance(subject, str) or not subject.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Supabase user access tokens carry role=authenticated. Reject service-role,
    # anon, and non-user tokens rather than treating them as human identities.
    if claims.get("role") != "authenticated":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return claims


async def get_current_user(
    authorization: str | None = Header(default=None),
) -> Principal:
    """Verify a Supabase bearer token; missing auth configuration fails closed."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer access token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    scheme, separator, token = authorization.partition(" ")
    if not separator or scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer access token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    claims = await asyncio.to_thread(_decode_access_token, token.strip())
    return Principal(user_id=claims["sub"], claims=claims)


CurrentUser = Depends(get_current_user)

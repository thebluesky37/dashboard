import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, HTTPException, status
from fastapi.security.utils import get_authorization_scheme_param
from pydantic import BaseModel
from starlette.requests import Request

from dataline.config import config

router = APIRouter(tags=["embed"])

_DEFAULT_TOKEN_TTL_SECONDS = 86400  # 24 hours — covers a full user session
_MAX_TOKEN_TTL_SECONDS = 86400 * 30  # 30 days hard cap


class EmbedTokenRequest(BaseModel):
    client_id: str
    ttl_seconds: int = _DEFAULT_TOKEN_TTL_SECONDS  # override per-request if needed


class EmbedTokenResponse(BaseModel):
    token: str


def _require_embed_enabled() -> None:
    if not config.embed_secret or not config.embed_api_key:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Embed token feature is not configured. Set EMBED_SECRET and EMBED_API_KEY.",
        )


def _authenticate_embed_api_key(request: Request) -> None:
    authorization = request.headers.get("Authorization", "")
    scheme, param = get_authorization_scheme_param(authorization)
    if scheme.lower() != "bearer" or not param:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header. Expected: Bearer <embed_api_key>",
        )
    if not secrets.compare_digest(param, str(config.embed_api_key)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid embed API key.",
        )


@router.post("/embed-token")
async def create_embed_token(
    body: EmbedTokenRequest,
    request: Request,
) -> EmbedTokenResponse:
    """
    Server-to-server endpoint. The embedding application calls this with a
    pre-shared API key to obtain a short-lived JWT that encodes a client_id.

    The JWT is then embedded in the iframe URL:
        <iframe src="https://dataline.app/?embed=1&embed_token=<token>" />

    The token is verified by DataLine when creating a conversation, so end
    users cannot forge or tamper with the client_id.

    Authentication: Authorization: Bearer <EMBED_API_KEY>
    """
    _require_embed_enabled()
    _authenticate_embed_api_key(request)

    ttl = min(body.ttl_seconds, _MAX_TOKEN_TTL_SECONDS)
    now = datetime.now(tz=timezone.utc)
    payload = {
        "client_id": body.client_id,
        "iat": now,
        "exp": now + timedelta(seconds=ttl),
    }
    token = jwt.encode(payload, str(config.embed_secret), algorithm="HS256")
    return EmbedTokenResponse(token=token)


def decode_embed_token(token: str) -> str:
    """
    Decode and verify an embed JWT. Returns the client_id claim.
    Raises HTTPException on any failure (expired, tampered, etc.).
    """
    if not config.embed_secret:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Embed token feature is not configured.",
        )
    try:
        payload = jwt.decode(token, str(config.embed_secret), algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Embed token has expired. Request a new one.",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid embed token.",
        )
    client_id = payload.get("client_id")
    if not client_id or not isinstance(client_id, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Embed token is missing client_id claim.",
        )
    return client_id

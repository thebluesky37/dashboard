import binascii
import logging
import secrets
from base64 import b64decode
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.security.utils import get_authorization_scheme_param
from starlette.requests import Request
from starlette.status import HTTP_401_UNAUTHORIZED

from dataline.config import config

logger = logging.getLogger(__name__)


class HTTPBasicCustomized(HTTPBasic):
    # Override __call__ method to not send www-authenticate header back
    async def __call__(self, request: Request) -> Optional[HTTPBasicCredentials]:  # type: ignore
        authorization = request.cookies.get("Authorization")
        scheme, param = get_authorization_scheme_param(authorization)
        if not authorization or scheme.lower() != "basic":
            if self.auto_error:
                raise HTTPException(
                    status_code=HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated",
                )
            else:
                return None
        invalid_user_credentials_exc = HTTPException(
            status_code=HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
        try:
            data = b64decode(param).decode("ascii")
        except (ValueError, UnicodeDecodeError, binascii.Error):
            raise invalid_user_credentials_exc  # noqa: B904
        username, separator, password = data.partition(":")
        if not separator:
            raise invalid_user_credentials_exc
        return HTTPBasicCredentials(username=username, password=password)


security = HTTPBasicCustomized()
security_optional = HTTPBasicCustomized(auto_error=False)


def validate_credentials(username: str, password: str) -> bool:
    correct_username = secrets.compare_digest(username, str(config.auth_username))
    correct_password = secrets.compare_digest(password, str(config.auth_password))
    if not (correct_username and correct_password):
        # Do not send www-authenticate header back
        # as we do not want the browser to show a popup
        # FE will handle authentication
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    return True


def authenticate(credentials: HTTPBasicCredentials = Depends(security)) -> None:
    validate_credentials(credentials.username, credentials.password)


async def require_admin(
    credentials: Optional[HTTPBasicCredentials] = Depends(security_optional),
) -> None:
    """Dependency that allows only valid admin credentials. Rejects anonymous with 403."""
    if not config.has_auth:
        return  # auth disabled → allow all
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    validate_credentials(credentials.username, credentials.password)

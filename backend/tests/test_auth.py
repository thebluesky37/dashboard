import asyncio

import pytest
from fastapi import HTTPException

from dataline.auth import require_admin


def test_require_admin_raises_403_for_anonymous(monkeypatch):
    monkeypatch.setattr("dataline.auth.config.auth_username", "admin")
    monkeypatch.setattr("dataline.auth.config.auth_password", "secret")
    # No credentials supplied → credentials will be None from Optional dependency
    with pytest.raises(HTTPException) as exc_info:
        asyncio.get_event_loop().run_until_complete(require_admin(None))
    assert exc_info.value.status_code == 403

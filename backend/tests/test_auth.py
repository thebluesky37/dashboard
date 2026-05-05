import asyncio
import base64

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from rldashboard.auth import require_admin


def test_require_admin_raises_403_for_anonymous(monkeypatch):
    monkeypatch.setattr("rldashboard.auth.config.auth_username", "admin")
    monkeypatch.setattr("rldashboard.auth.config.auth_password", "secret")
    # No credentials supplied → credentials will be None from Optional dependency
    with pytest.raises(HTTPException) as exc_info:
        asyncio.get_event_loop().run_until_complete(require_admin(None))
    assert exc_info.value.status_code == 403


def test_anonymous_can_access_connections(monkeypatch):
    monkeypatch.setattr("rldashboard.config.config.auth_username", "admin")
    monkeypatch.setattr("rldashboard.config.config.auth_password", "adminpass")
    from rldashboard.app import App
    test_app = App()
    client = TestClient(test_app, raise_server_exceptions=False)
    # No auth at all — anonymous request should still read connections
    response = client.get("/connections")
    assert response.status_code not in (401, 403)


def test_admin_can_access_connections(monkeypatch):
    monkeypatch.setattr("rldashboard.config.config.auth_username", "admin")
    monkeypatch.setattr("rldashboard.config.config.auth_password", "adminpass")
    from rldashboard.app import App
    test_app = App()
    client = TestClient(test_app, raise_server_exceptions=False)
    # HTTPBasicCustomized reads from cookie "Authorization", not the HTTP header
    encoded = base64.b64encode(b"admin:adminpass").decode()
    response = client.get("/connections", cookies={"Authorization": f"Basic {encoded}"})
    assert response.status_code not in (401, 403)


def test_anonymous_cannot_create_connections(monkeypatch):
    monkeypatch.setattr("rldashboard.config.config.auth_username", "admin")
    monkeypatch.setattr("rldashboard.config.config.auth_password", "adminpass")
    from rldashboard.app import App

    test_app = App()
    client = TestClient(test_app, raise_server_exceptions=False)
    response = client.post(
        "/connect",
        json={"dsn": "postgresql://postgres:secret@localhost:5432/rldashboard_test", "name": "Test"},
    )
    assert response.status_code == 403


def test_anonymous_can_access_settings_info(monkeypatch):
    monkeypatch.setattr("rldashboard.config.config.auth_username", "admin")
    monkeypatch.setattr("rldashboard.config.config.auth_password", "adminpass")
    from rldashboard.app import App

    test_app = App()
    client = TestClient(test_app, raise_server_exceptions=False)
    response = client.get("/settings/info")
    # Can be 200 when user exists or 404 when not created yet; auth should not block.
    assert response.status_code not in (401, 403)


def test_anonymous_can_access_settings_avatar(monkeypatch):
    monkeypatch.setattr("rldashboard.config.config.auth_username", "admin")
    monkeypatch.setattr("rldashboard.config.config.auth_password", "adminpass")
    from rldashboard.app import App

    test_app = App()
    client = TestClient(test_app, raise_server_exceptions=False)
    response = client.get("/settings/avatar")
    # Can be 200 when avatar exists or 404 when missing; auth should not block.
    assert response.status_code not in (401, 403)


def test_anonymous_can_access_conversations(monkeypatch):
    monkeypatch.setattr("rldashboard.config.config.auth_username", "admin")
    monkeypatch.setattr("rldashboard.config.config.auth_password", "adminpass")
    from rldashboard.app import App
    test_app = App()
    client = TestClient(test_app, raise_server_exceptions=False)
    # No auth — anonymous user can list conversations
    response = client.get("/conversations")
    assert response.status_code not in (401, 403)

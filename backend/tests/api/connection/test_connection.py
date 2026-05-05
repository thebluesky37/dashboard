import logging
import os

import pytest
from fastapi.testclient import TestClient

from rldashboard.models.connection.schema import Connection

logger = logging.getLogger(__name__)


@pytest.mark.asyncio
async def test_connect_db(client: TestClient) -> None:
    database_url = os.environ["DATABASE_URL"]
    connection_in = {
        "dsn": database_url,
        "name": "Test",
    }
    response = client.post("/connect", json=connection_in)

    assert response.status_code == 200

    data = response.json()["data"]
    assert data["id"]
    assert data["dsn"] == connection_in["dsn"]
    assert data["name"] == connection_in["name"]
    assert data["dialect"] == "postgresql"
    assert data["database"]
    assert data["is_sample"] is False


@pytest.mark.asyncio
async def test_connect_db_marked_as_sample(client: TestClient) -> None:
    database_url = os.environ["DATABASE_URL"]
    connection_in = {
        "dsn": database_url,
        "name": "My DB",
        "is_sample": True,
    }
    response = client.post("/connect", json=connection_in)

    assert response.status_code == 200

    data = response.json()["data"]
    assert data["id"]
    assert data["dsn"] == database_url
    assert data["name"] == connection_in["name"]
    assert data["dialect"] == "postgresql"
    assert data["database"]
    assert data["is_sample"] is True


@pytest.mark.asyncio
async def test_create_connection_twice_409(client: TestClient) -> None:
    database_url = os.environ["DATABASE_URL"]
    connection_in = {
        "dsn": database_url,
        "name": "Test",
        "is_sample": False,
    }
    response = client.post("/connect", json=connection_in)
    assert response.status_code == 200
    Connection(**response.json()["data"])

    response = client.post("/connect", json=connection_in)
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_get_connections(client: TestClient, dvdrental_connection: Connection) -> None:
    response = client.get("/connections")

    assert response.status_code == 200

    data = response.json()["data"]
    assert data["connections"]
    assert len(data["connections"]) == 1

    connections = data["connections"]
    assert connections[0] == dvdrental_connection.model_dump(mode="json")


@pytest.mark.asyncio
async def test_get_connection(client: TestClient, dvdrental_connection: Connection) -> None:
    response = client.get(f"/connection/{str(dvdrental_connection.id)}")

    assert response.status_code == 200

    data = response.json()["data"]
    assert data == dvdrental_connection.model_dump(mode="json")


@pytest.mark.asyncio
async def test_update_connection(client: TestClient, dvdrental_connection: Connection) -> None:
    update_in = {
        "name": "New name",
    }
    response = client.patch(f"/connection/{str(dvdrental_connection.id)}", json=update_in)

    assert response.status_code == 200

    data = response.json()["data"]
    assert data["connection"]["dsn"] == dvdrental_connection.dsn
    assert data["connection"]["name"] == update_in["name"]


@pytest.mark.asyncio
async def test_delete_connection(client: TestClient, dvdrental_connection: Connection) -> None:
    response = client.delete(f"/connection/{str(dvdrental_connection.id)}")

    assert response.status_code == 200

    # Check if the connection was deleted
    response = client.get("/connections")
    data = response.json()["data"]
    assert len(data["connections"]) == 0


@pytest.mark.asyncio
async def test_update_connection_instructions(client: TestClient, dvdrental_connection: Connection) -> None:
    response = client.patch(
        f"/connection/{str(dvdrental_connection.id)}",
        json={"instructions": "Always explain results in French."},
    )
    assert response.status_code == 200
    assert response.json()["data"]["connection"]["instructions"] == "Always explain results in French."

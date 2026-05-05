import os
from typing import AsyncGenerator

import pytest_asyncio
from fastapi.testclient import TestClient

from rldashboard.models.connection.schema import Connection, TableSchema


@pytest_asyncio.fixture
async def dvdrental_connection(client: TestClient) -> AsyncGenerator[Connection, None]:
    database_url = os.environ["DATABASE_URL"]
    connection_in = {
        "dsn": database_url,
        "name": "Test",
        "is_sample": False,
    }
    response = client.post("/connect", json=connection_in)

    assert response.status_code == 200
    connection = Connection(**response.json()["data"])

    # TODO: Remove after sqlalchemy migration
    # Manual rollback
    yield connection
    client.delete(f"/connection/{str(connection.id)}")


@pytest_asyncio.fixture
async def example_table_schema(client: TestClient, dvdrental_connection: Connection) -> TableSchema:
    response = client.get(f"/connection/{str(dvdrental_connection.id)}/schemas")
    return TableSchema.model_validate(response.json()["data"]["tables"][0])

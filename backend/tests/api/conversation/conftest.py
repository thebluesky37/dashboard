import pytest_asyncio
from fastapi.testclient import TestClient

from rldashboard.models.connection.schema import Connection
from rldashboard.models.conversation.schema import ConversationOut
from rldashboard.repositories.base import AsyncSession


@pytest_asyncio.fixture
async def sample_conversation(
    client: TestClient, session: AsyncSession, dvdrental_connection: Connection
) -> ConversationOut:
    data = {
        "connection_id": str(dvdrental_connection.id),
        "name": "Test convo",
    }
    response = client.post("/conversation", json=data)
    assert response.status_code == 200

    return ConversationOut(**response.json()["data"])

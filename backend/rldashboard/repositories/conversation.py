from datetime import datetime
from typing import Sequence, Type
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from rldashboard.models.conversation.model import ConversationModel
from rldashboard.models.message.model import MessageModel
from rldashboard.repositories.base import AsyncSession, BaseRepository


class ConversationCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    connection_id: UUID
    name: str
    created_at: datetime = Field(default_factory=datetime.now)
    client_id: str | None = None


class ConversationUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    connection_id: UUID | None = None
    name: str | None = None
    client_id: str | None = None


class ConversationRepository(BaseRepository[ConversationModel, ConversationCreate, ConversationUpdate]):
    @property
    def model(self) -> Type[ConversationModel]:
        return ConversationModel

    async def get_with_messages_with_results(self, session: AsyncSession, conversation_id: UUID) -> ConversationModel:
        query = (
            select(ConversationModel)
            .filter_by(id=conversation_id)
            .options(joinedload(ConversationModel.messages).joinedload(MessageModel.results))
        )
        return await self.get_unique(session, query)

    async def list_with_messages_with_results(
        self, session: AsyncSession, client_id: str | None = None
    ) -> Sequence[ConversationModel]:
        query = select(ConversationModel).options(
            joinedload(ConversationModel.messages).joinedload(MessageModel.results)
        )
        if client_id is not None:
            query = query.filter_by(client_id=client_id)
        return await self.list_unique(session, query)

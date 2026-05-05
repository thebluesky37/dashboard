from typing import Sequence, Type
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import contains_eager

from rldashboard.models.llm_flow.enums import QueryResultType
from rldashboard.models.message.model import MessageModel
from rldashboard.models.message.schema import MessageCreate, MessageUpdate
from rldashboard.models.result.model import ResultModel
from rldashboard.repositories.base import AsyncSession, BaseRepository


class MessageRepository(BaseRepository[MessageModel, MessageCreate, MessageUpdate]):
    @property
    def model(self) -> Type[MessageModel]:
        return MessageModel

    async def get_by_conversation(self, session: AsyncSession, conversation_id: UUID) -> Sequence[MessageModel]:
        query = select(MessageModel).filter_by(conversation_id=conversation_id).order_by(MessageModel.created_at)
        return await self.list(session, query=query)

    async def get_by_conversation_with_sql_results(
        self, session: AsyncSession, conversation_id: UUID, n: int = 10
    ) -> Sequence[MessageModel]:
        query = (
            select(MessageModel)
            .filter_by(conversation_id=conversation_id)
            .outerjoin(
                ResultModel,
                onclause=(ResultModel.message_id == MessageModel.id)
                & (ResultModel.type == QueryResultType.SQL_QUERY_STRING_RESULT.value),
            )
            .options(contains_eager(MessageModel.results))
            .order_by(MessageModel.created_at.desc())
            .limit(n)
        )
        return await self.list_unique(session, query=query)

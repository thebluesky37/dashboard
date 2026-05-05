from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from rldashboard.models.base import CustomUUIDType, DBModel, UUIDMixin
from rldashboard.models.message.model import MessageModel


class ResultModel(DBModel, UUIDMixin, kw_only=True):
    __tablename__ = "results"
    content: Mapped[str] = mapped_column("content", Text, nullable=False)
    type: Mapped[str] = mapped_column("type", String, nullable=False)
    created_at: Mapped[datetime | None] = mapped_column("created_at", DateTime(timezone=False))
    message_id: Mapped[UUID] = mapped_column(ForeignKey(MessageModel.id, ondelete="CASCADE"))
    linked_id: Mapped[UUID | None] = mapped_column(CustomUUIDType, nullable=True)

    # Relationships
    message: Mapped["MessageModel"] = relationship("MessageModel", back_populates="results")

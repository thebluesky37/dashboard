import base64

from fastapi import APIRouter, Depends, HTTPException, UploadFile, BackgroundTasks

from dataline.models.connection.schema import Connection as ConnectionSchema
from dataline.models.user.schema import AvatarOut, UserOut, UserUpdateIn
from dataline.old_models import SuccessResponse
from dataline.repositories.base import AsyncSession, get_session
from dataline.repositories.connection import ConnectionRepository
from dataline.repositories.user import UserCreate, UserRepository
from dataline.services.settings import SettingsService
from dataline.utils.posthog import posthog_capture

router = APIRouter(prefix="/settings", tags=["settings"])
public_settings_router = APIRouter(tags=["settings"])
user_repo = UserRepository()
connection_repo = ConnectionRepository()


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile,
    background_tasks: BackgroundTasks,
    settings_service: SettingsService = Depends(SettingsService),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[AvatarOut]:
    background_tasks.add_task(posthog_capture, "avatar_uploaded")

    media = await settings_service.upload_avatar(session, file)
    blob_base64 = base64.b64encode(media.blob).decode("utf-8")
    return SuccessResponse(data=AvatarOut(blob=blob_base64))


@router.get("/avatar")
async def get_avatar(
    settings_service: SettingsService = Depends(SettingsService), session: AsyncSession = Depends(get_session)
) -> SuccessResponse[AvatarOut]:
    media = await settings_service.get_avatar(session)
    if media is None:
        raise HTTPException(status_code=404, detail="No user avatar found")

    blob_base64 = base64.b64encode(media.blob).decode("utf-8")
    return SuccessResponse(data=AvatarOut(blob=blob_base64))


@router.patch("/info")
async def update_info(
    data: UserUpdateIn,
    settings_service: SettingsService = Depends(SettingsService),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[UserOut]:
    user_info = await settings_service.update_user_info(session, data=data)
    return SuccessResponse(data=user_info)


@router.get("/info")
async def get_info(
    settings_service: SettingsService = Depends(SettingsService), session: AsyncSession = Depends(get_session)
) -> SuccessResponse[UserOut]:
    user_info = await settings_service.get_user_info(session)
    return SuccessResponse(data=user_info)


@public_settings_router.get("/settings/default-connection")
async def get_default_connection(
    session: AsyncSession = Depends(get_session),
) -> ConnectionSchema | None:
    user = await user_repo.get_one_or_none(session)
    if user is None:
        user = await user_repo.create(session, UserCreate())

    if user.default_connection_id is None:
        return None

    connection = await connection_repo.get_by_uuid(session, user.default_connection_id)
    return ConnectionSchema.model_validate(connection)

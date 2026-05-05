import logging
from typing import Any, AsyncContextManager, Callable, Mapping, Self

import fastapi
from fastapi import Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from dataline.api.auth.router import router as auth_router
from dataline.api.connection.router import router as connection_router
from dataline.api.conversation.router import router as conversation_router
from dataline.api.embed.router import router as embed_router
from dataline.api.result.router import router as result_router
from dataline.api.settings.router import public_settings_router, router as settings_router
from dataline.auth import authenticate
from dataline.config import config
from dataline.errors import UserFacingError, ValidationError
from dataline.repositories.base import NotFoundError, NotUniqueError

logger = logging.getLogger(__name__)


class FrameAncestorsMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: Any, frame_ancestors: str = "*") -> None:
        super().__init__(app)
        self.frame_ancestors = frame_ancestors

    async def dispatch(self, request: Request, call_next: Any) -> Any:
        response = await call_next(request)
        response.headers["Content-Security-Policy"] = f"frame-ancestors {self.frame_ancestors}"
        return response


def handle_exceptions(request: Request, e: Exception) -> JSONResponse:
    if isinstance(e, NotFoundError):
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"detail": e.message})
    elif isinstance(e, NotUniqueError):
        return JSONResponse(status_code=status.HTTP_409_CONFLICT, content={"detail": e.message})
    elif isinstance(e, ValidationError):
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"detail": str(e)})
    elif isinstance(e, UserFacingError):
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"detail": str(e)})

    logger.exception(e)
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"detail": str(e)})


class App(fastapi.FastAPI):
    def __init__(  # type: ignore[misc]
        self,
        lifespan: Callable[[Self], AsyncContextManager[Mapping[str, Any]]] | None = None,
    ) -> None:
        super().__init__(title="Dataline API", lifespan=lifespan)
        self.add_middleware(
            CORSMiddleware,
            allow_origins=config.allowed_origins.split(",") if config.has_auth else ["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        self.add_middleware(FrameAncestorsMiddleware, frame_ancestors=config.allowed_frame_ancestors)

        if config.has_auth:
            # Add route for login
            self.include_router(auth_router)

        # Settings and connection routes perform endpoint-level auth checks.
        self.include_router(settings_router)
        self.include_router(public_settings_router)
        self.include_router(connection_router)

        # User-accessible (no auth required): conversations, results
        self.include_router(conversation_router)
        self.include_router(result_router)

        # Embed token: server-to-server, auth is done at endpoint level via Bearer API key
        self.include_router(embed_router)

        # Handle 500s separately to play well with TestClient and allow re-raising in tests
        self.add_exception_handler(NotFoundError, handle_exceptions)
        self.add_exception_handler(NotUniqueError, handle_exceptions)
        self.add_exception_handler(ValidationError, handle_exceptions)
        self.add_exception_handler(UserFacingError, handle_exceptions)
        self.add_exception_handler(Exception, handle_exceptions)

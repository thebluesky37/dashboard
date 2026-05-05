import logging.config
import os
import pathlib
from base64 import b64encode
from typing import AsyncGenerator, Generator
from unittest import mock

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy import create_engine as create_sync_engine
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from testcontainers.postgres import PostgresContainer

from alembic.command import upgrade
from alembic.config import Config
from rldashboard.app import App
from rldashboard.models.base import DBModel
from rldashboard.repositories.base import AsyncSession, get_session
from rldashboard.utils.posthog import posthog

logging.basicConfig(level=logging.INFO)

# Disable Posthog in tests
posthog.disabled = True


def pytest_addoption(parser):
    parser.addoption("--run-expensive", action="store_true", default=False, help="run expensive tests")


# https://docs.pytest.org/en/stable/example/simple.html#control-skipping-of-tests-according-to-command-line-option
def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]):
    if not config.getoption("--run-expensive"):
        # --run-expensive not passed in cli: skip expensive tests
        skip_expensive = pytest.mark.skip(reason="need --run-expensive option to run")
        for item in items:
            if "expensive" in item.keywords:
                item.add_marker(skip_expensive)


def to_sync_database_url(database_url: str) -> str:
    if database_url.startswith("postgresql+asyncpg://"):
        return database_url.replace("+asyncpg", "+psycopg2", 1)
    return database_url


@pytest.fixture(scope="session", autouse=True)
def postgres_container() -> Generator[str, None, None]:
    """Start a throwaway Postgres container for the test session."""
    with PostgresContainer("postgres:16") as pg:
        # get_connection_url() returns a psycopg2 URL; convert to asyncpg for the app
        sync_url = pg.get_connection_url()
        async_url = sync_url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)
        os.environ["DATABASE_URL"] = async_url
        yield async_url


@pytest_asyncio.fixture(scope="session")
async def engine(apply_migrations: None) -> AsyncGenerator[AsyncEngine, None]:
    database_url = os.environ["DATABASE_URL"]
    engine = create_async_engine(database_url)

    yield engine
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def session(engine: AsyncEngine, monkeypatch: pytest.MonkeyPatch) -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSession(engine) as session, session.begin():
        # prevent test from committing anything, only flush
        # only useful in case we move to real DBs not in-mem
        monkeypatch.setattr(session, "commit", mock.AsyncMock(wraps=session.flush))
        yield session
        await session.rollback()


@pytest.fixture(scope="session", autouse=True)
def apply_migrations(postgres_container: str) -> None:
    config = Config((pathlib.Path(__file__).parent.parent / "alembic.ini").resolve())
    database_url = os.environ["DATABASE_URL"]
    db_schema = os.environ.get("DB_SCHEMA", "public")
    sync_url = to_sync_database_url(database_url)

    # Keep tests deterministic across runs.
    if db_schema != "public":
        with create_sync_engine(sync_url).begin() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{db_schema}" CASCADE'))
            connection.execute(text(f'CREATE SCHEMA "{db_schema}"'))

    config.set_main_option("sqlalchemy.url", sync_url)
    config.config_file_name = None  # to prevent alembic from overriding the logs
    upgrade(config, "head")


app = App()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    sync_url = to_sync_database_url(os.environ["DATABASE_URL"])
    db_schema = os.environ.get("DB_SCHEMA", "public") or "public"
    with create_sync_engine(sync_url).begin() as connection:
        connection.execute(
            text(
                f'TRUNCATE TABLE "{db_schema}"."results", '
                f'"{db_schema}"."messages", '
                f'"{db_schema}"."conversations", '
                f'"{db_schema}"."media", '
                f'"{db_schema}"."user", '
                f'"{db_schema}"."connections" '
                "RESTART IDENTITY CASCADE"
            )
        )

    async def override_get_session() -> AsyncGenerator[AsyncSession, None]:
        request_engine = create_async_engine(os.environ["DATABASE_URL"])
        async with AsyncSession(request_engine) as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await request_engine.dispose()

    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app=app, raise_server_exceptions=True) as client:
        encoded = b64encode(b"admin:admin").decode()
        client.cookies.set("Authorization", f"Basic {encoded}")
        yield client


pytest_plugins = ["tests.api.connection.conftest", "tests.api.conversation.conftest"]

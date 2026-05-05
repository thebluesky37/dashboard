# flake8: noqa
import os
from logging.config import fileConfig
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection

from alembic import context
from rldashboard.config import config as rldashboard_config
from rldashboard.models import DBModel


def quote_ident(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def get_postgres_schema() -> str | None:
    if not rldashboard_config.is_postgres_storage:
        return None
    return rldashboard_config.db_schema or "public"


def get_search_path_sql() -> str | None:
    schema_name = get_postgres_schema()
    if schema_name is None:
        return None
    return f"{quote_ident(schema_name)}, public"


def get_search_path_setting() -> str | None:
    schema_name = get_postgres_schema()
    if schema_name is None:
        return None
    return f"{schema_name},public"


def get_alembic_schema_config() -> dict[str, Any]:
    schema_name = get_postgres_schema()
    if schema_name is not None:
        return {
            "version_table_schema": schema_name,
            "include_schemas": True,
        }
    return {}


def to_sync_database_url(database_url: str) -> str:
    if database_url.startswith("postgresql+asyncpg://"):
        return database_url.replace("+asyncpg", "+psycopg2", 1)
    if database_url.startswith("sqlite+aiosqlite://"):
        return database_url.replace("+aiosqlite", "", 1)
    return database_url


def get_sync_database_url() -> str:
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        return to_sync_database_url(database_url)
    configured_url = config.get_main_option("sqlalchemy.url")
    if configured_url:
        return configured_url
    return to_sync_database_url(rldashboard_config.database_url)


def configure_postgres_schema(dsn: str) -> None:
    schema_name = get_postgres_schema()
    search_path = get_search_path_sql()
    if schema_name is None or search_path is None:
        return

    bootstrap_engine = create_engine(dsn, echo=rldashboard_config.database_echo, isolation_level="AUTOCOMMIT")
    try:
        with bootstrap_engine.connect() as connection:
            if schema_name != "public":
                connection.execute(text(f"CREATE SCHEMA IF NOT EXISTS {quote_ident(schema_name)}"))

            current_user = connection.execute(text("SELECT current_user")).scalar_one()
            current_database = connection.execute(text("SELECT current_database()")) .scalar_one()
            connection.execute(
                text(
                    f"ALTER ROLE {quote_ident(current_user)} IN DATABASE {quote_ident(current_database)} "
                    f"SET search_path TO {search_path}"
                )
            )
    finally:
        bootstrap_engine.dispose()

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = DBModel.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    context.configure(
        url=get_sync_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        **get_alembic_schema_config(),
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    search_path = get_search_path_sql()
    if search_path is not None:
        connection.execute(text(f"SET search_path TO {search_path}"))
        connection.commit()

    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        **get_alembic_schema_config(),
    )

    with context.begin_transaction():
        context.run_migrations()


def process_revision_directives(context: Any, revision: Any, directives: Any) -> None:
    if context.config.cmd_opts.autogenerate:
        script = directives[0]
        if script.upgrade_ops.is_empty():
            directives[:] = []


async def run_async_migrations() -> None:
    """In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    from sqlalchemy.ext.asyncio import create_async_engine

    dsn = rldashboard_config.database_url
    engine = create_async_engine(dsn, echo=rldashboard_config.database_echo)

    async with engine.connect() as connection:
        search_path = get_search_path_sql()
        if search_path is not None:
            schema_name = get_postgres_schema()
            if schema_name is not None and schema_name != "public":
                await connection.execute(text(f"CREATE SCHEMA IF NOT EXISTS {quote_ident(schema_name)}"))
            await connection.execute(text(f"SET search_path TO {search_path}"))
            await connection.commit()
        await connection.run_sync(do_run_migrations)

    await engine.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    dsn = get_sync_database_url()
    configure_postgres_schema(dsn)
    engine = create_engine(dsn, echo=rldashboard_config.database_echo)

    with engine.connect() as connection:
        search_path = get_search_path_sql()
        if search_path is not None:
            connection.execute(text(f"SET search_path TO {search_path}"))
            connection.commit()
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            **get_alembic_schema_config(),
        )

        with context.begin_transaction():
            context.run_migrations()

    engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

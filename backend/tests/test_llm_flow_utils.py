import os
import uuid

from langchain_community.utilities.sql_database import SQLDatabase
from sqlalchemy import create_engine

from rldashboard.services.llm_flow.utils import RldashboardSQLDatabase


def to_sync_database_url(database_url: str) -> str:
    if database_url.startswith("postgresql+asyncpg://"):
        return database_url.replace("+asyncpg", "+psycopg2", 1)
    return database_url


def test_get_table_info_handles_sample_row_type_errors(monkeypatch) -> None:
    sync_url = to_sync_database_url(os.environ["DATABASE_URL"])
    table_name = f"flights_{uuid.uuid4().hex[:8]}"
    engine = create_engine(sync_url)

    with engine.begin() as conn:
        conn.exec_driver_sql(f"CREATE TABLE {table_name} (price DECIMAL(10,2), airline TEXT)")
        conn.exec_driver_sql(f"INSERT INTO {table_name} (price, airline) VALUES ('123.45', 'RLDashboard Air')")

    db = RldashboardSQLDatabase.from_uri(sync_url, sample_rows_in_table_info=1)

    def raise_type_error(*args, **kwargs) -> str:
        raise TypeError("must be real number, not str")

    monkeypatch.setattr(db, "_get_sample_rows", raise_type_error)

    table_info = db.get_table_info()

    assert "CREATE TABLE" in table_info
    assert table_name in table_info

    with engine.begin() as conn:
        conn.exec_driver_sql(f"DROP TABLE IF EXISTS {table_name}")


def test_get_sample_rows_falls_back_to_driver_sql_on_type_error(monkeypatch) -> None:
    sync_url = to_sync_database_url(os.environ["DATABASE_URL"])
    table_name = f"flights_{uuid.uuid4().hex[:8]}"
    engine = create_engine(sync_url)

    with engine.begin() as conn:
        conn.exec_driver_sql(f"CREATE TABLE {table_name} (price DECIMAL(10,2), airline TEXT)")
        conn.exec_driver_sql(f"INSERT INTO {table_name} (price, airline) VALUES ('123.45', 'RLDashboard Air')")

    db = RldashboardSQLDatabase.from_uri(sync_url, sample_rows_in_table_info=1)
    table = next(tbl for tbl in db._metadata.sorted_tables if tbl.name == table_name)

    def raise_type_error(*args, **kwargs) -> str:
        raise TypeError("must be real number, not str")

    monkeypatch.setattr(SQLDatabase, "_get_sample_rows", raise_type_error)

    sample_rows = db._get_sample_rows(table)

    assert f"1 rows from {table_name} table" in sample_rows
    assert "price\tairline" in sample_rows
    assert "123.45\tRLDashboard Air" in sample_rows

    with engine.begin() as conn:
        conn.exec_driver_sql(f"DROP TABLE IF EXISTS {table_name}")

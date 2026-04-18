from pathlib import Path

from langchain_community.utilities.sql_database import SQLDatabase
from sqlalchemy import create_engine

from dataline.services.llm_flow.utils import DatalineSQLDatabase


def test_get_table_info_handles_sample_row_type_errors(tmp_path: Path, monkeypatch) -> None:
    db_path = tmp_path / "travel_sample.sqlite"
    engine = create_engine(f"sqlite:///{db_path}")

    with engine.begin() as conn:
        conn.exec_driver_sql("CREATE TABLE flights (price DECIMAL(10,2), airline TEXT)")
        conn.exec_driver_sql("INSERT INTO flights (price, airline) VALUES ('123.45', 'DataLine Air')")

    db = DatalineSQLDatabase.from_uri(f"sqlite:///{db_path}", sample_rows_in_table_info=1)

    def raise_type_error(*args, **kwargs) -> str:
        raise TypeError("must be real number, not str")

    monkeypatch.setattr(db, "_get_sample_rows", raise_type_error)

    table_info = db.get_table_info()

    assert "CREATE TABLE" in table_info
    assert "flights" in table_info


def test_get_sample_rows_falls_back_to_driver_sql_on_type_error(tmp_path: Path, monkeypatch) -> None:
    db_path = tmp_path / "travel_sample.sqlite"
    engine = create_engine(f"sqlite:///{db_path}")

    with engine.begin() as conn:
        conn.exec_driver_sql("CREATE TABLE flights (price DECIMAL(10,2), airline TEXT)")
        conn.exec_driver_sql("INSERT INTO flights (price, airline) VALUES ('123.45', 'DataLine Air')")

    db = DatalineSQLDatabase.from_uri(f"sqlite:///{db_path}", sample_rows_in_table_info=1)
    table = next(tbl for tbl in db._metadata.sorted_tables if tbl.name == "flights")

    def raise_type_error(*args, **kwargs) -> str:
        raise TypeError("must be real number, not str")

    monkeypatch.setattr(SQLDatabase, "_get_sample_rows", raise_type_error)

    sample_rows = db._get_sample_rows(table)

    assert "1 rows from flights table" in sample_rows
    assert "price\tairline" in sample_rows
    assert "123.45\tDataLine Air" in sample_rows

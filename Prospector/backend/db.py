"""Motor de base de dados e sessão SQLAlchemy da aplicação de prospecção."""

from typing import Any, Optional

from sqlalchemy import JSON, create_engine, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from config import DATABASE_URL, DB_SCHEMA


class Base(DeclarativeBase):
    pass


#: Tipo JSON portátil: `jsonb` no Postgres/Supabase, `json` no SQLite.
JSONType = JSON().with_variant(JSONB(), "postgresql")


def is_sqlite() -> bool:
    return DATABASE_URL.startswith("sqlite")


def table_schema() -> Optional[str]:
    """Devolve o schema a usar nas tabelas (None em SQLite, que não os suporta)."""
    if is_sqlite():
        return None
    return DB_SCHEMA or None


def qualified(table_name: str) -> str:
    """Nome de tabela qualificado com o schema, para SQL literal."""
    schema = table_schema()
    return f"{schema}.{table_name}" if schema else table_name


def table_args(*args: Any) -> tuple:
    """Junta constraints/índices ao dicionário de schema exigido pelo SQLAlchemy."""
    schema = table_schema()
    if schema:
        return (*args, {"schema": schema})
    return args


engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if is_sqlite() else {},
)

SessionLocal = sessionmaker(
    bind=engine, autoflush=False, autocommit=False, expire_on_commit=False
)


def init_db() -> None:
    """Cria o schema e as tabelas caso ainda não existam."""
    import models  # noqa: F401  (regista os modelos no metadata)

    schema = table_schema()
    if schema:
        with engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema}"'))

    Base.metadata.create_all(bind=engine)

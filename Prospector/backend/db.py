"""Motor de base de dados e sessão SQLAlchemy da aplicação de prospecção."""

from typing import Any, Optional

from sqlalchemy import JSON, create_engine, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import NullPool

from config import AUTO_INIT_DB, DATABASE_URL, DB_SCHEMA, IS_SERVERLESS


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


def _connect_args() -> dict:
    """Argumentos de ligação por dialecto."""
    if is_sqlite():
        return {"check_same_thread": False}

    # Supabase liga-se através do pooler em modo transacção, que não suporta
    # prepared statements nomeados; e exige TLS.
    return {"prepare_threshold": None, "sslmode": "require"}


def _engine_options() -> dict:
    options: dict = {"pool_pre_ping": True, "connect_args": _connect_args()}
    if IS_SERVERLESS and not is_sqlite():
        # Numa função serverless cada invocação é isolada: manter um pool aberto
        # só esgota as ligações do Postgres.
        options["poolclass"] = NullPool
        options.pop("pool_pre_ping")
    return options


engine = create_engine(DATABASE_URL, **_engine_options())

SessionLocal = sessionmaker(
    bind=engine, autoflush=False, autocommit=False, expire_on_commit=False
)


def init_db(force: bool = False) -> None:
    """
    Cria o schema e as tabelas caso ainda não existam.

    Args:
        force: Executa mesmo com PROSPECTOR_AUTO_INIT_DB desligado.
    """
    import models  # noqa: F401  (regista os modelos no metadata)

    if not (AUTO_INIT_DB or force):
        return

    schema = table_schema()
    if schema:
        with engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema}"'))

    Base.metadata.create_all(bind=engine)

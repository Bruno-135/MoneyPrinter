import os
import sys
import tempfile
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "Prospector" / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Configuração tem de estar definida antes de importar os módulos da aplicação.
_DB_FILE = Path(tempfile.mkdtemp()) / "prospector-tests.db"
os.environ["PROSPECTOR_DATABASE_URL"] = f"sqlite:///{_DB_FILE}"
os.environ["PROSPECTOR_USERNAME"] = "tester"
os.environ["PROSPECTOR_PASSWORD"] = "password-de-teste"
os.environ["PROSPECTOR_OUTREACH_USE_LLM"] = "false"
os.environ["PROSPECTOR_ENRICHMENT_ENABLED"] = "false"
os.environ.pop("GOOGLE_PLACES_API_KEY", None)

import app as application  # noqa: E402
from auth import get_user_by_username  # noqa: E402
from db import Base, SessionLocal, engine  # noqa: E402


@pytest.fixture(autouse=True)
def clean_database():
    Base.metadata.drop_all(bind=engine)
    application.bootstrap()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def session():
    with SessionLocal() as db_session:
        yield db_session


@pytest.fixture
def user(session):
    return get_user_by_username(session, "tester")


@pytest.fixture
def client():
    return application.app.test_client()


@pytest.fixture
def auth_headers(client):
    response = client.post(
        "/api/auth/login",
        json={"username": "tester", "password": "password-de-teste"},
    )
    return {"Authorization": f"Bearer {response.get_json()['token']}"}

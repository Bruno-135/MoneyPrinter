"""O middleware que repõe o caminho original reescrito pelo Vercel."""

import sys
from pathlib import Path

API_DIR = Path(__file__).resolve().parents[1] / "api"
if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

from index import PATH_PARAM, RestoreOriginalPath  # noqa: E402


def call(query_string: str) -> dict:
    """Corre o middleware sobre um pedido e devolve o environ que a app recebeu."""
    seen: dict = {}

    def fake_app(environ, start_response):
        seen.update(environ)
        start_response("200 OK", [])
        return [b""]

    environ = {"PATH_INFO": "/api/index", "QUERY_STRING": query_string}
    RestoreOriginalPath(fake_app)(environ, lambda status, headers: None)
    return seen


def test_original_path_replaces_the_rewrite_destination():
    assert call(f"{PATH_PARAM}=/api/health")["PATH_INFO"] == "/api/health"


def test_root_path_is_restored():
    assert call(f"{PATH_PARAM}=/")["PATH_INFO"] == "/"


def test_original_query_string_survives():
    environ = call(f"{PATH_PARAM}=/api/leads&status=novo&weakOnly=1")

    assert environ["PATH_INFO"] == "/api/leads"
    assert "status=novo" in environ["QUERY_STRING"]
    assert "weakOnly=1" in environ["QUERY_STRING"]
    assert PATH_PARAM not in environ["QUERY_STRING"]


def test_request_without_the_parameter_is_left_alone():
    environ = call("status=novo")

    assert environ["PATH_INFO"] == "/api/index"
    assert environ["QUERY_STRING"] == "status=novo"

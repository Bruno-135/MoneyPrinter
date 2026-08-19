"""Ponto de entrada da aplicação no Vercel (função serverless WSGI)."""

import sys
from pathlib import Path
from urllib.parse import parse_qsl, urlencode

BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import app, bootstrap  # noqa: E402

#: Parâmetro onde o vercel.json guarda o caminho pedido pelo cliente.
PATH_PARAM = "__vercel_path"


class RestoreOriginalPath:
    """
    Repõe o caminho original do pedido.

    A reescrita do Vercel entrega à função o caminho de destino (`/api/index`)
    e não o que o cliente pediu, o que faria o Flask responder 404 a tudo. O
    `vercel.json` guarda o caminho original num parâmetro e este middleware
    volta a colocá-lo no `PATH_INFO` antes de a aplicação encaminhar o pedido.
    """

    def __init__(self, wsgi_app):
        self.wsgi_app = wsgi_app

    def __call__(self, environ, start_response):
        parameters = parse_qsl(environ.get("QUERY_STRING", ""), keep_blank_values=True)

        original_path = None
        remaining = []
        for key, value in parameters:
            if key == PATH_PARAM and original_path is None:
                original_path = value
            else:
                remaining.append((key, value))

        if original_path:
            if not original_path.startswith("/"):
                original_path = f"/{original_path}"
            environ["PATH_INFO"] = original_path
            environ["QUERY_STRING"] = urlencode(remaining)

        return self.wsgi_app(environ, start_response)


app.wsgi_app = RestoreOriginalPath(app.wsgi_app)

# Corre uma vez por instância fria: garante o esquema (se PROSPECTOR_AUTO_INIT_DB
# estiver ligado) e o utilizador definido nas variáveis de ambiente.
bootstrap(strict=False)

# O runtime do Vercel serve este objecto WSGI.
application = app

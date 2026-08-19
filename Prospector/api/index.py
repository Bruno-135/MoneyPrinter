"""Ponto de entrada da aplicação no Vercel (função serverless WSGI)."""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import app, bootstrap  # noqa: E402

# Corre uma vez por instância fria: garante o esquema (se PROSPECTOR_AUTO_INIT_DB
# estiver ligado) e o utilizador definido nas variáveis de ambiente.
bootstrap(strict=False)

# O runtime do Vercel serve este objecto WSGI.
application = app

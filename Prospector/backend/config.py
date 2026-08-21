"""Configuração central da aplicação de prospecção comercial."""

import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
APP_ROOT = BASE_DIR.parent
PROJECT_ROOT = APP_ROOT.parent
FRONTEND_DIR = APP_ROOT / "frontend"
ENV_FILE = PROJECT_ROOT / ".env"

load_dotenv(ENV_FILE)


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def _env_bool(name: str, default: bool = False) -> bool:
    raw = _env(name).lower()
    if not raw:
        return default
    return raw in ("1", "true", "yes", "on", "sim")


def _env_int(name: str, default: int) -> int:
    try:
        return int(_env(name) or default)
    except ValueError:
        return default


# --- Servidor -------------------------------------------------------------
HOST = _env("PROSPECTOR_HOST", "0.0.0.0")
PORT = _env_int("PROSPECTOR_PORT", 8090)

# --- Base de dados (Supabase/Postgres) ------------------------------------
DATABASE_URL = _env("PROSPECTOR_DATABASE_URL") or "sqlite:///prospector.db"
DB_SCHEMA = _env("PROSPECTOR_DB_SCHEMA", "prospeccao")
#: Criar o schema e as tabelas no arranque. Desligue em produção depois de
#: aplicar Prospector/migrations/001_initial.sql, para poupar viagens à base.
AUTO_INIT_DB = _env_bool("PROSPECTOR_AUTO_INIT_DB", True)
#: True quando a aplicação corre como função serverless (Vercel).
IS_SERVERLESS = bool(_env("VERCEL") or _env("PROSPECTOR_SERVERLESS"))

# --- Autenticação ---------------------------------------------------------
BOOTSTRAP_USERNAME = _env("PROSPECTOR_USERNAME")
BOOTSTRAP_PASSWORD = _env("PROSPECTOR_PASSWORD")
SESSION_TTL_HOURS = _env_int("PROSPECTOR_SESSION_TTL_HOURS", 720)
LOGIN_MAX_ATTEMPTS = _env_int("PROSPECTOR_LOGIN_MAX_ATTEMPTS", 8)
LOGIN_ATTEMPT_WINDOW_SECONDS = _env_int("PROSPECTOR_LOGIN_WINDOW_SECONDS", 300)

# --- Google Places --------------------------------------------------------
GOOGLE_PLACES_API_KEY = _env("GOOGLE_PLACES_API_KEY")
GOOGLE_PLACES_ENDPOINT = "https://places.googleapis.com/v1/places:searchText"
PLACES_LANGUAGE = _env("PROSPECTOR_PLACES_LANGUAGE", "pt-PT")
PLACES_REGION = _env("PROSPECTOR_PLACES_REGION", "PT")
#: 20 resultados = 1 chamada à API. O escalão que a aplicação usa dá 1.000
#: chamadas gratuitas por mês, por isso o valor por omissão é conservador.
PLACES_MAX_RESULTS = _env_int("PROSPECTOR_PLACES_MAX_RESULTS", 20)
PLACES_TIMEOUT = _env_int("PROSPECTOR_PLACES_TIMEOUT", 30)

# --- Descoberta de email no site do próprio negócio -----------------------
EMAIL_DISCOVERY_TIMEOUT = _env_int("PROSPECTOR_EMAIL_TIMEOUT", 8)
EMAIL_DISCOVERY_MAX_PAGES = _env_int("PROSPECTOR_EMAIL_MAX_PAGES", 3)
EMAIL_DISCOVERY_USER_AGENT = _env(
    "PROSPECTOR_USER_AGENT",
    "ProspectorBot/1.0 (+contacto pelo site; recolha de email de contacto publico)",
)

# --- Camada de enriquecimento (registo comercial PT) ----------------------
# Desativada por omissão. Ver Prospector/backend/enrichment.py.
ENRICHMENT_ENABLED = _env_bool("PROSPECTOR_ENRICHMENT_ENABLED", False)
ENRICHMENT_PROVIDER = _env("PROSPECTOR_ENRICHMENT_PROVIDER", "pt_registo_comercial")

# --- Geração de mensagens -------------------------------------------------
OLLAMA_BASE_URL = _env("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = _env("PROSPECTOR_OLLAMA_MODEL") or _env("OLLAMA_MODEL", "llama3.1:8b")
OLLAMA_TIMEOUT = _env_int("PROSPECTOR_OLLAMA_TIMEOUT", 45)
#: Desligado por omissão: sem Ollama acessível a chamada só atrasa o pedido.
#: Ligue-o localmente com PROSPECTOR_OUTREACH_USE_LLM=true.
OUTREACH_USE_LLM = _env_bool("PROSPECTOR_OUTREACH_USE_LLM", False)
#: Nome com que as mensagens de abordagem são assinadas.
SENDER_NAME = _env("PROSPECTOR_SENDER_NAME", "Bruno")

# --- Regras de negócio ----------------------------------------------------
LEAD_STATUSES = ("novo", "contactado", "em_conversa", "fechado", "descartado")
LEAD_STATUS_LABELS = {
    "novo": "Novo",
    "contactado": "Contactado",
    "em_conversa": "Em conversa",
    "fechado": "Fechado",
    "descartado": "Descartado",
}
ENTITY_TYPES = ("pj", "pf", "desconhecido")
ENTITY_FILTERS = ("pj", "pf", "ambos")
OUTREACH_CHANNELS = ("email", "whatsapp")

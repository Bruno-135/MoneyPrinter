"""Proveniência dos dados: cada campo de um lead carrega a sua própria fonte."""

from datetime import datetime, timezone
from typing import Optional

GOOGLE_PLACES = "google_places"
BUSINESS_WEBSITE = "site_do_negocio"
MANUAL = "manual"
DERIVED = "derivado"
PT_REGISTRY = "registo_comercial_pt"

SOURCE_LABELS = {
    GOOGLE_PLACES: "Google Maps",
    BUSINESS_WEBSITE: "Site do próprio negócio",
    MANUAL: "Introduzido manualmente",
    DERIVED: "Calculado pela aplicação",
    PT_REGISTRY: "Registo Comercial (PT)",
}

#: Campos que nunca vêm de uma fonte externa — são sempre do utilizador.
USER_OWNED_FIELDS = ("status", "notes", "last_contact_at")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def source_label(source: str) -> str:
    return SOURCE_LABELS.get(source, source)


def stamp(source: str, detail: Optional[str] = None) -> dict:
    """Cria a etiqueta de proveniência de um campo."""
    return {
        "source": source,
        "label": source_label(source),
        "detail": detail or "",
        "collected_at": utcnow().isoformat(),
    }


def merge_sources(existing: Optional[dict], new_entries: dict) -> dict:
    """Junta etiquetas novas às já existentes, sem perder as anteriores."""
    merged = dict(existing or {})
    merged.update({key: value for key, value in new_entries.items() if value})
    return merged

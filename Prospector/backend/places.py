"""Cliente da Google Places API (Text Search v1) — fonte de dados principal."""

import re
from dataclasses import dataclass, field
from typing import Optional

import requests

from config import (
    GOOGLE_PLACES_API_KEY,
    GOOGLE_PLACES_ENDPOINT,
    PLACES_LANGUAGE,
    PLACES_MAX_RESULTS,
    PLACES_REGION,
    PLACES_TIMEOUT,
)
from scoring import strip_accents

PAGE_SIZE = 20

FIELD_MASK = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.nationalPhoneNumber",
        "places.internationalPhoneNumber",
        "places.websiteUri",
        "places.rating",
        "places.userRatingCount",
        "places.businessStatus",
        "places.googleMapsUri",
        "places.primaryType",
        "places.types",
        "places.location",
        "nextPageToken",
    ]
)


class PlacesError(RuntimeError):
    """Erro ao contactar a Google Places API."""


@dataclass
class PlaceResult:
    """Resultado normalizado de um estabelecimento devolvido pelo Places."""

    place_id: str
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    rating: Optional[float] = None
    reviews_count: Optional[int] = None
    business_status: Optional[str] = None
    google_maps_url: Optional[str] = None
    primary_type: Optional[str] = None
    types: list = field(default_factory=list)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    #: Campo -> nome do atributo original na API, para etiquetar a proveniência.
    field_details: dict = field(default_factory=dict)


def is_configured() -> bool:
    return bool(GOOGLE_PLACES_API_KEY)


def build_text_query(segment: str, region: str) -> str:
    segment = (segment or "").strip()
    region = (region or "").strip()
    if segment and region:
        return f"{segment} em {region}"
    return segment or region


def dedup_key(name: str, address: Optional[str], place_id: Optional[str] = None) -> str:
    """
    Chave estável de deduplicação.

    Usa o identificador do Google quando existe; caso contrário, normaliza o
    nome e a morada (sem acentos, sem pontuação, em minúsculas).
    """
    if place_id:
        return f"google:{place_id}"

    parts = [strip_accents(name or ""), strip_accents(address or "")]
    joined = " ".join(parts).lower()
    normalised = re.sub(r"[^a-z0-9]+", " ", joined).strip()
    slug = re.sub(r"\s+", "-", normalised)
    return f"nome:{slug}"


def _parse_place(raw: dict) -> PlaceResult:
    display_name = (raw.get("displayName") or {}).get("text") or ""
    location = raw.get("location") or {}

    phone = raw.get("nationalPhoneNumber") or raw.get("internationalPhoneNumber")
    phone_detail = (
        "nationalPhoneNumber" if raw.get("nationalPhoneNumber") else "internationalPhoneNumber"
    )

    result = PlaceResult(
        place_id=raw.get("id") or "",
        name=display_name,
        address=raw.get("formattedAddress"),
        phone=phone,
        website=raw.get("websiteUri"),
        rating=raw.get("rating"),
        reviews_count=raw.get("userRatingCount"),
        business_status=raw.get("businessStatus"),
        google_maps_url=raw.get("googleMapsUri"),
        primary_type=raw.get("primaryType"),
        types=list(raw.get("types") or []),
        latitude=location.get("latitude"),
        longitude=location.get("longitude"),
    )

    details = {
        "name": "displayName.text",
        "address": "formattedAddress",
        "google_maps_url": "googleMapsUri",
        "business_status": "businessStatus",
    }
    if phone:
        details["phone"] = phone_detail
    if result.website:
        details["website"] = "websiteUri"
    if result.rating is not None:
        details["rating"] = "rating"
    if result.reviews_count is not None:
        details["reviews_count"] = "userRatingCount"

    result.field_details = details
    return result


def search_places(
    segment: str,
    region: str,
    max_results: int = PLACES_MAX_RESULTS,
    api_key: Optional[str] = None,
) -> list[PlaceResult]:
    """
    Procura estabelecimentos no Google Places pelo segmento e região indicados.

    Args:
        segment: Segmento de negócio (ex.: "restaurantes").
        region: Região a pesquisar (ex.: "Vila Nova de Gaia").
        max_results: Limite total de resultados a recolher (paginado de 20 em 20).
        api_key: Chave alternativa; por omissão usa GOOGLE_PLACES_API_KEY.

    Returns:
        Lista de resultados normalizados.

    Raises:
        PlacesError: Se a chave não estiver configurada ou a API devolver erro.
    """
    key = api_key or GOOGLE_PLACES_API_KEY
    if not key:
        raise PlacesError(
            "GOOGLE_PLACES_API_KEY não está configurada. Defina-a no ficheiro .env."
        )

    text_query = build_text_query(segment, region)
    if not text_query:
        raise PlacesError("Indique pelo menos o segmento ou a região.")

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": FIELD_MASK,
    }

    results: list[PlaceResult] = []
    seen_ids: set[str] = set()
    page_token: Optional[str] = None

    while len(results) < max_results:
        payload = {
            "textQuery": text_query,
            "languageCode": PLACES_LANGUAGE,
            "regionCode": PLACES_REGION,
            "pageSize": min(PAGE_SIZE, max_results - len(results)),
        }
        if page_token:
            payload["pageToken"] = page_token

        try:
            response = requests.post(
                GOOGLE_PLACES_ENDPOINT,
                json=payload,
                headers=headers,
                timeout=PLACES_TIMEOUT,
            )
        except requests.RequestException as err:
            raise PlacesError(f"Falha de rede ao contactar o Google Places: {err}") from err

        if response.status_code != 200:
            message = _error_message(response)
            raise PlacesError(f"Google Places devolveu {response.status_code}: {message}")

        body = response.json() or {}
        for raw_place in body.get("places") or []:
            place = _parse_place(raw_place)
            if place.place_id and place.place_id in seen_ids:
                continue
            if place.place_id:
                seen_ids.add(place.place_id)
            results.append(place)

        page_token = body.get("nextPageToken")
        if not page_token:
            break

    return results[:max_results]


def _error_message(response: requests.Response) -> str:
    try:
        body = response.json() or {}
        return (body.get("error") or {}).get("message") or response.text[:200]
    except ValueError:
        return response.text[:200]

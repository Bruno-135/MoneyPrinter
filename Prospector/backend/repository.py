"""Acesso a dados: leads, deduplicação, painel e rascunhos de abordagem."""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from config import LEAD_STATUSES
from models import Lead, OutreachDraft, SearchRun
from places import PlaceResult, dedup_key
from scoring import classify_entity_type, is_weak_presence, score_digital_presence
from sources import (
    BUSINESS_WEBSITE,
    DERIVED,
    GOOGLE_PLACES,
    MANUAL,
    merge_sources,
    stamp,
    utcnow,
)


def serialize_lead(lead: Lead) -> dict:
    """Converte um lead para o formato devolvido pela API."""
    return {
        "id": lead.id,
        "googlePlaceId": lead.google_place_id,
        "name": lead.name,
        "entityType": lead.entity_type,
        "entityTypeConfidence": lead.entity_type_confidence,
        "phone": lead.phone,
        "email": lead.email,
        "website": lead.website,
        "address": lead.address,
        "latitude": lead.latitude,
        "longitude": lead.longitude,
        "googleMapsUrl": lead.google_maps_url,
        "rating": lead.rating,
        "reviewsCount": lead.reviews_count,
        "businessStatus": lead.business_status,
        "primaryType": lead.primary_type,
        "placeTypes": lead.place_types or [],
        "segmentQuery": lead.segment_query,
        "regionQuery": lead.region_query,
        "digitalPresenceScore": lead.digital_presence_score,
        "digitalPresenceFlags": lead.digital_presence_flags or [],
        "weakDigitalPresence": bool(lead.weak_digital_presence),
        "fieldSources": lead.field_sources or {},
        "status": lead.status,
        "notes": lead.notes,
        "lastContactAt": lead.last_contact_at.isoformat() if lead.last_contact_at else None,
        "enrichmentStatus": lead.enrichment_status,
        "enrichmentData": lead.enrichment_data,
        "enrichedAt": lead.enriched_at.isoformat() if lead.enriched_at else None,
        "createdAt": lead.created_at.isoformat() if lead.created_at else None,
        "updatedAt": lead.updated_at.isoformat() if lead.updated_at else None,
    }


def _source_of(lead: Lead, field_name: str) -> str:
    entry = (lead.field_sources or {}).get(field_name) or {}
    return entry.get("source", "")


def _recompute_presence(lead: Lead) -> None:
    score, flags = score_digital_presence(
        website=lead.website,
        reviews_count=lead.reviews_count,
        rating=lead.rating,
        phone=lead.phone,
        address=lead.address,
    )
    lead.digital_presence_score = score
    lead.digital_presence_flags = flags
    lead.weak_digital_presence = is_weak_presence(score)
    lead.field_sources = merge_sources(
        lead.field_sources,
        {
            "digital_presence_score": stamp(
                DERIVED, "calculado a partir dos dados do Google Maps"
            )
        },
    )


def upsert_lead_from_place(
    session: Session,
    owner_id: str,
    place: PlaceResult,
    segment: str,
    region: str,
    email: Optional[str] = None,
) -> tuple[Lead, bool]:
    """
    Insere ou actualiza um lead a partir de um resultado do Google Places.

    A deduplicação usa o identificador do Google e, na sua falta, o par
    nome+morada normalizado. Campos geridos pelo utilizador (estado, notas,
    data do último contacto) e campos preenchidos à mão nunca são sobrepostos.

    Returns:
        (lead, criado) — `criado` é False quando o lead já existia.
    """
    key = dedup_key(place.name, place.address, place.place_id or None)
    stmt = select(Lead).where(Lead.owner_id == owner_id, Lead.dedup_key == key)
    lead = session.scalars(stmt).first()
    created = lead is None

    if lead is None:
        lead = Lead(
            id=str(uuid4()),
            owner_id=owner_id,
            dedup_key=key,
            name=place.name,
            status="novo",
            field_sources={},
        )
        session.add(lead)

    new_sources: dict = {}

    def apply(field_name: str, value, detail: str, source: str = GOOGLE_PLACES) -> None:
        """Escreve um campo e etiqueta-o com a fonte, respeitando edições manuais."""
        if _source_of(lead, field_name) == MANUAL:
            return
        if value in (None, ""):
            return
        setattr(lead, field_name, value)
        new_sources[field_name] = stamp(source, detail)

    details = place.field_details
    lead.google_place_id = place.place_id or lead.google_place_id
    apply("name", place.name, details.get("name", "displayName"))
    apply("address", place.address, details.get("address", "formattedAddress"))
    apply("phone", place.phone, details.get("phone", "nationalPhoneNumber"))
    apply("website", place.website, details.get("website", "websiteUri"))
    apply("rating", place.rating, details.get("rating", "rating"))
    apply("reviews_count", place.reviews_count, details.get("reviews_count", "userRatingCount"))
    apply("business_status", place.business_status, details.get("business_status", "businessStatus"))
    apply("google_maps_url", place.google_maps_url, details.get("google_maps_url", "googleMapsUri"))
    apply("primary_type", place.primary_type, "primaryType")
    apply("place_types", place.types, "types")
    apply("latitude", place.latitude, "location.latitude")
    apply("longitude", place.longitude, "location.longitude")

    if email:
        apply("email", email, "email publicado no site oficial", BUSINESS_WEBSITE)

    entity_type, confidence = classify_entity_type(place.name, place.types)
    lead.entity_type = entity_type
    lead.entity_type_confidence = confidence
    new_sources["entity_type"] = stamp(
        DERIVED, "heurística sobre o nome e os tipos do Google Maps"
    )

    lead.segment_query = segment or lead.segment_query
    lead.region_query = region or lead.region_query
    lead.field_sources = merge_sources(lead.field_sources, new_sources)
    _recompute_presence(lead)
    lead.updated_at = utcnow()

    session.flush()
    return lead, created


def list_leads(
    session: Session,
    owner_id: str,
    status: Optional[str] = None,
    entity_filter: str = "ambos",
    weak_only: bool = False,
    query: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
) -> list[Lead]:
    """Lista os leads do utilizador aplicando os filtros pedidos."""
    stmt = select(Lead).where(Lead.owner_id == owner_id)

    if status:
        stmt = stmt.where(Lead.status == status)

    if entity_filter in ("pj", "pf"):
        stmt = stmt.where(Lead.entity_type == entity_filter)

    if weak_only:
        stmt = stmt.where(Lead.weak_digital_presence.is_(True))

    if query:
        pattern = f"%{query.strip()}%"
        stmt = stmt.where(
            or_(
                Lead.name.ilike(pattern),
                Lead.address.ilike(pattern),
                Lead.segment_query.ilike(pattern),
                Lead.region_query.ilike(pattern),
            )
        )

    stmt = (
        stmt.order_by(
            Lead.weak_digital_presence.desc(),
            Lead.digital_presence_score.desc(),
            Lead.created_at.desc(),
        )
        .limit(limit)
        .offset(offset)
    )
    return list(session.scalars(stmt).all())


def get_lead(session: Session, owner_id: str, lead_id: str) -> Optional[Lead]:
    stmt = select(Lead).where(Lead.owner_id == owner_id, Lead.id == lead_id)
    return session.scalars(stmt).first()


def update_lead(session: Session, lead: Lead, changes: dict) -> Lead:
    """
    Aplica alterações manuais a um lead.

    Campos de contacto editados à mão passam a ter a fonte "manual" e deixam de
    ser sobrepostos por pesquisas futuras.
    """
    manual_fields = ("name", "phone", "email", "website", "address", "entity_type")
    new_sources: dict = {}

    for field_name in manual_fields:
        if field_name in changes:
            setattr(lead, field_name, changes[field_name] or None)
            new_sources[field_name] = stamp(MANUAL, "editado na aplicação")
            if field_name == "entity_type":
                lead.entity_type_confidence = "alta"

    if "status" in changes:
        lead.status = changes["status"]

    if "notes" in changes:
        lead.notes = changes["notes"] or None

    if "last_contact_at" in changes:
        lead.last_contact_at = changes["last_contact_at"]

    if new_sources:
        lead.field_sources = merge_sources(lead.field_sources, new_sources)

    _recompute_presence(lead)
    lead.updated_at = utcnow()
    session.commit()
    session.refresh(lead)
    return lead


def delete_lead(session: Session, lead: Lead) -> None:
    session.delete(lead)
    session.commit()


def status_counts(session: Session, owner_id: str) -> dict:
    """Contagem de leads por estado, com todos os estados sempre presentes."""
    stmt = (
        select(Lead.status, func.count(Lead.id))
        .where(Lead.owner_id == owner_id)
        .group_by(Lead.status)
    )
    counts = {status: 0 for status in LEAD_STATUSES}
    for status, total in session.execute(stmt).all():
        counts[status] = int(total)
    return counts


def dashboard_summary(session: Session, owner_id: str) -> dict:
    counts = status_counts(session, owner_id)

    total = session.scalar(
        select(func.count(Lead.id)).where(Lead.owner_id == owner_id)
    ) or 0
    weak = session.scalar(
        select(func.count(Lead.id)).where(
            Lead.owner_id == owner_id, Lead.weak_digital_presence.is_(True)
        )
    ) or 0
    without_website = session.scalar(
        select(func.count(Lead.id)).where(
            Lead.owner_id == owner_id, or_(Lead.website.is_(None), Lead.website == "")
        )
    ) or 0

    return {
        "total": int(total),
        "weakDigitalPresence": int(weak),
        "withoutWebsite": int(without_website),
        "byStatus": counts,
    }


def record_search_run(
    session: Session,
    owner_id: str,
    segment: str,
    region: str,
    entity_filter: str,
    weak_only: bool,
    results_found: int,
    results_new: int,
) -> SearchRun:
    run = SearchRun(
        id=str(uuid4()),
        owner_id=owner_id,
        segment=segment,
        region=region,
        entity_filter=entity_filter,
        weak_only=weak_only,
        results_found=results_found,
        results_new=results_new,
    )
    session.add(run)
    session.commit()
    return run


def save_outreach_draft(
    session: Session,
    owner_id: str,
    lead_id: str,
    channel: str,
    offer: str,
    variations: list,
    generator: str,
) -> OutreachDraft:
    draft = OutreachDraft(
        id=str(uuid4()),
        owner_id=owner_id,
        lead_id=lead_id,
        channel=channel,
        offer=offer,
        variations=variations,
        generator=generator,
    )
    session.add(draft)
    session.commit()
    session.refresh(draft)
    return draft


def parse_datetime(value: Optional[str]) -> Optional[datetime]:
    """Converte uma data ISO (ou 'YYYY-MM-DD') vinda do frontend."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None

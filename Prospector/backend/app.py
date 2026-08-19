"""API da aplicação de prospecção comercial."""

import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Optional

from flask import Flask, g, jsonify, request, send_from_directory
from flask_cors import CORS

import enrichment
import places
from auth import (
    authenticate,
    clear_failed_logins,
    ensure_bootstrap_user,
    extract_token,
    issue_token,
    login_required,
    login_throttled,
    register_failed_login,
    revoke_token,
)
from config import (
    BOOTSTRAP_PASSWORD,
    BOOTSTRAP_USERNAME,
    ENTITY_FILTERS,
    FRONTEND_DIR,
    HOST,
    LEAD_STATUS_LABELS,
    LEAD_STATUSES,
    OUTREACH_CHANNELS,
    PLACES_MAX_RESULTS,
    PORT,
)
from db import SessionLocal, engine, init_db
from messaging import generate_outreach
from repository import (
    dashboard_summary,
    delete_lead,
    get_lead,
    list_leads,
    parse_datetime,
    record_search_run,
    save_outreach_draft,
    serialize_lead,
    update_lead,
    upsert_lead_from_place,
)
from scoring import WEAK_PRESENCE_THRESHOLD, classify_entity_type, is_weak_presence, score_digital_presence
from sources import utcnow
from website_email import find_email

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("prospector")

#: Limites da recolha de email no site do próprio negócio.
EMAIL_LOOKUP_MAX_LEADS = 25
EMAIL_LOOKUP_WORKERS = 6

app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="/static")
CORS(app)


def ok(**payload):
    return jsonify({"status": "success", **payload})


def fail(message: str, code: int = 400):
    return jsonify({"status": "error", "message": message}), code


# --- Frontend -------------------------------------------------------------


@app.route("/", methods=["GET"])
def index():
    return send_from_directory(str(FRONTEND_DIR), "index.html")


@app.route("/<path:filename>", methods=["GET"])
def frontend_asset(filename: str):
    return send_from_directory(str(FRONTEND_DIR), filename)


# --- Configuração pública -------------------------------------------------


@app.route("/api/health", methods=["GET"])
def health():
    """Diagnóstico: diz se a base de dados responde e o que falta configurar."""
    from sqlalchemy import text

    database_ok, database_error = True, None
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as err:
        database_ok, database_error = False, str(err)[:300]

    payload = {
        "database": {"reachable": database_ok, "error": database_error},
        "placesConfigured": places.is_configured(),
        "userConfigured": bool(BOOTSTRAP_USERNAME and BOOTSTRAP_PASSWORD),
        "enrichmentEnabled": enrichment.is_enabled(),
    }
    return (ok(health=payload), 200) if database_ok else (
        jsonify({"status": "error", "message": "Base de dados inacessível.", "health": payload}),
        503,
    )


@app.route("/api/config", methods=["GET"])
def public_config():
    return ok(
        config={
            "placesConfigured": places.is_configured(),
            "enrichmentEnabled": enrichment.is_enabled(),
            "enrichmentProvider": enrichment.provider_name(),
            "statuses": [
                {"value": value, "label": LEAD_STATUS_LABELS[value]}
                for value in LEAD_STATUSES
            ],
            "channels": list(OUTREACH_CHANNELS),
            "entityFilters": list(ENTITY_FILTERS),
            "weakPresenceThreshold": WEAK_PRESENCE_THRESHOLD,
            "maxResults": PLACES_MAX_RESULTS,
        }
    )


# --- Autenticação ---------------------------------------------------------


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    client_ip = request.remote_addr or "desconhecido"

    if not username or not password:
        return fail("Indique o utilizador e a password.")

    if login_throttled(client_ip):
        return fail("Demasiadas tentativas falhadas. Tente novamente daqui a pouco.", 429)

    with SessionLocal() as session:
        user = authenticate(session, username, password)
        if not user:
            register_failed_login(client_ip)
            return fail("Credenciais inválidas.", 401)

        token, auth_session = issue_token(session, user)
        clear_failed_logins(client_ip)
        return ok(
            token=token,
            expiresAt=auth_session.expires_at.isoformat(),
            user={"id": user.id, "username": user.username},
        )


@app.route("/api/auth/logout", methods=["POST"])
@login_required
def logout():
    with SessionLocal() as session:
        revoke_token(session, extract_token())
    return ok(message="Sessão terminada.")


@app.route("/api/auth/me", methods=["GET"])
@login_required
def me():
    return ok(user={"id": g.current_user_id, "username": g.current_username})


# --- Pesquisa de contactos ------------------------------------------------


def _lookup_emails(results: list) -> dict:
    """Procura emails nos sites oficiais, em paralelo e com limite de leads."""
    targets = [place for place in results if place.website][:EMAIL_LOOKUP_MAX_LEADS]
    if not targets:
        return {}

    with ThreadPoolExecutor(max_workers=EMAIL_LOOKUP_WORKERS) as pool:
        found = list(pool.map(lambda place: find_email(place.website), targets))

    return {
        place.place_id: email
        for place, email in zip(targets, found)
        if email
    }


@app.route("/api/search", methods=["POST"])
@login_required
def search():
    data = request.get_json(silent=True) or {}
    segment = (data.get("segment") or "").strip()
    region = (data.get("region") or "").strip()
    entity_filter = (data.get("entityFilter") or "ambos").strip()
    weak_only = bool(data.get("weakOnly"))
    find_emails = bool(data.get("findEmails"))
    max_results = min(int(data.get("maxResults") or PLACES_MAX_RESULTS), 120)

    if not segment:
        return fail("Indique o segmento a pesquisar.")
    if not region:
        return fail("Indique a região a pesquisar.")
    if entity_filter not in ENTITY_FILTERS:
        return fail(f"Filtro inválido: {entity_filter}.")

    try:
        results = places.search_places(segment, region, max_results=max_results)
    except places.PlacesError as err:
        return fail(str(err), 502)

    # Filtros aplicados antes de gravar: só entram na base os alvos pretendidos.
    selected = []
    for place in results:
        entity_type, _ = classify_entity_type(place.name, place.types)
        if entity_filter in ("pj", "pf") and entity_type != entity_filter:
            continue

        score, _ = score_digital_presence(
            website=place.website,
            reviews_count=place.reviews_count,
            rating=place.rating,
            phone=place.phone,
            address=place.address,
        )
        if weak_only and not is_weak_presence(score):
            continue

        selected.append(place)

    emails = _lookup_emails(selected) if find_emails else {}

    saved, new_count = [], 0
    with SessionLocal() as session:
        for place in selected:
            lead, created = upsert_lead_from_place(
                session,
                owner_id=g.current_user_id,
                place=place,
                segment=segment,
                region=region,
                email=emails.get(place.place_id),
            )
            new_count += 1 if created else 0
            saved.append(lead)

        session.commit()
        payload = [serialize_lead(lead) for lead in saved]

        record_search_run(
            session,
            owner_id=g.current_user_id,
            segment=segment,
            region=region,
            entity_filter=entity_filter,
            weak_only=weak_only,
            results_found=len(results),
            results_new=new_count,
        )

    payload.sort(key=lambda item: item["digitalPresenceScore"], reverse=True)

    return ok(
        leads=payload,
        summary={
            "found": len(results),
            "matched": len(selected),
            "new": new_count,
            "existing": len(selected) - new_count,
            "emailsFound": len(emails),
        },
    )


# --- Gestão de leads ------------------------------------------------------


@app.route("/api/leads", methods=["GET"])
@login_required
def get_leads():
    status = request.args.get("status") or None
    entity_filter = request.args.get("entityFilter") or "ambos"
    weak_only = request.args.get("weakOnly") in ("1", "true", "True")
    query = request.args.get("q") or None
    limit = min(request.args.get("limit", default=200, type=int), 500)
    offset = request.args.get("offset", default=0, type=int)

    if status and status not in LEAD_STATUSES:
        return fail(f"Estado inválido: {status}.")

    with SessionLocal() as session:
        leads = list_leads(
            session,
            owner_id=g.current_user_id,
            status=status,
            entity_filter=entity_filter,
            weak_only=weak_only,
            query=query,
            limit=limit,
            offset=offset,
        )
        return ok(leads=[serialize_lead(lead) for lead in leads])


@app.route("/api/leads/<lead_id>", methods=["GET"])
@login_required
def get_single_lead(lead_id: str):
    with SessionLocal() as session:
        lead = get_lead(session, g.current_user_id, lead_id)
        if not lead:
            return fail("Lead não encontrado.", 404)
        return ok(lead=serialize_lead(lead))


@app.route("/api/leads/<lead_id>", methods=["PATCH"])
@login_required
def patch_lead(lead_id: str):
    data = request.get_json(silent=True) or {}
    changes: dict = {}

    if "status" in data:
        if data["status"] not in LEAD_STATUSES:
            return fail(f"Estado inválido: {data['status']}.")
        changes["status"] = data["status"]

    if "notes" in data:
        changes["notes"] = data["notes"]

    if "lastContactAt" in data:
        value: Optional[str] = data["lastContactAt"]
        if value:
            parsed = parse_datetime(value)
            if not parsed:
                return fail("Data do último contacto inválida.")
            changes["last_contact_at"] = parsed
        else:
            changes["last_contact_at"] = None

    for api_field, model_field in (
        ("name", "name"),
        ("phone", "phone"),
        ("email", "email"),
        ("website", "website"),
        ("address", "address"),
        ("entityType", "entity_type"),
    ):
        if api_field in data:
            changes[model_field] = (data[api_field] or "").strip() or None

    if "entity_type" in changes and changes["entity_type"] not in ("pj", "pf", "desconhecido"):
        return fail("Tipo de entidade inválido.")

    if not changes:
        return fail("Nada para actualizar.")

    with SessionLocal() as session:
        lead = get_lead(session, g.current_user_id, lead_id)
        if not lead:
            return fail("Lead não encontrado.", 404)
        lead = update_lead(session, lead, changes)
        return ok(lead=serialize_lead(lead))


@app.route("/api/leads/<lead_id>", methods=["DELETE"])
@login_required
def remove_lead(lead_id: str):
    with SessionLocal() as session:
        lead = get_lead(session, g.current_user_id, lead_id)
        if not lead:
            return fail("Lead não encontrado.", 404)
        delete_lead(session, lead)
    return ok(message="Lead removido.")


@app.route("/api/dashboard", methods=["GET"])
@login_required
def dashboard():
    with SessionLocal() as session:
        return ok(summary=dashboard_summary(session, g.current_user_id))


# --- Geração de abordagem -------------------------------------------------


@app.route("/api/leads/<lead_id>/outreach", methods=["POST"])
@login_required
def outreach(lead_id: str):
    data = request.get_json(silent=True) or {}
    channel = (data.get("channel") or "").strip().lower()
    offer = (data.get("offer") or "").strip()

    with SessionLocal() as session:
        lead = get_lead(session, g.current_user_id, lead_id)
        if not lead:
            return fail("Lead não encontrado.", 404)

        lead_payload = {
            "name": lead.name,
            "entity_type": lead.entity_type,
            "segment_query": lead.segment_query,
            "region_query": lead.region_query,
            "website": lead.website,
            "rating": lead.rating,
            "reviews_count": lead.reviews_count,
            "digital_presence_flags": lead.digital_presence_flags or [],
        }

        try:
            variations, generator = generate_outreach(lead_payload, channel, offer)
        except ValueError as err:
            return fail(str(err))

        save_outreach_draft(
            session,
            owner_id=g.current_user_id,
            lead_id=lead.id,
            channel=channel,
            offer=offer,
            variations=variations,
            generator=generator,
        )

    return ok(
        variations=variations,
        generator=generator,
        notice="As mensagens são apenas para copiar. O envio é sempre manual.",
    )


# --- Enriquecimento (desativado) ------------------------------------------


@app.route("/api/leads/<lead_id>/enrich", methods=["POST"])
@login_required
def enrich(lead_id: str):
    with SessionLocal() as session:
        lead = get_lead(session, g.current_user_id, lead_id)
        if not lead:
            return fail("Lead não encontrado.", 404)

        result = enrichment.enrich_lead(lead.name, lead.address)

        if not result.applied:
            lead.enrichment_status = result.status
            session.commit()
            code = 503 if result.status == enrichment.STATUS_DISABLED else 501
            return jsonify(
                {
                    "status": "error",
                    "message": result.message,
                    "enrichmentStatus": result.status,
                }
            ), code

        lead.enrichment_status = result.status
        lead.enrichment_data = result.data
        lead.enriched_at = utcnow()
        if result.field_sources:
            lead.field_sources = {**(lead.field_sources or {}), **result.field_sources}
        session.commit()
        session.refresh(lead)
        return ok(lead=serialize_lead(lead), message=result.message)


def bootstrap(strict: bool = True) -> None:
    """
    Prepara a base de dados e o utilizador inicial definido nas variáveis de ambiente.

    Args:
        strict: Se False, um erro de ligação é registado em vez de levantado —
            usado no arranque serverless, onde uma excepção derrubaria a função
            inteira e esconderia a causa. O endpoint /api/health mostra o estado.
    """
    try:
        init_db()
        user = ensure_bootstrap_user(BOOTSTRAP_USERNAME, BOOTSTRAP_PASSWORD)
    except Exception as err:
        if strict:
            raise
        logger.error("Arranque incompleto: %s", err)
        return

    if user:
        logger.info("Utilizador disponível: %s", user.username)
    else:
        logger.warning(
            "Nenhum utilizador configurado. Defina PROSPECTOR_USERNAME e "
            "PROSPECTOR_PASSWORD no .env, ou crie um com create_user.py."
        )


if __name__ == "__main__":
    bootstrap()
    app.run(host=HOST, port=PORT, threaded=True)

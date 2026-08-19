from places import PlaceResult
from repository import upsert_lead_from_place


def create_lead(session, user_id: str) -> str:
    place = PlaceResult(
        place_id="ChIJ1",
        name="Restaurante O Carvalho, Lda",
        address="Rua A, Carvalhos",
        phone="220000000",
        reviews_count=2,
        types=["restaurant"],
        field_details={"phone": "nationalPhoneNumber"},
    )
    lead, _ = upsert_lead_from_place(session, user_id, place, "restaurantes", "Carvalhos")
    session.commit()
    return lead.id


def test_public_config_is_open(client):
    body = client.get("/api/config").get_json()

    assert body["status"] == "success"
    assert body["config"]["enrichmentEnabled"] is False
    assert [item["value"] for item in body["config"]["statuses"]] == [
        "novo",
        "contactado",
        "em_conversa",
        "fechado",
        "descartado",
    ]


def test_login_rejects_wrong_password(client):
    response = client.post(
        "/api/auth/login", json={"username": "tester", "password": "errada"}
    )

    assert response.status_code == 401


def test_protected_endpoints_require_a_session(client):
    assert client.get("/api/leads").status_code == 401
    assert client.get("/api/dashboard").status_code == 401
    assert client.post("/api/search", json={}).status_code == 401


def test_logout_invalidates_the_token(client, auth_headers):
    assert client.post("/api/auth/logout", headers=auth_headers).status_code == 200
    assert client.get("/api/leads", headers=auth_headers).status_code == 401


def test_lead_listing_and_patch(client, auth_headers, session, user):
    lead_id = create_lead(session, user.id)

    listed = client.get("/api/leads", headers=auth_headers).get_json()["leads"]
    assert len(listed) == 1
    assert listed[0]["fieldSources"]["phone"]["label"] == "Google Maps"

    response = client.patch(
        f"/api/leads/{lead_id}",
        headers=auth_headers,
        json={
            "status": "contactado",
            "notes": "Falei com o gerente.",
            "lastContactAt": "2026-08-19",
        },
    )
    lead = response.get_json()["lead"]

    assert response.status_code == 200
    assert lead["status"] == "contactado"
    assert lead["notes"] == "Falei com o gerente."
    assert lead["lastContactAt"].startswith("2026-08-19")


def test_patch_rejects_unknown_status(client, auth_headers, session, user):
    lead_id = create_lead(session, user.id)
    response = client.patch(
        f"/api/leads/{lead_id}", headers=auth_headers, json={"status": "arquivado"}
    )

    assert response.status_code == 400


def test_manual_edit_is_labelled_as_manual(client, auth_headers, session, user):
    lead_id = create_lead(session, user.id)
    response = client.patch(
        f"/api/leads/{lead_id}", headers=auth_headers, json={"email": "geral@carvalho.pt"}
    )
    sources = response.get_json()["lead"]["fieldSources"]

    assert sources["email"]["source"] == "manual"
    assert sources["email"]["label"] == "Introduzido manualmente"


def test_dashboard_returns_counts_per_status(client, auth_headers, session, user):
    create_lead(session, user.id)
    summary = client.get("/api/dashboard", headers=auth_headers).get_json()["summary"]

    assert summary["total"] == 1
    assert summary["byStatus"]["novo"] == 1
    assert summary["weakDigitalPresence"] == 1


def test_outreach_returns_three_variations(client, auth_headers, session, user):
    lead_id = create_lead(session, user.id)
    response = client.post(
        f"/api/leads/{lead_id}/outreach",
        headers=auth_headers,
        json={"channel": "email", "offer": "crio sites simples"},
    )
    body = response.get_json()

    assert response.status_code == 200
    assert len(body["variations"]) == 3
    assert "envio é sempre manual" in body["notice"]


def test_outreach_requires_an_offer(client, auth_headers, session, user):
    lead_id = create_lead(session, user.id)
    response = client.post(
        f"/api/leads/{lead_id}/outreach",
        headers=auth_headers,
        json={"channel": "email", "offer": ""},
    )

    assert response.status_code == 400


def test_enrichment_is_disabled(client, auth_headers, session, user):
    lead_id = create_lead(session, user.id)
    response = client.post(f"/api/leads/{lead_id}/enrich", headers=auth_headers)

    assert response.status_code == 503
    assert response.get_json()["enrichmentStatus"] == "desativado"


def test_search_reports_missing_places_key(client, auth_headers):
    response = client.post(
        "/api/search",
        headers=auth_headers,
        json={"segment": "restaurantes", "region": "Carvalhos"},
    )

    assert response.status_code == 502
    assert "GOOGLE_PLACES_API_KEY" in response.get_json()["message"]


def test_search_validates_input(client, auth_headers):
    assert (
        client.post("/api/search", headers=auth_headers, json={"region": "Gaia"}).status_code
        == 400
    )
    assert (
        client.post(
            "/api/search",
            headers=auth_headers,
            json={"segment": "x", "region": "y", "entityFilter": "outro"},
        ).status_code
        == 400
    )


def test_delete_lead(client, auth_headers, session, user):
    lead_id = create_lead(session, user.id)

    assert client.delete(f"/api/leads/{lead_id}", headers=auth_headers).status_code == 200
    assert client.get(f"/api/leads/{lead_id}", headers=auth_headers).status_code == 404

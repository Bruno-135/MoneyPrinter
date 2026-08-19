from places import PlaceResult
from repository import (
    dashboard_summary,
    get_lead,
    list_leads,
    update_lead,
    upsert_lead_from_place,
)


def make_place(**overrides) -> PlaceResult:
    defaults = dict(
        place_id="ChIJ1",
        name="Restaurante O Carvalho, Lda",
        address="Rua A, Carvalhos",
        phone="220000000",
        website=None,
        rating=None,
        reviews_count=2,
        business_status="OPERATIONAL",
        google_maps_url="https://maps.google.com/?cid=1",
        primary_type="restaurant",
        types=["restaurant"],
        latitude=41.0,
        longitude=-8.5,
        field_details={"phone": "nationalPhoneNumber", "address": "formattedAddress"},
    )
    defaults.update(overrides)
    return PlaceResult(**defaults)


def test_upsert_creates_lead_with_source_labels(session, user):
    lead, created = upsert_lead_from_place(
        session, user.id, make_place(), "restaurantes", "Carvalhos"
    )
    session.commit()

    assert created
    assert lead.field_sources["phone"]["source"] == "google_places"
    assert lead.field_sources["phone"]["label"] == "Google Maps"
    assert lead.field_sources["entity_type"]["source"] == "derivado"
    assert lead.weak_digital_presence is True


def test_upsert_does_not_duplicate_the_same_place(session, user):
    upsert_lead_from_place(session, user.id, make_place(), "restaurantes", "Carvalhos")
    session.commit()
    _, created = upsert_lead_from_place(
        session, user.id, make_place(), "restaurantes", "Carvalhos"
    )
    session.commit()

    assert created is False
    assert len(list_leads(session, user.id)) == 1


def test_upsert_refreshes_data_from_the_source(session, user):
    lead, _ = upsert_lead_from_place(session, user.id, make_place(), "seg", "reg")
    session.commit()

    upsert_lead_from_place(
        session,
        user.id,
        make_place(website="https://carvalho.pt", reviews_count=140, rating=4.6),
        "seg",
        "reg",
    )
    session.commit()

    refreshed = get_lead(session, user.id, lead.id)
    assert refreshed.website == "https://carvalho.pt"
    assert refreshed.weak_digital_presence is False


def test_manual_edits_survive_a_new_search(session, user):
    lead, _ = upsert_lead_from_place(session, user.id, make_place(), "seg", "reg")
    session.commit()

    update_lead(session, lead, {"phone": "910000000"})
    upsert_lead_from_place(session, user.id, make_place(), "seg", "reg")
    session.commit()

    refreshed = get_lead(session, user.id, lead.id)
    assert refreshed.phone == "910000000"
    assert refreshed.field_sources["phone"]["source"] == "manual"


def test_user_notes_and_status_are_never_overwritten(session, user):
    lead, _ = upsert_lead_from_place(session, user.id, make_place(), "seg", "reg")
    session.commit()
    update_lead(session, lead, {"status": "em_conversa", "notes": "Reunião marcada."})

    upsert_lead_from_place(session, user.id, make_place(), "seg", "reg")
    session.commit()

    refreshed = get_lead(session, user.id, lead.id)
    assert refreshed.status == "em_conversa"
    assert refreshed.notes == "Reunião marcada."


def test_list_leads_filters_by_entity_and_presence(session, user):
    upsert_lead_from_place(session, user.id, make_place(), "seg", "reg")
    upsert_lead_from_place(
        session,
        user.id,
        make_place(
            place_id="ChIJ2",
            name="Dra. Maria Sousa",
            types=["dentist"],
            website="https://maria.pt",
            reviews_count=200,
            rating=4.9,
        ),
        "seg",
        "reg",
    )
    session.commit()

    assert len(list_leads(session, user.id, entity_filter="pf")) == 1
    assert len(list_leads(session, user.id, entity_filter="pj")) == 1
    assert len(list_leads(session, user.id, weak_only=True)) == 1
    assert len(list_leads(session, user.id, query="Carvalhos")) == 2


def test_dashboard_counts_every_status(session, user):
    lead, _ = upsert_lead_from_place(session, user.id, make_place(), "seg", "reg")
    session.commit()
    update_lead(session, lead, {"status": "contactado"})

    summary = dashboard_summary(session, user.id)

    assert summary["total"] == 1
    assert summary["byStatus"]["contactado"] == 1
    assert summary["byStatus"]["novo"] == 0
    assert summary["withoutWebsite"] == 1

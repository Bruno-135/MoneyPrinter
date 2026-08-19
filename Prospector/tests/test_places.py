from places import build_text_query, dedup_key
from places import _parse_place


def test_build_text_query_joins_segment_and_region():
    assert build_text_query("restaurantes", "Carvalhos") == "restaurantes em Carvalhos"


def test_build_text_query_tolerates_missing_region():
    assert build_text_query("restaurantes", "") == "restaurantes"


def test_dedup_key_prefers_google_identifier():
    assert dedup_key("Qualquer Nome", "Qualquer Morada", "ChIJabc") == "google:ChIJabc"


def test_dedup_key_normalises_name_and_address():
    first = dedup_key("Café Central", "Rua Dr. Alberto, 12 — Gaia")
    second = dedup_key("cafe  central", "rua dr alberto 12 gaia")

    assert first == second


def test_parse_place_maps_fields_and_records_provenance():
    place = _parse_place(
        {
            "id": "ChIJ123",
            "displayName": {"text": "Clínica Bella"},
            "formattedAddress": "Rua A, Vila Nova de Gaia",
            "nationalPhoneNumber": "220 000 000",
            "websiteUri": "https://bella.pt",
            "rating": 4.5,
            "userRatingCount": 32,
            "businessStatus": "OPERATIONAL",
            "googleMapsUri": "https://maps.google.com/?cid=1",
            "primaryType": "beauty_salon",
            "types": ["beauty_salon", "spa"],
            "location": {"latitude": 41.1, "longitude": -8.6},
        }
    )

    assert place.name == "Clínica Bella"
    assert place.phone == "220 000 000"
    assert place.reviews_count == 32
    assert place.latitude == 41.1
    assert place.field_details["phone"] == "nationalPhoneNumber"
    assert place.field_details["website"] == "websiteUri"


def test_parse_place_without_optional_fields():
    place = _parse_place({"id": "ChIJ0", "displayName": {"text": "Tasca do Zé"}})

    assert place.phone is None
    assert place.website is None
    assert "phone" not in place.field_details

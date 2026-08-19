import pytest

from scoring import (
    WEAK_PRESENCE_THRESHOLD,
    classify_entity_type,
    is_weak_presence,
    score_digital_presence,
)


@pytest.mark.parametrize(
    "name,types,expected",
    [
        ("Restaurante O Carvalho, Lda", ["restaurant"], "pj"),
        ("Padaria Central Unipessoal Lda", [], "pj"),
        ("Dra. Maria Sousa", ["dentist"], "pf"),
        ("Eng. João Pereira", [], "pf"),
        ("Clinica de Estetica Bella", ["beauty_salon"], "pj"),
        ("Ana Ribeiro Silva", ["lawyer"], "pf"),
    ],
)
def test_classify_entity_type(name, types, expected):
    entity_type, _ = classify_entity_type(name, types)
    assert entity_type == expected


def test_classify_entity_type_returns_confidence():
    _, confidence = classify_entity_type("Talho do Bairro, Lda", [])
    assert confidence == "alta"


def test_score_flags_business_without_website_or_reviews():
    score, flags = score_digital_presence(
        website=None, reviews_count=0, rating=None, phone="220000000", address="Rua A"
    )
    codes = {flag["code"] for flag in flags}

    assert "sem_site" in codes
    assert "sem_avaliacoes" in codes
    assert score >= WEAK_PRESENCE_THRESHOLD
    assert is_weak_presence(score)


def test_score_of_complete_profile_is_low():
    score, flags = score_digital_presence(
        website="https://exemplo.pt",
        reviews_count=180,
        rating=4.7,
        phone="220000000",
        address="Rua A",
    )

    assert flags == []
    assert score == 0
    assert not is_weak_presence(score)


def test_few_reviews_weigh_less_than_none():
    few, _ = score_digital_presence("https://x.pt", 4, 4.0, "220", "Rua")
    none, _ = score_digital_presence("https://x.pt", 0, 4.0, "220", "Rua")

    assert few < none


def test_score_never_exceeds_100():
    score, _ = score_digital_presence(None, None, None, None, None)
    assert score <= 100

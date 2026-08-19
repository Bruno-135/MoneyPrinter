import pytest

from messaging import build_template_variations, generate_outreach

LEAD = {
    "name": "Restaurante O Carvalho, Lda",
    "entity_type": "pj",
    "segment_query": "restaurantes",
    "region_query": "Carvalhos",
    "website": None,
    "rating": None,
    "reviews_count": 2,
    "digital_presence_flags": [{"code": "sem_site", "label": "Sem site", "weight": 40}],
}


def test_email_variations_have_subject_and_body():
    variations = build_template_variations(LEAD, "email", "crio sites simples")

    assert len(variations) == 3
    assert all(variation["subject"] for variation in variations)
    assert all(variation["body"] for variation in variations)


def test_variations_are_distinct():
    bodies = [item["body"] for item in build_template_variations(LEAD, "email", "x")]
    assert len(set(bodies)) == 3


def test_whatsapp_variations_have_no_subject_and_stay_short():
    variations = build_template_variations(LEAD, "whatsapp", "crio sites simples")

    assert all(variation["subject"] == "" for variation in variations)
    assert all(len(variation["body"]) <= 600 for variation in variations)


def test_variations_mention_the_lead_and_the_offer():
    variations = build_template_variations(LEAD, "email", "crio sites que aparecem no Google")

    assert any("Restaurante O Carvalho" in item["body"] for item in variations)
    assert all("crio sites que aparecem no Google" in item["body"] for item in variations)


def test_legal_suffix_is_dropped_from_the_display_name():
    body = build_template_variations(LEAD, "email", "x")[1]["body"]
    assert "Restaurante O Carvalho," not in body.replace("Carvalho, Lda", "")


def test_observation_variation_uses_the_digital_presence_gap():
    variations = build_template_variations(LEAD, "email", "x")
    assert "não tem site" in variations[1]["body"]


def test_individual_is_greeted_by_name():
    lead = {**LEAD, "name": "Dra. Maria Sousa", "entity_type": "pf"}
    assert build_template_variations(lead, "email", "x")[0]["body"].startswith(
        "Olá Dra. Maria Sousa"
    )


def test_generate_outreach_falls_back_to_templates():
    variations, generator = generate_outreach(LEAD, "email", "crio sites simples")

    assert generator == "template"
    assert len(variations) == 3


def test_generate_outreach_rejects_unknown_channel():
    with pytest.raises(ValueError):
        generate_outreach(LEAD, "sms", "crio sites simples")


def test_generate_outreach_requires_an_offer():
    with pytest.raises(ValueError):
        generate_outreach(LEAD, "email", "   ")

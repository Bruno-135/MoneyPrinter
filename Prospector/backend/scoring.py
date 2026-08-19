"""Classificação de leads: presença digital e natureza jurídica (heurística)."""

import re
import unicodedata
from typing import Optional, Tuple

#: Score >= a este valor marca o lead como "presença digital fraca".
WEAK_PRESENCE_THRESHOLD = 50

#: Abaixo deste número de avaliações consideramos o perfil pouco trabalhado.
LOW_REVIEWS_THRESHOLD = 10

# Sufixos e marcadores de sociedade comercial (pessoa jurídica).
_COMPANY_MARKERS = re.compile(
    r"(?:^|[\s,.\-])("
    r"lda|l\.da|limitada|unipessoal|sociedade|soc\.|s\.?a\.?|sa|"
    r"ltd|ltda|llc|inc|gmbh|srl|s\.?l\.?|"
    r"empresa|grupo|holding|associacao|cooperativa|fundacao|"
    r"& filhos|e filhos|irmaos|and sons"
    r")(?:$|[\s,.\-])",
    re.IGNORECASE,
)

# Títulos profissionais que sinalizam um profissional individual (pessoa física).
_PERSON_TITLES = re.compile(
    r"^(dr|dra|doutor|doutora|prof|professor|professora|eng|enga|engenheiro|"
    r"engenheira|arq|arquiteto|arquiteta|adv|advogado|advogada|med|"
    r"terapeuta|nutricionista|psicologo|psicologa|fisioterapeuta)\b",
    re.IGNORECASE,
)

# Palavras que denunciam um estabelecimento, mesmo sem sufixo legal.
_BUSINESS_WORDS = re.compile(
    r"\b(restaurante|cafe|cafetaria|snack|bar|pastelaria|padaria|churrasqueira|"
    r"clinica|centro|instituto|studio|estudio|salao|barbearia|cabeleireiro|"
    r"loja|mercado|minimercado|supermercado|talho|farmacia|oficina|stand|"
    r"ginasio|academia|hotel|hostel|pensao|imobiliaria|agencia|escola|"
    r"consultorio|espaco|casa|tasca|pizzaria|gelataria|florista|papelaria)\b",
    re.IGNORECASE,
)

# Tipos do Google Places tipicamente exercidos por profissionais individuais.
_PERSONAL_SERVICE_TYPES = {
    "doctor",
    "dentist",
    "lawyer",
    "physiotherapist",
    "psychologist",
    "accounting",
    "insurance_agency",
    "real_estate_agency",
    "veterinary_care",
    "consultant",
}


def strip_accents(value: str) -> str:
    normalised = unicodedata.normalize("NFKD", value or "")
    return "".join(char for char in normalised if not unicodedata.combining(char))


def _looks_like_person_name(name: str) -> bool:
    """Nome curto, sem palavras de estabelecimento e com aspecto de nome próprio."""
    cleaned = strip_accents(name).strip()
    if not cleaned or _BUSINESS_WORDS.search(cleaned):
        return False

    tokens = [token for token in re.split(r"\s+", cleaned) if token]
    if not 2 <= len(tokens) <= 4:
        return False

    return all(re.fullmatch(r"[A-Za-z'\-]+", token) for token in tokens)


def classify_entity_type(
    name: str, place_types: Optional[list] = None
) -> Tuple[str, str]:
    """
    Estima se o lead é pessoa jurídica ou pessoa física.

    Devolve (tipo, confiança) em que o tipo é "pj", "pf" ou "desconhecido" e a
    confiança é "alta", "media" ou "baixa". É uma heurística sobre o nome e os
    tipos devolvidos pelo Google Places — a confirmação da razão social fica a
    cargo da camada de enriquecimento (ver enrichment.py).
    """
    normalised = strip_accents(name or "").strip()
    types = {str(item).lower() for item in (place_types or [])}

    if _COMPANY_MARKERS.search(normalised):
        return "pj", "alta"

    if _PERSON_TITLES.match(normalised):
        return "pf", "alta"

    if types & _PERSONAL_SERVICE_TYPES and _looks_like_person_name(normalised):
        return "pf", "media"

    if _BUSINESS_WORDS.search(normalised) or types:
        return "pj", "media"

    if _looks_like_person_name(normalised):
        return "pf", "baixa"

    return "desconhecido", "baixa"


def score_digital_presence(
    website: Optional[str],
    reviews_count: Optional[int],
    rating: Optional[float],
    phone: Optional[str],
    address: Optional[str],
) -> Tuple[int, list]:
    """
    Pontua a fragilidade da presença digital de 0 a 100.

    Quanto maior o valor, mais fraca é a presença digital — e mais prioritário
    é o alvo. Devolve (score, sinais) em que cada sinal descreve o motivo.
    """
    flags: list[dict] = []

    if not (website or "").strip():
        flags.append({"code": "sem_site", "label": "Sem site", "weight": 40})

    if reviews_count is None or reviews_count == 0:
        flags.append({"code": "sem_avaliacoes", "label": "Sem avaliações", "weight": 30})
    elif reviews_count < LOW_REVIEWS_THRESHOLD:
        flags.append(
            {
                "code": "poucas_avaliacoes",
                "label": f"Poucas avaliações ({reviews_count})",
                "weight": 20,
            }
        )

    if not (phone or "").strip():
        flags.append({"code": "sem_telefone", "label": "Sem telefone", "weight": 15})

    if rating is None:
        flags.append({"code": "sem_nota", "label": "Sem nota atribuída", "weight": 5})

    if not (address or "").strip():
        flags.append(
            {"code": "sem_morada", "label": "Perfil sem morada", "weight": 10}
        )

    score = min(100, sum(int(flag["weight"]) for flag in flags))
    return score, flags


def is_weak_presence(score: int) -> bool:
    return score >= WEAK_PRESENCE_THRESHOLD

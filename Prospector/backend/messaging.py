"""
Geração de mensagens de primeira abordagem.

Produz sempre três variações para o lead escolhido. A aplicação nunca envia
nada: as mensagens são apresentadas para o utilizador copiar e enviar à mão.
"""

import json
import re
from typing import Optional

from config import (
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
    OLLAMA_TIMEOUT,
    OUTREACH_CHANNELS,
    OUTREACH_USE_LLM,
    SENDER_NAME,
)

VARIATION_TITLES = ("Direta", "Observação", "Contexto local")

MAX_WHATSAPP_CHARS = 600


def _gap_sentence(flags: Optional[list]) -> str:
    """Frase de contexto construída a partir dos sinais de presença digital."""
    codes = {flag.get("code") for flag in (flags or []) if isinstance(flag, dict)}

    if "sem_site" in codes:
        return "reparei que o perfil ainda não tem site associado"
    if "sem_avaliacoes" in codes:
        return "reparei que o perfil ainda não tem avaliações"
    if "poucas_avaliacoes" in codes:
        return "reparei que o perfil ainda tem poucas avaliações"
    if "sem_telefone" in codes:
        return "reparei que o perfil não mostra um telefone de contacto"
    return "vi o vosso perfil no Google"


#: Sufixos legais que não fazem parte do nome pelo qual o negócio é tratado.
_LEGAL_SUFFIX = re.compile(
    r"[\s,]+(unipessoal\s+)?(lda\.?|limitada|s\.?a\.?|ltd\.?|ltda\.?)\s*$",
    re.IGNORECASE,
)


def _display_name(name: str) -> str:
    """Nome do negócio sem o sufixo legal, para usar no corpo da mensagem."""
    cleaned = _LEGAL_SUFFIX.sub("", (name or "").strip()).strip(" ,")
    return cleaned or "a vossa empresa"


def _greeting(lead: dict) -> str:
    """Saudação sempre gramatical: trata o profissional pelo nome, a empresa não."""
    if lead.get("entity_type") == "pf":
        return f"Olá {_display_name(lead.get('name'))}"
    return "Olá"


def _where(lead: dict) -> str:
    region = (lead.get("region_query") or "").strip()
    return f" em {region}" if region else ""


def _segment(lead: dict) -> str:
    segment = (lead.get("segment_query") or "").strip()
    return segment or "o vosso setor"


def build_template_variations(lead: dict, channel: str, offer: str) -> list[dict]:
    """Gera as três variações sem depender de nenhum modelo de linguagem."""
    name = _display_name(lead.get("name"))
    greeting = _greeting(lead)
    gap = _gap_sentence(lead.get("digital_presence_flags"))
    where = _where(lead)
    segment = _segment(lead)
    offer = (offer or "").strip().rstrip(".")

    if channel == "whatsapp":
        bodies = [
            (
                f"{greeting}! Sou o {SENDER_NAME}. Trabalho com negócios de {segment}"
                f"{where} e {offer}. Faz sentido explicar em dois minutos "
                f"como isso funcionaria para {name}?"
            ),
            (
                f"{greeting}! Estive a ver o perfil de {name} no Google e {gap}. "
                f"É precisamente aí que ajudo: {offer}. Posso mandar uma ideia "
                "concreta para o vosso caso?"
            ),
            (
                f"{greeting}! Ando a falar com negócios de {segment}{where} e "
                f"{offer}. Se quiser, mostro o que faria primeiro no caso de "
                f"{name} — sem compromisso."
            ),
        ]
        bodies = [body[:MAX_WHATSAPP_CHARS] for body in bodies]
        subjects = ["", "", ""]
    else:
        subjects = [
            f"{name}: uma ideia rápida",
            f"Uma coisa que reparei no perfil de {name}",
            f"Trabalho com {segment}{where}",
        ]
        bodies = [
            (
                f"{greeting},\n\n"
                f"Chamo-me {SENDER_NAME} e trabalho com negócios de {segment}{where}. "
                f"Em concreto, {offer}.\n\n"
                f"Se fizer sentido, respondo com uma proposta curta feita à "
                f"medida de {name} — bastam dois minutos da vossa parte.\n\n"
                f"Obrigado pelo tempo,\n{SENDER_NAME}"
            ),
            (
                f"{greeting},\n\n"
                f"Estive a ver o perfil de {name} no Google e {gap}. Não é um "
                "detalhe menor: é muitas vezes o primeiro sítio onde um cliente "
                "vos procura.\n\n"
                f"É exactamente nisso que ajudo — {offer}.\n\n"
                "Quer que lhe envie uma sugestão concreta para o vosso caso?\n\n"
                f"Um abraço,\n{SENDER_NAME}"
            ),
            (
                f"{greeting},\n\n"
                f"Ando a acompanhar de perto negócios de {segment}{where} e a "
                f"maioria partilha o mesmo problema. Do meu lado, {offer}.\n\n"
                f"Se quiser, digo-lhe em três pontos o que faria primeiro no caso "
                f"de {name}. Sem compromisso nenhum.\n\n"
                f"Cumprimentos,\n{SENDER_NAME}"
            ),
        ]

    return [
        {
            "id": index + 1,
            "title": VARIATION_TITLES[index],
            "subject": subjects[index],
            "body": bodies[index],
        }
        for index in range(3)
    ]


def _llm_prompt(lead: dict, channel: str, offer: str) -> str:
    contexto = {
        "nome": lead.get("name"),
        "tipo": "profissional individual" if lead.get("entity_type") == "pf" else "empresa",
        "segmento": lead.get("segment_query"),
        "regiao": lead.get("region_query"),
        "tem_site": bool(lead.get("website")),
        "numero_avaliacoes": lead.get("reviews_count"),
        "nota": lead.get("rating"),
        "sinais_presenca_digital": [
            flag.get("label")
            for flag in (lead.get("digital_presence_flags") or [])
            if isinstance(flag, dict)
        ],
    }

    formato = (
        '[{"titulo": "...", "assunto": "...", "mensagem": "..."}, ...]'
        if channel == "email"
        else '[{"titulo": "...", "assunto": "", "mensagem": "..."}, ...]'
    )
    regra_canal = (
        "Cada mensagem é um email curto (máximo 120 palavras) com assunto próprio."
        if channel == "email"
        else "Cada mensagem é para WhatsApp: no máximo 60 palavras, tom directo, sem assunto."
    )

    return (
        "És um assistente que escreve mensagens de primeira abordagem comercial "
        "em português de Portugal.\n\n"
        f"Contexto do lead (JSON): {json.dumps(contexto, ensure_ascii=False)}\n"
        f"O que estou a oferecer: {offer}\n\n"
        "Escreve exactamente três variações distintas entre si: uma directa, uma "
        "que parte de algo observado no perfil do negócio, e uma que usa o "
        "contexto local ou do setor.\n"
        f"{regra_canal}\n"
        "Não inventes factos sobre o negócio além do contexto dado. Não prometas "
        f"resultados numéricos. Assina como {SENDER_NAME}.\n\n"
        f"Responde apenas com um array JSON válido no formato: {formato}"
    )


def _variations_from_llm(lead: dict, channel: str, offer: str) -> Optional[list[dict]]:
    try:
        from ollama import Client
    except ImportError:
        return None

    try:
        client = Client(host=OLLAMA_BASE_URL, timeout=OLLAMA_TIMEOUT)
        response = client.generate(
            model=OLLAMA_MODEL,
            prompt=_llm_prompt(lead, channel, offer),
            format="json",
        )
    except Exception:
        return None

    raw = ""
    if hasattr(response, "response"):
        raw = getattr(response, "response") or ""
    elif isinstance(response, dict):
        raw = response.get("response") or ""

    try:
        parsed = json.loads(raw)
    except (TypeError, ValueError):
        return None

    if isinstance(parsed, dict):
        for value in parsed.values():
            if isinstance(value, list):
                parsed = value
                break

    if not isinstance(parsed, list) or len(parsed) < 3:
        return None

    variations = []
    for index, item in enumerate(parsed[:3]):
        if not isinstance(item, dict):
            return None
        body = (item.get("mensagem") or item.get("body") or "").strip()
        if not body:
            return None
        variations.append(
            {
                "id": index + 1,
                "title": (item.get("titulo") or VARIATION_TITLES[index]).strip(),
                "subject": (item.get("assunto") or "").strip()
                if channel == "email"
                else "",
                "body": body,
            }
        )

    return variations


def generate_outreach(lead: dict, channel: str, offer: str) -> tuple[list[dict], str]:
    """
    Gera três variações de mensagem para um lead.

    Args:
        lead: Dicionário serializado do lead.
        channel: "email" ou "whatsapp".
        offer: Frase que descreve o que está a ser oferecido.

    Returns:
        (variações, gerador) em que gerador é "ollama" ou "template".

    Raises:
        ValueError: Se o canal for inválido ou a oferta estiver vazia.
    """
    if channel not in OUTREACH_CHANNELS:
        raise ValueError(f"Canal inválido: {channel}.")
    if not (offer or "").strip():
        raise ValueError("Descreva numa frase o que está a oferecer.")

    if OUTREACH_USE_LLM:
        variations = _variations_from_llm(lead, channel, offer)
        if variations:
            return variations, "ollama"

    return build_template_variations(lead, channel, offer), "template"

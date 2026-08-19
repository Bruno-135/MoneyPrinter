"""
Recolha do email de contacto a partir do site do próprio negócio.

Só é usada quando o utilizador pede explicitamente numa pesquisa. Não toca em
redes sociais: apenas o domínio que o próprio Google Places indica como site
oficial do negócio, respeitando o robots.txt desse domínio.
"""

import re
from typing import Optional
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import requests

from config import (
    EMAIL_DISCOVERY_MAX_PAGES,
    EMAIL_DISCOVERY_TIMEOUT,
    EMAIL_DISCOVERY_USER_AGENT,
)

EMAIL_PATTERN = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
)

#: Páginas onde um contacto costuma estar publicado.
CONTACT_PATHS = ("", "/contactos", "/contacto", "/contact", "/contact-us", "/sobre")

#: Endereços genéricos de plataformas que não pertencem ao negócio.
BLOCKED_DOMAINS = (
    "example.com",
    "sentry.io",
    "wixpress.com",
    "godaddy.com",
    "squarespace.com",
    "wordpress.com",
)

BLOCKED_EXTENSIONS = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg")


def _is_plausible_email(email: str) -> bool:
    lowered = email.lower()
    if any(lowered.endswith(extension) for extension in BLOCKED_EXTENSIONS):
        return False
    domain = lowered.rsplit("@", 1)[-1]
    return not any(domain.endswith(blocked) for blocked in BLOCKED_DOMAINS)


def _robots_allows(base_url: str, path: str) -> bool:
    """Verifica o robots.txt do domínio antes de pedir uma página."""
    try:
        parser = RobotFileParser()
        parser.set_url(urljoin(base_url, "/robots.txt"))
        parser.read()
        return parser.can_fetch(EMAIL_DISCOVERY_USER_AGENT, urljoin(base_url, path))
    except Exception:
        # Sem robots.txt legível assumimos que a página pública pode ser lida.
        return True


def find_email(website: Optional[str]) -> Optional[str]:
    """
    Procura um email de contacto no site oficial do negócio.

    Args:
        website: URL do site indicado pela fonte de dados.

    Returns:
        O primeiro email plausível encontrado, ou None.
    """
    if not (website or "").strip():
        return None

    parsed = urlparse(website)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return None

    base_url = f"{parsed.scheme}://{parsed.netloc}"
    headers = {"User-Agent": EMAIL_DISCOVERY_USER_AGENT}

    for path in CONTACT_PATHS[:EMAIL_DISCOVERY_MAX_PAGES]:
        target = urljoin(base_url, path) if path else website

        if not _robots_allows(base_url, path or "/"):
            continue

        try:
            response = requests.get(
                target, headers=headers, timeout=EMAIL_DISCOVERY_TIMEOUT
            )
        except requests.RequestException:
            continue

        if response.status_code != 200 or "text/html" not in response.headers.get(
            "Content-Type", ""
        ):
            continue

        for match in EMAIL_PATTERN.findall(response.text or ""):
            if _is_plausible_email(match):
                return match.lower()

    return None

"""
Camada opcional de enriquecimento com o registo comercial português.

Está PREPARADA MAS DESATIVADA. Quando for ligada, cruza o nome do negócio com
o registo comercial público português para confirmar a razão social, o NIPC e a
situação de actividade da empresa, devolvendo cada valor já etiquetado com a
fonte "registo_comercial_pt".

Para activar:
  1. Obter credenciais de um serviço oficial com API (por exemplo o Portal da
     Empresa / Registo Comercial Online do IRN).
  2. Implementar `PortugueseRegistryEnricher.lookup`.
  3. Definir PROSPECTOR_ENRICHMENT_ENABLED=true no ficheiro .env.

Enquanto estiver desativada, `enrich_lead` devolve sempre um resultado com
`status="desativado"` e a aplicação apresenta o botão de enriquecimento inerte.
"""

from dataclasses import dataclass, field
from typing import Optional, Protocol

from config import ENRICHMENT_ENABLED, ENRICHMENT_PROVIDER
from sources import PT_REGISTRY, stamp

STATUS_DISABLED = "desativado"
STATUS_NOT_IMPLEMENTED = "nao_implementado"
STATUS_OK = "confirmado"
STATUS_NOT_FOUND = "nao_encontrado"


@dataclass
class EnrichmentResult:
    """Resultado de uma tentativa de enriquecimento."""

    status: str
    message: str
    data: dict = field(default_factory=dict)
    #: Etiquetas de proveniência a fundir no lead, campo a campo.
    field_sources: dict = field(default_factory=dict)

    @property
    def applied(self) -> bool:
        return self.status == STATUS_OK


class RegistryEnricher(Protocol):
    """Contrato de qualquer fonte de registo comercial."""

    name: str

    def lookup(self, business_name: str, address: Optional[str]) -> EnrichmentResult:
        ...


class PortugueseRegistryEnricher:
    """
    Ligação ao registo comercial público português.

    Placeholder: a chamada real ao serviço oficial ainda não está implementada.
    Ao implementar, preencher `data` com as chaves `razao_social`, `nipc` e
    `situacao_actividade`, e `field_sources` com `stamp(PT_REGISTRY, ...)`.
    """

    name = "pt_registo_comercial"

    def lookup(self, business_name: str, address: Optional[str]) -> EnrichmentResult:
        return EnrichmentResult(
            status=STATUS_NOT_IMPLEMENTED,
            message=(
                "Camada de enriquecimento activa mas sem integração implementada. "
                "Implemente PortugueseRegistryEnricher.lookup com um serviço "
                "oficial do registo comercial."
            ),
        )


_PROVIDERS: dict[str, RegistryEnricher] = {
    PortugueseRegistryEnricher.name: PortugueseRegistryEnricher(),
}


def is_enabled() -> bool:
    return bool(ENRICHMENT_ENABLED)


def provider_name() -> str:
    return ENRICHMENT_PROVIDER


def enrich_lead(business_name: str, address: Optional[str] = None) -> EnrichmentResult:
    """
    Tenta confirmar os dados oficiais de um negócio no registo comercial.

    Returns:
        EnrichmentResult sempre preenchido — nunca levanta excepção de configuração.
    """
    if not is_enabled():
        return EnrichmentResult(
            status=STATUS_DISABLED,
            message=(
                "Enriquecimento pelo registo comercial está desativado. "
                "Defina PROSPECTOR_ENRICHMENT_ENABLED=true para o ligar."
            ),
        )

    enricher = _PROVIDERS.get(ENRICHMENT_PROVIDER)
    if enricher is None:
        return EnrichmentResult(
            status=STATUS_NOT_IMPLEMENTED,
            message=f"Fonte de enriquecimento desconhecida: {ENRICHMENT_PROVIDER}.",
        )

    return enricher.lookup(business_name, address)


def build_confirmed_sources(fields: dict) -> dict:
    """Ajuda a etiquetar campos confirmados pelo registo comercial."""
    return {name: stamp(PT_REGISTRY, detail) for name, detail in fields.items()}

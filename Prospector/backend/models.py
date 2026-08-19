"""Modelos de dados da aplicação de prospecção comercial."""

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from db import Base, JSONType, table_args, table_schema


def _fk(target: str) -> str:
    """Referência de chave estrangeira qualificada com o schema activo."""
    schema = table_schema()
    return f"{schema}.{target}" if schema else target


class AppUser(Base):
    """Utilizador da aplicação (autenticação simples por login e password)."""

    __tablename__ = "app_users"
    __table_args__ = table_args(UniqueConstraint("username", name="uq_app_users_username"))

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    username: Mapped[str] = mapped_column(String(120), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class AuthSession(Base):
    """Sessão activa (token opaco guardado apenas em hash)."""

    __tablename__ = "auth_sessions"
    __table_args__ = table_args(
        UniqueConstraint("token_hash", name="uq_auth_sessions_token_hash")
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey(_fk("app_users.id"), ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user: Mapped[AppUser] = relationship("AppUser")


class Lead(Base):
    """Contacto comercial recolhido a partir de uma fonte oficial com API."""

    __tablename__ = "leads"
    __table_args__ = table_args(
        UniqueConstraint("owner_id", "dedup_key", name="uq_leads_owner_dedup"),
        Index("ix_leads_owner_status", "owner_id", "status"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    owner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey(_fk("app_users.id"), ondelete="CASCADE"), nullable=False, index=True
    )

    # Identificação e deduplicação
    google_place_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    dedup_key: Mapped[str] = mapped_column(String(255), nullable=False)

    # Dados do negócio
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(20), nullable=False, default="desconhecido")
    entity_type_confidence: Mapped[str] = mapped_column(String(20), nullable=False, default="baixa")
    phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    google_maps_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    reviews_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    business_status: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    primary_type: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    place_types: Mapped[Optional[list]] = mapped_column(JSONType, nullable=True)

    # Contexto da pesquisa que originou o lead
    segment_query: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    region_query: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Presença digital
    digital_presence_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    digital_presence_flags: Mapped[Optional[list]] = mapped_column(JSONType, nullable=True)
    weak_digital_presence: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, index=True
    )

    # Proveniência campo a campo: {"phone": {"source": ..., "label": ..., ...}}
    field_sources: Mapped[dict] = mapped_column(JSONType, nullable=False, default=dict)

    # Gestão do lead
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="novo", index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_contact_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Camada de enriquecimento (desativada por omissão)
    enrichment_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="desativado"
    )
    enrichment_data: Mapped[Optional[dict]] = mapped_column(JSONType, nullable=True)
    enriched_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class SearchRun(Base):
    """Histórico de cada pesquisa executada contra a fonte de dados."""

    __tablename__ = "search_runs"
    __table_args__ = table_args()

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    owner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey(_fk("app_users.id"), ondelete="CASCADE"), nullable=False, index=True
    )
    segment: Mapped[str] = mapped_column(String(255), nullable=False)
    region: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_filter: Mapped[str] = mapped_column(String(20), nullable=False, default="ambos")
    weak_only: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    source: Mapped[str] = mapped_column(String(64), nullable=False, default="google_places")
    results_found: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    results_new: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )


class OutreachDraft(Base):
    """Variações de abordagem geradas para um lead. O envio é sempre manual."""

    __tablename__ = "outreach_drafts"
    __table_args__ = table_args()

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    owner_id: Mapped[str] = mapped_column(
        String(36), ForeignKey(_fk("app_users.id"), ondelete="CASCADE"), nullable=False, index=True
    )
    lead_id: Mapped[str] = mapped_column(
        String(36), ForeignKey(_fk("leads.id"), ondelete="CASCADE"), nullable=False, index=True
    )
    channel: Mapped[str] = mapped_column(String(20), nullable=False)
    offer: Mapped[str] = mapped_column(Text, nullable=False)
    generator: Mapped[str] = mapped_column(String(32), nullable=False, default="template")
    variations: Mapped[list] = mapped_column(JSONType, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )

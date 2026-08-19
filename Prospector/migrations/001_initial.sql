-- Esquema inicial da aplicação de prospecção comercial (Supabase / Postgres).
--
-- As tabelas ficam num schema próprio, fora do `public`, para não colidirem
-- com outros projectos e para não serem expostas pela API REST do Supabase.
-- O acesso é feito pelo backend com a ligação directa à base de dados.

create schema if not exists prospeccao;

-- Utilizadores da aplicação (autenticação simples por login e password).
create table if not exists prospeccao.app_users (
    id             varchar(36) primary key,
    username       varchar(120) not null,
    password_hash  varchar(255) not null,
    created_at     timestamptz  not null default now(),
    last_login_at  timestamptz,
    constraint uq_app_users_username unique (username)
);

-- Sessões activas. Guarda-se apenas o hash SHA-256 do token.
create table if not exists prospeccao.auth_sessions (
    id          varchar(36) primary key,
    user_id     varchar(36) not null references prospeccao.app_users (id) on delete cascade,
    token_hash  varchar(64) not null,
    created_at  timestamptz not null default now(),
    expires_at  timestamptz not null,
    revoked_at  timestamptz,
    constraint uq_auth_sessions_token_hash unique (token_hash)
);

create index if not exists ix_auth_sessions_user_id on prospeccao.auth_sessions (user_id);

-- Leads recolhidos a partir de fontes oficiais com API.
create table if not exists prospeccao.leads (
    id                      varchar(36) primary key,
    owner_id                varchar(36) not null references prospeccao.app_users (id) on delete cascade,

    google_place_id         varchar(255),
    dedup_key               varchar(255) not null,

    name                    varchar(255) not null,
    entity_type             varchar(20)  not null default 'desconhecido',
    entity_type_confidence  varchar(20)  not null default 'baixa',
    phone                   varchar(64),
    email                   varchar(255),
    website                 varchar(512),
    address                 varchar(512),
    latitude                double precision,
    longitude               double precision,
    google_maps_url         varchar(512),
    rating                  double precision,
    reviews_count           integer,
    business_status         varchar(64),
    primary_type            varchar(120),
    place_types             jsonb,

    segment_query           varchar(255),
    region_query            varchar(255),

    digital_presence_score  integer     not null default 0,
    digital_presence_flags  jsonb,
    weak_digital_presence   boolean     not null default false,

    -- Proveniência campo a campo: {"phone": {"source": "...", "label": "..."}}
    field_sources           jsonb       not null default '{}'::jsonb,

    status                  varchar(20) not null default 'novo',
    notes                   text,
    last_contact_at         timestamptz,

    enrichment_status       varchar(20) not null default 'desativado',
    enrichment_data         jsonb,
    enriched_at             timestamptz,

    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now(),

    -- Evita duplicados: mesmo negócio nunca entra duas vezes para o mesmo dono.
    constraint uq_leads_owner_dedup unique (owner_id, dedup_key)
);

create index if not exists ix_leads_owner_id on prospeccao.leads (owner_id);
create index if not exists ix_leads_owner_status on prospeccao.leads (owner_id, status);
create index if not exists ix_leads_google_place_id on prospeccao.leads (google_place_id);
create index if not exists ix_leads_weak on prospeccao.leads (weak_digital_presence);
create index if not exists ix_leads_created_at on prospeccao.leads (created_at);

-- Histórico das pesquisas executadas.
create table if not exists prospeccao.search_runs (
    id             varchar(36) primary key,
    owner_id       varchar(36) not null references prospeccao.app_users (id) on delete cascade,
    segment        varchar(255) not null,
    region         varchar(255) not null,
    entity_filter  varchar(20)  not null default 'ambos',
    weak_only      boolean      not null default false,
    source         varchar(64)  not null default 'google_places',
    results_found  integer      not null default 0,
    results_new    integer      not null default 0,
    created_at     timestamptz  not null default now()
);

create index if not exists ix_search_runs_owner_id on prospeccao.search_runs (owner_id);
create index if not exists ix_search_runs_created_at on prospeccao.search_runs (created_at);

-- Variações de abordagem geradas. O envio é sempre manual, fora da ferramenta.
create table if not exists prospeccao.outreach_drafts (
    id          varchar(36) primary key,
    owner_id    varchar(36) not null references prospeccao.app_users (id) on delete cascade,
    lead_id     varchar(36) not null references prospeccao.leads (id) on delete cascade,
    channel     varchar(20) not null,
    offer       text        not null,
    generator   varchar(32) not null default 'template',
    variations  jsonb       not null,
    created_at  timestamptz not null default now()
);

create index if not exists ix_outreach_drafts_owner_id on prospeccao.outreach_drafts (owner_id);
create index if not exists ix_outreach_drafts_lead_id on prospeccao.outreach_drafts (lead_id);
create index if not exists ix_outreach_drafts_created_at on prospeccao.outreach_drafts (created_at);

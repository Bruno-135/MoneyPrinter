// Aplicação de prospecção comercial — cliente da API.

const API_BASE_URL = `${window.location.protocol}//${window.location.host}`;
const TOKEN_KEY = "prospector.token";

const state = {
  token: localStorage.getItem(TOKEN_KEY) || "",
  user: null,
  config: null,
  leads: [],
  currentLead: null,
  currentVariations: [],
};

const STATUS_LABELS = {
  novo: "Novo",
  contactado: "Contactado",
  em_conversa: "Em conversa",
  fechado: "Fechado",
  descartado: "Descartado",
};

const ENTITY_LABELS = {
  pj: "Pessoa jurídica",
  pf: "Pessoa física",
  desconhecido: "Tipo por confirmar",
};

// ===== Helpers de DOM =====

const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );
}

let toastTimer = null;
function toast(message) {
  const element = $("toast");
  element.textContent = message;
  element.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.add("hidden"), 2600);
}

// ===== Cliente da API =====

async function apiRequest(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (response.status === 401 && state.token) {
    signOut();
    throw new Error("A sessão expirou. Entre outra vez.");
  }

  if (!response.ok) {
    throw new Error(data.message || `Pedido falhou (${response.status}).`);
  }

  return data;
}

// ===== Autenticação =====

async function signIn(event) {
  event.preventDefault();
  const button = $("loginButton");
  const errorBox = $("loginError");
  errorBox.textContent = "";
  button.disabled = true;
  button.textContent = "A entrar…";

  try {
    const data = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: $("username").value,
        password: $("password").value,
      }),
    });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem(TOKEN_KEY, data.token);
    $("password").value = "";
    await startApp();
  } catch (error) {
    errorBox.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Entrar";
  }
}

function signOut() {
  state.token = "";
  state.user = null;
  state.leads = [];
  localStorage.removeItem(TOKEN_KEY);
  closeDrawer();
  $("appView").classList.add("hidden");
  $("loginView").classList.remove("hidden");
}

async function logout() {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } catch (error) {
    /* a sessão local é limpa de qualquer forma */
  }
  signOut();
}

// ===== Arranque =====

async function startApp() {
  const me = await apiRequest("/api/auth/me");
  state.user = me.user;

  const configResponse = await apiRequest("/api/config");
  state.config = configResponse.config;

  $("currentUser").textContent = state.user.username;
  $("loginView").classList.add("hidden");
  $("appView").classList.remove("hidden");

  fillStatusFilter();
  await Promise.all([loadDashboard(), loadLeads()]);
}

function fillStatusFilter() {
  const select = $("filterStatus");
  select.innerHTML = '<option value="">Todos</option>';
  (state.config.statuses || []).forEach((status) => {
    const option = document.createElement("option");
    option.value = status.value;
    option.textContent = status.label;
    select.appendChild(option);
  });
}

// ===== Separadores =====

function switchTab(name) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === name);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("hidden", panel.id !== `tab-${name}`);
  });
  if (name === "painel") loadDashboard();
  if (name === "leads") loadLeads();
}

// ===== Painel =====

function statCard(value, label, highlight = false) {
  return `
    <div class="stat ${highlight ? "highlight" : ""}">
      <div class="value">${value}</div>
      <div class="label">${escapeHtml(label)}</div>
    </div>`;
}

async function loadDashboard() {
  try {
    const data = await apiRequest("/api/dashboard");
    const summary = data.summary;

    $("statusStats").innerHTML = Object.entries(summary.byStatus)
      .map(([status, total]) => statCard(total, STATUS_LABELS[status] || status))
      .join("");

    $("priorityStats").innerHTML = [
      statCard(summary.total, "Leads no total"),
      statCard(summary.weakDigitalPresence, "Presença digital fraca", true),
      statCard(summary.withoutWebsite, "Sem site", true),
    ].join("");
  } catch (error) {
    toast(error.message);
  }
}

// ===== Cartão de lead =====

function sourceTag(lead, field) {
  const entry = (lead.fieldSources || {})[field];
  if (!entry) return "";
  const detail = entry.detail ? ` — ${entry.detail}` : "";
  return `<span class="source-tag" title="Fonte: ${escapeHtml(
    entry.label,
  )}${escapeHtml(detail)}">${escapeHtml(entry.label)}</span>`;
}

function leadCard(lead) {
  const flags = (lead.digitalPresenceFlags || [])
    .map((flag) => `<span class="badge warn">${escapeHtml(flag.label)}</span>`)
    .join("");

  const reviews =
    lead.reviewsCount === null || lead.reviewsCount === undefined
      ? "sem avaliações"
      : `${lead.reviewsCount} avaliações`;
  const rating = lead.rating ? `★ ${lead.rating}` : "sem nota";

  return `
    <article class="lead" data-lead-id="${escapeHtml(lead.id)}">
      <div class="lead-head">
        <div>
          <div class="lead-name">${escapeHtml(lead.name)}</div>
          <div class="lead-meta">${escapeHtml(lead.address || "Sem morada")}</div>
        </div>
        <div class="score-pill ${lead.weakDigitalPresence ? "weak" : ""}">
          <div class="n">${lead.digitalPresenceScore}</div>
          <div class="t">presença</div>
        </div>
      </div>
      <div class="badges">
        <span class="badge accent">${escapeHtml(
          STATUS_LABELS[lead.status] || lead.status,
        )}</span>
        <span class="badge">${escapeHtml(
          ENTITY_LABELS[lead.entityType] || lead.entityType,
        )}</span>
        <span class="badge">${escapeHtml(rating)} · ${escapeHtml(reviews)}</span>
        ${lead.website ? '<span class="badge ok">Com site</span>' : ""}
        ${flags}
      </div>
    </article>`;
}

function renderLeadList(container, leads) {
  container.innerHTML = leads.map(leadCard).join("");
  container.querySelectorAll(".lead").forEach((element) => {
    element.addEventListener("click", () => openLead(element.dataset.leadId));
  });
}

// ===== Busca =====

async function runSearch(event) {
  event.preventDefault();
  const button = $("searchButton");
  const errorBox = $("searchError");
  errorBox.textContent = "";
  button.disabled = true;
  button.textContent = "A procurar…";

  try {
    const data = await apiRequest("/api/search", {
      method: "POST",
      body: JSON.stringify({
        segment: $("segment").value,
        region: $("region").value,
        entityFilter: $("entityFilter").value,
        weakOnly: $("weakOnly").checked,
        findEmails: $("findEmails").checked,
        maxResults: Number($("maxResults").value) || 60,
      }),
    });

    const summary = data.summary;
    $("searchSummary").classList.remove("hidden");
    $("searchSummaryText").textContent =
      `${summary.found} encontrados no Google · ${summary.matched} dentro dos filtros · ` +
      `${summary.new} novos · ${summary.existing} já existiam` +
      (summary.emailsFound ? ` · ${summary.emailsFound} emails no site do negócio` : "");

    renderLeadList($("searchResults"), data.leads);
    if (!data.leads.length) {
      $("searchResults").innerHTML =
        '<div class="empty-state">Nenhum resultado dentro destes filtros.</div>';
    }
    loadDashboard();
  } catch (error) {
    errorBox.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Procurar";
  }
}

// ===== Lista de leads =====

async function loadLeads() {
  const parameters = new URLSearchParams();
  const status = $("filterStatus").value;
  const entity = $("filterEntity").value;
  const query = $("filterQuery").value.trim();

  if (status) parameters.set("status", status);
  if (entity && entity !== "ambos") parameters.set("entityFilter", entity);
  if ($("filterWeak").checked) parameters.set("weakOnly", "1");
  if (query) parameters.set("q", query);

  try {
    const data = await apiRequest(`/api/leads?${parameters.toString()}`);
    state.leads = data.leads;
    renderLeadList($("leadsList"), data.leads);
    $("leadsEmpty").classList.toggle("hidden", data.leads.length > 0);
  } catch (error) {
    toast(error.message);
  }
}

// ===== Detalhe do lead =====

function dataRow(label, value, sourceHtml, isLink = false) {
  const empty = value === null || value === undefined || value === "";
  const rendered = empty
    ? '<span class="val empty">—</span>'
    : isLink
      ? `<span class="val"><a href="${escapeHtml(value)}" target="_blank" rel="noopener noreferrer">${escapeHtml(value)}</a></span>`
      : `<span class="val">${escapeHtml(value)}</span>`;

  return `
    <div class="data-row">
      <span class="key">${escapeHtml(label)}</span>
      ${rendered}${empty ? "" : sourceHtml || ""}
    </div>`;
}

function drawerHtml(lead) {
  const enrichmentEnabled = state.config.enrichmentEnabled;
  const flags = (lead.digitalPresenceFlags || [])
    .map((flag) => `<span class="badge warn">${escapeHtml(flag.label)}</span>`)
    .join("");

  const statusOptions = (state.config.statuses || [])
    .map(
      (status) =>
        `<option value="${status.value}" ${
          status.value === lead.status ? "selected" : ""
        }>${escapeHtml(status.label)}</option>`,
    )
    .join("");

  const lastContact = lead.lastContactAt ? lead.lastContactAt.slice(0, 10) : "";

  return `
    <div class="drawer-head">
      <div>
        <h2>${escapeHtml(lead.name)}</h2>
        <div class="lead-meta">${escapeHtml(
          ENTITY_LABELS[lead.entityType] || lead.entityType,
        )} · confiança ${escapeHtml(lead.entityTypeConfidence)}</div>
      </div>
      <button class="close-btn" id="drawerClose" aria-label="Fechar">×</button>
    </div>

    <div class="card">
      <h2>Dados e fontes</h2>
      <p class="hint">Cada campo mostra de onde veio a informação.</p>
      ${dataRow("Telefone", lead.phone, sourceTag(lead, "phone"))}
      ${dataRow("Email", lead.email, sourceTag(lead, "email"))}
      ${dataRow("Site", lead.website, sourceTag(lead, "website"), true)}
      ${dataRow("Morada", lead.address, sourceTag(lead, "address"))}
      ${dataRow(
        "Avaliações",
        lead.reviewsCount === null || lead.reviewsCount === undefined
          ? ""
          : `${lead.reviewsCount} avaliações${lead.rating ? ` · nota ${lead.rating}` : ""}`,
        sourceTag(lead, "reviews_count"),
      )}
      ${dataRow(
        "Tipo",
        ENTITY_LABELS[lead.entityType] || lead.entityType,
        sourceTag(lead, "entity_type"),
      )}
      ${dataRow("Google Maps", lead.googleMapsUrl, sourceTag(lead, "google_maps_url"), true)}
      ${dataRow(
        "Presença digital",
        `${lead.digitalPresenceScore}/100${lead.weakDigitalPresence ? " (fraca)" : ""}`,
        sourceTag(lead, "digital_presence_score"),
      )}
      <div class="badges">${flags || '<span class="badge ok">Presença digital sólida</span>'}</div>
    </div>

    <div class="card">
      <h2>Gestão do lead</h2>
      <div class="grid-2">
        <div class="field">
          <label for="leadStatus">Estado</label>
          <select id="leadStatus">${statusOptions}</select>
        </div>
        <div class="field">
          <label for="leadLastContact">Último contacto</label>
          <input id="leadLastContact" type="date" value="${lastContact}" />
        </div>
      </div>
      <div class="field">
        <label for="leadNotes">Anotações</label>
        <textarea id="leadNotes" placeholder="O que ficou combinado, objecções, próximos passos…">${escapeHtml(
          lead.notes || "",
        )}</textarea>
      </div>
      <button id="saveLeadButton" class="btn block">Guardar alterações</button>
    </div>

    <div class="card">
      <h2>Gerar abordagem</h2>
      <div class="notice">
        As mensagens são só para copiar. A aplicação nunca envia nada — o envio
        é sempre manual e feito por si.
      </div>
      <div class="field">
        <label for="outreachChannel">Canal</label>
        <select id="outreachChannel">
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
      </div>
      <div class="field">
        <label for="outreachOffer">O que está a oferecer (uma frase)</label>
        <input id="outreachOffer" type="text" placeholder="crio sites simples que aparecem no Google" />
      </div>
      <button id="generateOutreachButton" class="btn block">Gerar 3 variações</button>
      <div id="outreachError" class="error-text"></div>
      <div id="outreachResults"></div>
    </div>

    <div class="card">
      <h2>Registo comercial</h2>
      <p class="hint">
        ${
          enrichmentEnabled
            ? "Confirma a razão social e a situação de actividade no registo comercial português."
            : "Camada preparada mas desativada. Vai cruzar o nome da empresa com o registo comercial português para confirmar a razão social e a situação de actividade."
        }
      </p>
      <button id="enrichButton" class="btn secondary block" ${
        enrichmentEnabled ? "" : "disabled"
      }>
        ${enrichmentEnabled ? "Confirmar no registo comercial" : "Desativado"}
      </button>
    </div>

    <div class="card">
      <button id="deleteLeadButton" class="btn danger block">Remover lead</button>
    </div>`;
}

async function openLead(leadId) {
  try {
    const data = await apiRequest(`/api/leads/${leadId}`);
    state.currentLead = data.lead;
    state.currentVariations = [];

    $("leadDrawer").innerHTML = drawerHtml(data.lead);
    $("drawerBackdrop").classList.remove("hidden");
    $("leadDrawer").scrollTop = 0;

    $("drawerClose").addEventListener("click", closeDrawer);
    $("saveLeadButton").addEventListener("click", saveLead);
    $("generateOutreachButton").addEventListener("click", generateOutreach);
    $("deleteLeadButton").addEventListener("click", removeLead);
    $("enrichButton").addEventListener("click", enrichLead);
  } catch (error) {
    toast(error.message);
  }
}

function closeDrawer() {
  $("drawerBackdrop").classList.add("hidden");
  state.currentLead = null;
}

async function saveLead() {
  const button = $("saveLeadButton");
  button.disabled = true;

  try {
    await apiRequest(`/api/leads/${state.currentLead.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: $("leadStatus").value,
        notes: $("leadNotes").value,
        lastContactAt: $("leadLastContact").value || null,
      }),
    });
    toast("Lead actualizado.");
    await Promise.all([loadLeads(), loadDashboard()]);
  } catch (error) {
    toast(error.message);
  } finally {
    button.disabled = false;
  }
}

async function removeLead() {
  if (!window.confirm("Remover este lead definitivamente?")) return;

  try {
    await apiRequest(`/api/leads/${state.currentLead.id}`, { method: "DELETE" });
    closeDrawer();
    toast("Lead removido.");
    await Promise.all([loadLeads(), loadDashboard()]);
  } catch (error) {
    toast(error.message);
  }
}

async function enrichLead() {
  try {
    const data = await apiRequest(`/api/leads/${state.currentLead.id}/enrich`, {
      method: "POST",
    });
    toast(data.message || "Lead enriquecido.");
    openLead(state.currentLead.id);
  } catch (error) {
    toast(error.message);
  }
}

// ===== Geração de abordagem =====

function variationHtml(variation, index) {
  return `
    <div class="variation">
      <div class="variation-head">
        <span class="variation-title">Variação ${index + 1} · ${escapeHtml(
          variation.title,
        )}</span>
        <button class="btn secondary small" data-copy-index="${index}">Copiar</button>
      </div>
      ${
        variation.subject
          ? `<div class="variation-subject">Assunto: ${escapeHtml(variation.subject)}</div>`
          : ""
      }
      <div class="variation-body">${escapeHtml(variation.body)}</div>
    </div>`;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    document.body.removeChild(helper);
  }
  toast("Mensagem copiada.");
}

async function generateOutreach() {
  const button = $("generateOutreachButton");
  const errorBox = $("outreachError");
  errorBox.textContent = "";
  button.disabled = true;
  button.textContent = "A gerar…";

  try {
    const data = await apiRequest(`/api/leads/${state.currentLead.id}/outreach`, {
      method: "POST",
      body: JSON.stringify({
        channel: $("outreachChannel").value,
        offer: $("outreachOffer").value,
      }),
    });

    state.currentVariations = data.variations;
    $("outreachResults").innerHTML = data.variations.map(variationHtml).join("");
    $("outreachResults")
      .querySelectorAll("[data-copy-index]")
      .forEach((element) => {
        element.addEventListener("click", () => {
          const variation = state.currentVariations[Number(element.dataset.copyIndex)];
          const text = variation.subject
            ? `Assunto: ${variation.subject}\n\n${variation.body}`
            : variation.body;
          copyText(text);
        });
      });
  } catch (error) {
    errorBox.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Gerar 3 variações";
  }
}

// ===== Ligações de eventos =====

function debounce(callback, delay = 350) {
  let handle = null;
  return (...args) => {
    clearTimeout(handle);
    handle = setTimeout(() => callback(...args), delay);
  };
}

$("loginForm").addEventListener("submit", signIn);
$("logoutButton").addEventListener("click", logout);
$("searchForm").addEventListener("submit", runSearch);
$("filterStatus").addEventListener("change", loadLeads);
$("filterEntity").addEventListener("change", loadLeads);
$("filterWeak").addEventListener("change", loadLeads);
$("filterQuery").addEventListener("input", debounce(loadLeads));

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => switchTab(tab.dataset.tab));
});

$("drawerBackdrop").addEventListener("click", (event) => {
  if (event.target === $("drawerBackdrop")) closeDrawer();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeDrawer();
});

// Retoma a sessão guardada, se ainda for válida.
if (state.token) {
  startApp().catch(() => signOut());
}

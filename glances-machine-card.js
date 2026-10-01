/**
 * glances-machine-card.js
 * A Lovelace custom card for displaying Glances machine diagnostics.
 *
 * INSTALL:
 *   1. Copy to /config/www/glances-machine-card.js
 *   2. Settings → Dashboards → ⋮ → Resources → Add
 *      URL: /local/glances-machine-card.js   Type: JavaScript module
 *   3. Add card → search for "Glances Machine Card"
 *
 * CONFIG (easiest via the UI editor — pick a device and its sensors fill in):
 *   type: custom:glances-machine-card
 *   device_id: <registry id>     # set by the editor; empty sensors are auto-detected
 *   title: "NAS · Pi"            # optional, defaults to the device name
 *   subtitle: "OpenMediaVault"   # optional bottom-right label
 *   entity_cpu: sensor.nas_cpu_usage
 *   entity_mem: sensor.nas_memory_usage
 *   entity_disk: sensor.nas_disk_usage
 *   entity_temp: sensor.nas_cpu_thermal_0_temperature
 *   entity_net_rx: sensor.nas_eth0_rx
 *   entity_net_tx: sensor.nas_eth0_tx
 *   entity_uptime: sensor.nas_uptime
 *
 * The file has no external dependencies: the card is a plain custom element and
 * the editor hosts Home Assistant's own <ha-form>, so it also works offline.
 */

const CARD_VERSION = '1.0.0';
const REPO_URL = 'https://github.com/filipeamorimdev/home-assistant-glances-card';

const SLOTS = ['cpu', 'mem', 'disk', 'temp', 'net_rx', 'net_tx', 'uptime'];
const configKey = slot => `entity_${slot}`;

// Warning / critical levels per metric (temperature in °C).
const THRESHOLDS = {
  cpu: [70, 88],
  mem: [70, 88],
  disk: [75, 90],
  temp: [65, 80],
};

// ─── Sensor detection ────────────────────────────────────────────────────────
// Glances entities carry a stable translation_key (from the integration's
// strings.json), which identifies them whatever the host or interface is
// called. The entity-ID fallback covers other integrations and older setups.
// Every test runs on the "rest" of the ID: domain and device prefix stripped,
// e.g. "cpu_usage", "eth0_rx", "cpu_thermal_0_temperature".

const isPercent = s => s?.attributes?.unit_of_measurement === '%';

// Anchored at the end so they still work when the device prefix could not be
// stripped (e.g. renamed entity IDs).
const VIRTUAL_IFACE =
  /(^|_)(lo|docker\d*|veth.*|br_.+|virbr\d*|cni\d*|flannel.*|vnet\d*|kube.*|cali.*|zt.*|tailscale\d*|hassio|podman\d*)$/;
const PHYSICAL_IFACE = /(^|_)(eth\d+|en[a-z0-9]+|wlan\d+|wl[a-z0-9]+|bond\d+)$/;

// Prefer wired/wireless NICs, then anything else (VPN tunnels…), then
// loopback and container bridges.
function ifaceRank(rest) {
  const iface = rest.replace(/_(rx|tx)$/, '');
  if (PHYSICAL_IFACE.test(iface)) return 0;
  if (VIRTUAL_IFACE.test(iface)) return 2;
  return 1;
}

const CPU_TEMP = /cpu|core|package|tctl|tdie|k10temp|coretemp|soc|thermal/;

const DETECT = {
  cpu: {
    key: 'cpu_usage',
    fallback: (r, s) =>
      isPercent(s) && /(^|_)(cpu|processor)(_|$)/.test(r) && !/load|container|docker|gpu/.test(r),
  },
  mem: {
    key: 'memory_usage',
    fallback: (r, s) =>
      isPercent(s) && /(^|_)(memory|mem|ram)(_|$)/.test(r) && !/swap|container|docker|gpu/.test(r),
  },
  disk: {
    key: 'disk_usage',
    fallback: (r, s) => isPercent(s) && /(^|_)(disk|fs|filesystem)(_|$)/.test(r),
    // The root filesystem has no label, so it is the shortest ID; push
    // boot/firmware/snap-style mounts to the back.
    rank: r => (/boot|efi|firmware|snap|(^|_)run(_|$)|tmp|loop|overlay/.test(r) ? 1 : 0),
  },
  temp: {
    key: 'temperature',
    fallback: (r, s) => s?.attributes?.device_class === 'temperature',
    rank: r =>
      CPU_TEMP.test(r) ? 0
        : /hdd|nvme|disk|drive|gpu|nvidia|amdgpu|acpitz|wifi|pch|battery|composite/.test(r) ? 2
          : 1,
  },
  net_rx: {
    key: 'network_rx',
    fallback: r => /(^|_)(rx|received|download|network_in)$/.test(r),
    rank: ifaceRank,
  },
  net_tx: {
    key: 'network_tx',
    fallback: r => /(^|_)(tx|sent|upload|network_out)$/.test(r),
    rank: ifaceRank,
  },
  uptime: {
    key: 'uptime',
    fallback: r => /(^|_)(uptime|last_boot|boot_time)(_|$)/.test(r),
  },
};

const slugify = s =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

function detectSensors(hass, ids, prefixes = []) {
  const states = hass.states || {};
  const live = ids.filter(id => id.startsWith('sensor.') && states[id]);
  const rest = id => {
    const r = id.slice(id.indexOf('.') + 1);
    const p = prefixes.find(p => p && r.startsWith(`${p}_`));
    return p ? r.slice(p.length + 1) : r;
  };

  const result = {};
  for (const slot of SLOTS) {
    const rule = DETECT[slot];
    let pool = live.filter(id => hass.entities?.[id]?.translation_key === rule.key);
    if (!pool.length) pool = live.filter(id => rule.fallback(rest(id), states[id]));
    if (!pool.length) continue;
    const rank = rule.rank || (() => 0);
    pool.sort((a, b) => rank(rest(a)) - rank(rest(b)) || a.length - b.length || a.localeCompare(b));
    result[slot] = pool[0];
  }
  // Keep upload on the same interface as download.
  if (result.net_rx) {
    const twin = result.net_rx.replace(/_rx$/, '_tx');
    if (twin !== result.net_rx && live.includes(twin)) result.net_tx = twin;
  }
  return result;
}

function deviceName(hass, deviceId) {
  const dev = deviceId && hass?.devices?.[deviceId];
  return dev ? dev.name_by_user || dev.name || '' : '';
}

function deviceEntityIds(hass, deviceId) {
  return Object.values(hass.entities || {})
    .filter(e => e.device_id === deviceId)
    .map(e => e.entity_id);
}

function detectForDevice(hass, deviceId) {
  const dev = hass.devices?.[deviceId];
  const prefixes = [slugify(dev?.name), slugify(dev?.name_by_user)];
  return detectSensors(hass, deviceEntityIds(hass, deviceId), prefixes);
}

// Legacy `device: <name>` option: match sensor.<name>_* entity IDs.
function detectForPrefix(hass, device) {
  const prefix = slugify(device);
  const ids = Object.keys(hass.states || {}).filter(id => id.startsWith(`sensor.${prefix}_`));
  return detectSensors(hass, ids, [prefix]);
}

function glancesDevices(hass) {
  const ids = new Set(
    Object.values(hass.entities || {})
      .filter(e => e.platform === 'glances' && e.device_id)
      .map(e => e.device_id)
  );
  return [...ids]
    .map(id => ({ id, name: deviceName(hass, id) || id }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Fill every empty entity_* key from the selected device.
function fillEmptySensors(hass, config) {
  if (!config.device_id) return config;
  const found = detectForDevice(hass, config.device_id);
  const next = { ...config };
  for (const slot of SLOTS) {
    if (!next[configKey(slot)] && found[slot]) next[configKey(slot)] = found[slot];
  }
  return next;
}

const hasSetup = c =>
  !!(c.device || c.device_id || SLOTS.some(slot => c[configKey(slot)]));

// ─── Formatting ──────────────────────────────────────────────────────────────
const isAvailable = s => !!s && s.state !== 'unavailable' && s.state !== 'unknown';

const localeOf = hass => hass.locale?.language || hass.language || undefined;

function fmtNumber(v, digits, locale) {
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(v);
  } catch (e) {
    return v.toFixed(digits);
  }
}

// Split a state into display value + unit with Home Assistant's own formatter,
// so locale, display precision and unit conversion match the rest of the UI.
function formatParts(hass, s) {
  const unit = s.attributes?.unit_of_measurement || '';
  try {
    if (hass.formatEntityStateToParts) {
      const parts = hass.formatEntityStateToParts(s);
      return {
        value: parts.filter(p => p.type !== 'unit').map(p => p.value).join('').trim(),
        unit: parts.filter(p => p.type === 'unit').map(p => p.value).join('').trim(),
      };
    }
    if (hass.formatEntityState) {
      const text = hass.formatEntityState(s);
      if (unit && text.endsWith(unit)) {
        return { value: text.slice(0, -unit.length).trim(), unit };
      }
      return { value: text, unit: '' };
    }
  } catch (e) {
    // Fall through to the raw state.
  }
  return { value: s.state, unit };
}

const joinUnit = ({ value, unit }) =>
  !unit ? value : unit === '%' || unit.startsWith('°') ? `${value}${unit}` : `${value} ${unit}`;

// Network throughput. HA already converts Glances' B/s to the unit the user
// picked (Mbit/s by default); only raw byte units get scaled up here.
function fmtNet(hass, s) {
  const unit = s.attributes?.unit_of_measurement || '';
  const n = parseFloat(s.state);
  if (Number.isFinite(n) && /^(B|[Bb]ytes?)(\/s)?$/.test(unit)) {
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    let v = n;
    let i = 0;
    while (Math.abs(v) >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    const digits = v >= 100 || i === 0 ? 0 : 1;
    return `${fmtNumber(v, digits, localeOf(hass))} ${units[i]}${/\/s$/i.test(unit) ? '/s' : ''}`;
  }
  return joinUnit(formatParts(hass, s));
}

// Temperature in °C for the thresholds, whatever unit HA displays it in.
function tempCelsius(s) {
  const n = parseFloat(s.state);
  const unit = s.attributes?.unit_of_measurement;
  if (unit === '°F') return ((n - 32) * 5) / 9;
  if (unit === 'K') return n - 273.15;
  return n;
}

// Seconds since boot. Glances' uptime sensor is a timestamp (the boot time);
// other integrations report a duration, converted using its unit.
const DURATION_UNITS = { ms: 0.001, s: 1, min: 60, h: 3600, d: 86400 };

function uptimeSeconds(s) {
  if (!isAvailable(s)) return null;
  const { state, attributes = {} } = s;
  const n = Number(state);
  if (attributes.device_class !== 'timestamp' && state !== '' && Number.isFinite(n)) {
    return n * (DURATION_UNITS[attributes.unit_of_measurement] ?? 1);
  }
  const booted = Date.parse(state);
  return Number.isNaN(booted) ? null : Math.max(0, (Date.now() - booted) / 1000);
}

function fmtDuration(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const level = (v, [warn, crit]) =>
  !Number.isFinite(v) ? '' : v >= crit ? 'crit' : v >= warn ? 'warn' : 'ok';

function setLevel(el, lvl) {
  el.classList.remove('ok', 'warn', 'crit');
  if (lvl) el.classList.add(lvl);
}

// Make an element open the entity's more-info dialog (or stop doing so).
function setEntity(el, entityId) {
  if (entityId) {
    el.dataset.entity = entityId;
    el.setAttribute('role', 'button');
    el.tabIndex = 0;
  } else {
    delete el.dataset.entity;
    el.removeAttribute('role');
    el.removeAttribute('tabindex');
  }
}

// ─── Card ────────────────────────────────────────────────────────────────────
const CARD_STYLES = `
  :host {
    display: block;
    --gm-ok: var(--success-color, #1d9e75);
    --gm-warn: var(--warning-color, #ba7517);
    --gm-crit: var(--error-color, #a32d2d);
    --gm-mono: var(--ha-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  }
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  ha-card { height: 100%; }
  .content { padding: 14px 16px; }

  .ok { --gm-color: var(--gm-ok); }
  .warn { --gm-color: var(--gm-warn); }
  .crit { --gm-color: var(--gm-crit); }

  [data-entity] { cursor: pointer; }
  [data-entity]:focus-visible {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: 1px;
  }

  /* ── Header ── */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }
  .title {
    font-size: 13px;
    font-weight: 500;
    color: var(--primary-text-color);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pill {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    font-family: var(--gm-mono);
    font-size: 10px;
    padding: 2px 7px;
    border-radius: 4px;
    color: var(--gm-color, var(--gm-ok));
    white-space: nowrap;
    --mdc-icon-size: 11px;
  }
  .pill::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: currentColor;
    opacity: 0.15;
    pointer-events: none;
  }

  /* ── Metric tiles ── */
  .metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .metric {
    background: var(--secondary-background-color, rgba(127, 127, 127, 0.08));
    border-radius: 6px;
    padding: 7px 9px;
    min-width: 0;
  }
  .metric.full { grid-column: 1 / -1; }
  .metric.unavailable .metric-val { opacity: 0.5; }
  .metric-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    opacity: 0.6;
    margin-bottom: 3px;
    color: var(--secondary-text-color);
  }
  .metric-line {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .metric-val {
    font-family: var(--gm-mono);
    font-size: 16px;
    font-weight: 500;
    color: var(--primary-text-color);
  }
  .metric-unit {
    margin-left: 2px;
    font-family: var(--gm-mono);
    font-size: 9px;
    opacity: 0.6;
    color: var(--primary-text-color);
  }
  .bar {
    margin-top: 4px;
    height: 2px;
    background: var(--divider-color, rgba(127, 127, 127, 0.2));
    border-radius: 2px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    width: 0;
    border-radius: 2px;
    background: var(--gm-color, transparent);
    transition: width 0.6s ease, background-color 0.6s ease;
  }

  /* ── Temps ── */
  .temps {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    margin-top: 7px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: var(--gm-mono);
    font-size: 10px;
    padding: 2px 7px;
    border-radius: 4px;
    border: 0.5px solid var(--divider-color, rgba(127, 127, 127, 0.2));
    background: var(--secondary-background-color, rgba(127, 127, 127, 0.08));
    color: var(--primary-text-color);
  }
  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--gm-color, var(--disabled-text-color, #888));
  }

  /* ── Footer / net ── */
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 8px;
    margin-top: 7px;
  }
  .net {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-family: var(--gm-mono);
    font-size: 10px;
    color: var(--secondary-text-color);
  }
  .subtitle {
    margin-left: auto;
    font-size: 10px;
    font-family: var(--gm-mono);
    color: var(--secondary-text-color);
    opacity: 0.8;
  }

  /* ── Setup hint ── */
  .hint-title {
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 6px;
    color: var(--primary-text-color);
  }
  .hint-body {
    font-size: 12px;
    line-height: 1.4;
    color: var(--secondary-text-color);
  }
`;

const metricTile = (slot, label, full = false) => `
  <div class="metric${full ? ' full' : ''}" data-slot="${slot}">
    <div class="metric-label">${label}</div>
    <div class="metric-line"><span class="metric-val">—</span><span class="metric-unit"></span></div>
    <div class="bar" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100">
      <div class="bar-fill"></div>
    </div>
  </div>`;

class GlancesMachineCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const activate = ev => this._activate(ev);
    this.shadowRoot.addEventListener('click', activate);
    this.shadowRoot.addEventListener('keydown', activate);
  }

  setConfig(config) {
    // Always accept the config. Incomplete setups render an in-card hint so the
    // editor preview is never stuck on a "Configuration error".
    this._config = { ...(config || {}) };
    this._resolved = null;
    this._last = null;
    this._update();
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    // Uptime is derived from the boot timestamp, so it has to tick on its own.
    this._timer = setInterval(() => {
      if (this._mode === 'card' && this._ids) this._renderUptime();
    }, 30000);
  }

  disconnectedCallback() {
    clearInterval(this._timer);
    this._timer = null;
  }

  getCardSize() { return 4; }

  getGridOptions() {
    return { columns: 6, min_columns: 4 };
  }

  // Explicit entity_* keys win; empty slots are detected from device_id (or
  // the legacy `device` prefix). Cached until the config or registry changes.
  _resolve() {
    const c = this._config;
    const hass = this._hass;
    // Auto-detected sensors without a state yet (registry updated before the
    // states arrived) must be detected again, so they invalidate the cache.
    if (
      this._resolved && this._resolvedFor === hass.entities &&
      this._autoIds.every(id => hass.states[id])
    ) {
      return this._resolved;
    }

    let auto = {};
    if (SLOTS.some(slot => !c[configKey(slot)])) {
      if (c.device_id) auto = detectForDevice(hass, c.device_id);
      else if (c.device) auto = detectForPrefix(hass, c.device);
    }
    const resolved = {};
    for (const slot of SLOTS) resolved[slot] = c[configKey(slot)] || auto[slot] || null;

    this._resolved = resolved;
    this._autoIds = SLOTS.filter(slot => !c[configKey(slot)]).map(slot => resolved[slot]).filter(Boolean);
    this._resolvedFor = hass.entities;
    return resolved;
  }

  _update() {
    const hass = this._hass;
    const c = this._config;
    if (!hass || !c) return;

    if (!hasSetup(c)) {
      this._renderHint();
      return;
    }
    this._ensureCard();

    const ids = this._resolve();
    const title = c.title || deviceName(hass, c.device_id) || c.device || 'Machine';

    // Only touch the DOM when something this card shows actually changed —
    // hass is replaced on every state change anywhere in Home Assistant.
    const sig = [
      title, c.subtitle || '', hass.locale, hass.entities,
      ...SLOTS.map(slot => ids[slot]),
      ...SLOTS.map(slot => ids[slot] && hass.states[ids[slot]]),
    ];
    if (this._last && sig.every((v, i) => v === this._last[i])) return;
    this._last = sig;
    this._ids = ids;

    this._$.title.textContent = title;
    this._$.title.title = title;
    this._$.subtitle.textContent = c.subtitle || '';
    this._$.subtitle.hidden = !c.subtitle;

    this._renderMetric('cpu');
    this._renderMetric('mem');
    this._renderMetric('disk');
    this._renderTemp();
    this._renderNet('net_rx', '↓');
    this._renderNet('net_tx', '↑');
    this._$.footer.hidden = this._$.net_rx.hidden && this._$.net_tx.hidden && !c.subtitle;
    this._renderUptime();
  }

  _renderHint() {
    if (this._mode === 'hint') return;
    this._mode = 'hint';
    this._last = null;
    this.shadowRoot.innerHTML = `
      <style>${CARD_STYLES}</style>
      <ha-card>
        <div class="content">
          <div class="hint-title">Glances Machine Card</div>
          <div class="hint-body">Pick a Glances device or set at least one sensor in the editor.</div>
        </div>
      </ha-card>
    `;
  }

  _ensureCard() {
    if (this._mode === 'card') return;
    this._mode = 'card';
    this._last = null;
    this.shadowRoot.innerHTML = `
      <style>${CARD_STYLES}</style>
      <ha-card>
        <div class="content">
          <div class="header">
            <div class="title"></div>
            <div class="pill" hidden><ha-icon icon="mdi:timer-outline"></ha-icon><span class="pill-text"></span></div>
          </div>
          <div class="metrics">
            ${metricTile('cpu', 'CPU')}
            ${metricTile('mem', 'RAM')}
            ${metricTile('disk', 'Disk', true)}
          </div>
          <div class="temps" hidden>
            <div class="chip"><span class="dot"></span><span class="chip-text"></span></div>
          </div>
          <div class="footer">
            <div class="net">
              <span data-slot="net_rx" hidden></span>
              <span data-slot="net_tx" hidden></span>
            </div>
            <div class="subtitle" hidden></div>
          </div>
        </div>
      </ha-card>
    `;
    const $ = sel => this.shadowRoot.querySelector(sel);
    const tile = slot => {
      const el = $(`.metric[data-slot="${slot}"]`);
      return {
        el,
        val: el.querySelector('.metric-val'),
        unit: el.querySelector('.metric-unit'),
        bar: el.querySelector('.bar'),
        fill: el.querySelector('.bar-fill'),
      };
    };
    this._$ = {
      title: $('.title'),
      subtitle: $('.subtitle'),
      footer: $('.footer'),
      pill: $('.pill'),
      pillIcon: $('.pill ha-icon'),
      pillText: $('.pill-text'),
      cpu: tile('cpu'),
      mem: tile('mem'),
      disk: tile('disk'),
      temps: $('.temps'),
      chip: $('.chip'),
      dot: $('.dot'),
      chipText: $('.chip-text'),
      net_rx: $('[data-slot="net_rx"]'),
      net_tx: $('[data-slot="net_tx"]'),
    };
  }

  _stateOf(slot) {
    const id = this._ids[slot];
    return id ? this._hass.states[id] : undefined;
  }

  _renderMetric(slot) {
    const t = this._$[slot];
    const s = this._stateOf(slot);
    setEntity(t.el, s && s.entity_id);
    t.el.classList.toggle('unavailable', !!s && !isAvailable(s));

    if (!isAvailable(s)) {
      t.val.textContent = '—';
      t.unit.textContent = '';
      t.bar.hidden = false;
      t.fill.style.width = '0%';
      t.bar.removeAttribute('aria-valuenow');
      setLevel(t.fill, '');
      t.el.title = s ? 'Unavailable' : this._ids[slot] ? `${this._ids[slot]} not found` : 'No sensor set';
      return;
    }

    const { value, unit } = formatParts(this._hass, s);
    t.val.textContent = value;
    t.unit.textContent = unit;
    t.el.removeAttribute('title');

    // Bars only make sense for percentages.
    const pct = isPercent(s);
    t.bar.hidden = !pct;
    if (pct) {
      const n = parseFloat(s.state);
      const width = Math.min(100, Math.max(0, n || 0));
      t.fill.style.width = `${width}%`;
      t.bar.setAttribute('aria-valuenow', String(Math.round(width)));
      setLevel(t.fill, level(n, THRESHOLDS[slot]));
    }
  }

  _renderTemp() {
    const s = this._stateOf('temp');
    this._$.temps.hidden = !this._ids.temp;
    setEntity(this._$.chip, s && s.entity_id);
    // The sensor may be a disk or GPU one, so only call it "CPU" when it is.
    const label = CPU_TEMP.test(this._ids.temp || '') ? 'CPU' : 'Temp';
    if (!isAvailable(s)) {
      this._$.chipText.textContent = `${label} —`;
      setLevel(this._$.dot, '');
      return;
    }
    this._$.chipText.textContent = `${label} ${joinUnit(formatParts(this._hass, s))}`;
    setLevel(this._$.dot, level(tempCelsius(s), THRESHOLDS.temp));
  }

  _renderNet(slot, arrow) {
    const el = this._$[slot];
    const s = this._stateOf(slot);
    el.hidden = !this._ids[slot];
    setEntity(el, s && s.entity_id);
    el.textContent = `${arrow} ${isAvailable(s) ? fmtNet(this._hass, s) : '—'}`;
  }

  _renderUptime() {
    const { pill, pillIcon, pillText } = this._$;
    const states = SLOTS.filter(slot => this._ids[slot]).map(slot => this._stateOf(slot));

    // Every sensor unavailable → the Glances host is unreachable.
    const offline = states.some(Boolean) && states.every(s => !s || s.state === 'unavailable');
    if (offline) {
      pill.hidden = false;
      setLevel(pill, 'crit');
      pillIcon.setAttribute('icon', 'mdi:lan-disconnect');
      pillText.textContent = 'offline';
      pill.title = 'All sensors are unavailable';
      setEntity(pill, null);
      return;
    }

    const s = this._stateOf('uptime');
    pill.hidden = !this._ids.uptime;
    setLevel(pill, 'ok');
    pillIcon.setAttribute('icon', 'mdi:timer-outline');
    const seconds = uptimeSeconds(s);
    pillText.textContent = seconds == null ? '—' : fmtDuration(seconds);
    pill.title = 'Uptime';
    setEntity(pill, s && s.entity_id);
  }

  _activate(ev) {
    if (ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ') return;
    const el = ev.target.closest?.('[data-entity]');
    if (!el) return;
    if (ev.type === 'keydown') ev.preventDefault();
    this.dispatchEvent(new CustomEvent('hass-more-info', {
      detail: { entityId: el.dataset.entity },
      bubbles: true,
      composed: true,
    }));
  }

  // ─── UI Editor ────────────────────────────────────────────────────────────
  static getConfigElement() {
    return document.createElement('glances-machine-card-editor');
  }

  static getStubConfig(hass) {
    // Pre-select the first Glances device so the card picker shows a live
    // preview; with none, the card renders its setup hint.
    const first = hass ? glancesDevices(hass)[0] : undefined;
    return first ? fillEmptySensors(hass, { device_id: first.id }) : {};
  }
}

// ─── Editor ──────────────────────────────────────────────────────────────────
// Hosts Home Assistant's <ha-form> with selectors — the documented way to build
// card editors — instead of internal widgets that change between releases.

const FIELD_LABELS = {
  entity_cpu: 'CPU',
  entity_mem: 'Memory',
  entity_disk: 'Disk',
  entity_temp: 'Temperature',
  entity_net_rx: 'Network ↓ (RX)',
  entity_net_tx: 'Network ↑ (TX)',
  entity_uptime: 'Uptime',
};
const FIELDS = Object.keys(FIELD_LABELS);

const EDITOR_LABELS = {
  title: 'Title',
  subtitle: 'Subtitle (bottom-right)',
  device_id: 'Glances device',
  ...FIELD_LABELS,
};

const EDITOR_HELPERS = {
  title: 'Defaults to the device name.',
  device_id: 'Picking a device fills in its sensors. Sensors left empty are detected automatically.',
};

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise(resolve => setTimeout(resolve, ms))]);

// Home Assistant lazy-loads <ha-form>. Loading a built-in card editor (the
// tile card's) is the standard way for a custom card to make it available.
let haFormReady;
function loadHaForm() {
  if (customElements.get('ha-form')) return Promise.resolve(true);
  haFormReady ??= (async () => {
    try {
      const helpers = await window.loadCardHelpers?.();
      if (helpers) {
        helpers.createCardElement({ type: 'tile', entity: 'sun.sun' });
        const tile = await withTimeout(customElements.whenDefined('hui-tile-card'), 10000);
        await tile?.getConfigElement?.();
      }
    } catch (e) {
      console.debug('glances-machine-card: could not preload ha-form', e);
    }
    return !!(await withTimeout(customElements.whenDefined('ha-form'), 3000));
  })().then(ok => {
    if (!ok) haFormReady = undefined; // let the next editor open try again
    return ok;
  });
  return haFormReady;
}

// Drop empty values so the YAML stays clean.
function cleanConfig(config) {
  const next = {};
  for (const [k, v] of Object.entries(config)) {
    if (v !== '' && v != null) next[k] = v;
  }
  return next;
}

const EDITOR_STYLES = `
  .editor { display: flex; flex-direction: column; gap: 8px; }
  .status {
    font-size: 14px;
    color: var(--secondary-text-color);
    padding: 8px 0;
  }
  .autofill {
    align-self: flex-start;
    background: none;
    border: none;
    border-radius: 8px;
    padding: 8px 12px;
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    color: var(--primary-color);
    cursor: pointer;
  }
  .autofill:hover:not(:disabled) {
    background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.08);
  }
  .autofill:disabled {
    color: var(--disabled-text-color);
    cursor: default;
  }
`;

class GlancesMachineCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._formState = 'loading';
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    if (this._formState !== 'loading' || this._loading) return;
    this._loading = loadHaForm().then(ok => {
      this._formState = ok ? 'ready' : 'failed';
      this._render();
    });
  }

  _render() {
    if (!this._hass || !this._config) return;

    if (this._formState !== 'ready') {
      if (this._shown === this._formState) return;
      this._shown = this._formState;
      this._form = null;
      this.shadowRoot.innerHTML = `<style>${EDITOR_STYLES}</style><div class="status"></div>`;
      this.shadowRoot.querySelector('.status').textContent = this._formState === 'loading'
        ? 'Loading editor…'
        : 'The visual editor could not load Home Assistant\'s form components. Use "Show code editor" instead.';
      return;
    }

    if (!this._form) {
      this._shown = 'ready';
      this.shadowRoot.innerHTML = `
        <style>${EDITOR_STYLES}</style>
        <div class="editor">
          <ha-form></ha-form>
          <button class="autofill" type="button">⚡ Auto-fill empty sensors from device</button>
        </div>
      `;
      this._form = this.shadowRoot.querySelector('ha-form');
      this._form.computeLabel = schema => EDITOR_LABELS[schema.name];
      this._form.computeHelper = schema => EDITOR_HELPERS[schema.name];
      this._form.addEventListener('value-changed', ev => this._valueChanged(ev));
      this._autofill = this.shadowRoot.querySelector('.autofill');
      this._autofill.addEventListener('click', () => this._commit(fillEmptySensors(this._hass, this._config)));
    }

    this._form.hass = this._hass;
    this._form.data = this._config;
    this._form.schema = this._schema();
    this._autofill.disabled = !this._config.device_id;
  }

  // Sensor pickers are limited to the selected device's sensors (plus any
  // sensor already chosen, so it keeps displaying).
  _schema() {
    const c = this._config;
    const hass = this._hass;
    const memoKey = [c.device_id, ...FIELDS.map(k => c[k])].join('|');
    if (this._schemaCache && this._schemaKey === memoKey && this._schemaFor === hass.entities) {
      return this._schemaCache;
    }

    const deviceSensors = c.device_id
      ? deviceEntityIds(hass, c.device_id).filter(id => id.startsWith('sensor.'))
      : [];
    const sensorSelector = deviceSensors.length
      ? { entity: { include_entities: [...new Set([...deviceSensors, ...FIELDS.map(k => c[k]).filter(Boolean)])] } }
      : { entity: { filter: { domain: 'sensor' } } };

    this._schemaCache = [
      {
        type: 'grid',
        name: '',
        schema: [
          { name: 'title', selector: { text: {} } },
          { name: 'subtitle', selector: { text: {} } },
        ],
      },
      { name: 'device_id', selector: { device: { filter: { integration: 'glances' } } } },
      {
        type: 'expandable',
        name: '',
        flatten: true,
        expanded: true,
        title: 'Sensors',
        schema: FIELDS.map(name => ({ name, selector: sensorSelector })),
      },
    ];
    this._schemaKey = memoKey;
    this._schemaFor = hass.entities;
    return this._schemaCache;
  }

  _valueChanged(ev) {
    ev.stopPropagation();
    let next = cleanConfig(ev.detail.value);
    if (next.device_id && next.device_id !== this._config.device_id) {
      // New machine: drop sensors that belong to another device (usually the
      // previous one), then fill the empty slots from the new device.
      for (const key of FIELDS) {
        const owner = this._hass.entities?.[next[key]]?.device_id;
        if (owner && owner !== next.device_id) delete next[key];
      }
      next = fillEmptySensors(this._hass, next);
    }
    this._commit(next);
  }

  _commit(config) {
    this._config = config;
    this._render();
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config },
      bubbles: true,
      composed: true,
    }));
  }
}

// ─── Register ────────────────────────────────────────────────────────────────
// Guarded so loading the resource twice (e.g. with a cache-busting query
// string) does not throw "already defined".
if (!customElements.get('glances-machine-card')) {
  customElements.define('glances-machine-card', GlancesMachineCard);
  customElements.define('glances-machine-card-editor', GlancesMachineCardEditor);

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: 'glances-machine-card',
    name: 'Glances Machine Card',
    description: 'Diagnostic card for a machine monitored by Glances. Pick a device and its sensors right in the editor.',
    preview: true,
    documentationURL: REPO_URL,
  });

  console.info(
    `%c GLANCES-MACHINE-CARD %c v${CARD_VERSION} `,
    'background:#1D9E75;color:#fff;padding:2px 6px;border-radius:4px 0 0 4px;font-weight:600',
    'background:#333;color:#fff;padding:2px 6px;border-radius:0 4px 4px 0'
  );
}

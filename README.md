# Home Assistant Glances Machine Card

**English** · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Português](README.pt.md)

A compact, good-looking [Lovelace](https://www.home-assistant.io/dashboards/) card for Home Assistant that shows the vitals of any machine monitored by the [Glances integration](https://www.home-assistant.io/integrations/glances/) — CPU, RAM, disk, temperature, network, and uptime — at a glance.

Point it at a device and it figures out the rest. No YAML wrangling, no hunting for entity IDs.

> **Built on the official integration.** This card reads the entities created by Home Assistant's official [Glances integration](https://www.home-assistant.io/integrations/glances) — no extra add-on or custom integration is needed. Set that integration up first.

![Glances Machine Card showing CPU, RAM, disk, temperature, network, and uptime for a PiVPN host](docs/preview.png)

### Screenshots

**Card picker** — how the card appears when adding it to a dashboard:

![Glances Machine Card in the Home Assistant card picker, with title and short description](docs/card-picker.png)

*Card picker entry: “Glances Machine Card” — a diagnostic card for a machine monitored by Glances. Pick a device and its sensors right in the editor.*

**Visual editor** — pick a Glances device and its sensors fill in automatically:

![Glances Machine Card configuration dialog with device picker, sensor fields, and live preview](docs/card-configuration.png)

---

## Features

- **Device picker** — the visual editor lists your Glances devices by their Home Assistant name. Just pick one from a dropdown.
- **Automatic sensor detection** — picking a device fills in CPU, RAM, disk, temperature, network, and uptime. Glances sensors are recognised by the integration's own sensor keys, not by guessing from names, so it picks CPU *usage* (not load average), your real network card (not loopback or Docker bridges), and the root filesystem.
- **Scoped entity pickers** — each sensor field is a native Home Assistant entity picker limited to the selected device's sensors.
- **Full UI editor** — no YAML required. Built on Home Assistant's standard form components, with no external downloads, so it also works on offline installs.
- **Smart bars & colors** — CPU, RAM, and disk render as thin progress bars that turn amber then red as they approach their limits, using your theme's success / warning / error colors.
- **Temperature chip** — a colored dot flags when your CPU is running hot, in °C or °F.
- **Network throughput** — download/upload use the unit you chose for the sensor in Home Assistant (Mbit/s by default); raw byte units are scaled to readable `KiB` / `MiB` / `GiB`.
- **Uptime badge** — time since boot as a tidy pill in the header. It turns into an **offline** badge when the machine stops responding.
- **Tap for details** — click any metric to open Home Assistant's more-info dialog with its history.
- **Theme-aware** — uses your Home Assistant theme variables, so it looks at home in light or dark mode, and sizes itself sensibly in the sections view.

---

## Installation

1. Download [`glances-machine-card.js`](glances-machine-card.js).
2. Copy it to your Home Assistant config folder under `www/`:

   ```
   /config/www/glances-machine-card.js
   ```

3. Go to **Settings → Dashboards → ⋮ → Resources → Add Resource** and enter:

   - **URL:** `/local/glances-machine-card.js`
   - **Resource type:** `JavaScript module`

4. Reload your browser (hard-refresh to clear the cache).

When you update the file later, hard-refresh again (or add a version suffix to the resource URL, e.g. `/local/glances-machine-card.js?v=2`).

---

## Setup

You need the **[Glances integration](https://www.home-assistant.io/integrations/glances/)** configured and reporting sensors for at least one machine. Glances itself runs on each machine you want to monitor (a Raspberry Pi, NAS, server, etc.).

Once that's in place:

1. Edit a dashboard → **Add Card** → search for **Glances Machine Card**.
2. In the editor, pick your machine in the **Glances device** dropdown. Its sensors are filled in automatically.
3. Adjust any sensor if you like — each picker is limited to the selected device's sensors. **⚡ Auto-fill empty sensors from device** fills any slot you've cleared.
4. Set a **Title** (and an optional **Subtitle**), and you're done.

---

## Configuration

All options are editable through the visual editor, but here's the YAML if you prefer it:

```yaml
type: custom:glances-machine-card
device_id: 5c1f0e…                      # Set by the editor
title: "NAS · Pi"                       # Header label (optional)
subtitle: "OpenMediaVault"              # Small bottom-right label (optional)
entity_cpu: sensor.nas_cpu_usage
entity_mem: sensor.nas_memory_usage
entity_disk: sensor.nas_disk_usage
entity_temp: sensor.nas_cpu_thermal_0_temperature
entity_net_rx: sensor.nas_eth0_rx
entity_net_tx: sensor.nas_eth0_tx
entity_uptime: sensor.nas_uptime
```

Glances names its sensors after the host you configured, so a machine added as `10.0.0.99` has sensors like `sensor.10_0_0_99_cpu_usage`.

### Options

| Option           | Required | Description                                                          |
| ---------------- | :------: | ------------------------------------------------------------------- |
| `type`           |   yes    | Must be `custom:glances-machine-card`.                              |
| `device_id`      |   no     | Registry ID of the Glances device. Set by the editor; scopes the entity pickers. Any sensor left empty is detected from this device. |
| `title`          |    no    | Title shown in the header. Defaults to the device name.            |
| `subtitle`       |    no    | Small muted label in the bottom-right corner.                      |
| `entity_cpu`     |   yes\*  | CPU usage sensor.                                                   |
| `entity_mem`     |   yes\*  | Memory usage sensor.                                                |
| `entity_disk`    |   yes\*  | Disk usage sensor.                                                  |
| `entity_temp`    |    no    | CPU temperature sensor.                                             |
| `entity_net_rx`  |    no    | Network download (RX) sensor.                                       |
| `entity_net_tx`  |    no    | Network upload (TX) sensor.                                         |
| `entity_uptime`  |    no    | Uptime / last-boot sensor.                                          |
| `device`         |    no    | Legacy: entity-ID prefix (e.g. `nas`) used to detect sensors when no `device_id` is set. |

\* You need at least one `entity_*` **or** a `device_id`. A card with only `device_id: …` works: every sensor is detected
from that device. A sensor that isn't set and can't be detected simply shows a dash. Temperature, network, and uptime are
hidden when there is no sensor for them.

---

## How it works

### The device dropdown

The editor uses Home Assistant's own device picker, filtered to the **Glances** integration, and lists each device by the name you gave it in Home Assistant. Renames show up immediately.

### Scoped entity pickers

Each sensor field is Home Assistant's native entity picker, restricted to the sensors of the device you selected. So you only ever see that machine's sensors, with full search and autocomplete.

### Sensor detection

The Glances integration gives every sensor a fixed internal key — `cpu_usage`, `memory_usage`, `disk_usage`, `temperature`, `network_rx` / `network_tx`, and `uptime`. The card matches on those keys, so detection works however your host or entities are named. When several sensors qualify it prefers:

- the **root filesystem** over `/boot`, firmware, and snap mounts;
- a **CPU** temperature (`cpu_thermal`, `Core`, `Package`, …) over disk or GPU temperatures;
- a **physical network interface** (`eth*`, `en*`, `wlan*`) over loopback, Docker, and virtual bridges — and upload always uses the same interface as download.

For sensors from other integrations, it falls back to entity IDs and units (only `%` sensors qualify for the CPU, RAM, and disk bars).

Changing the device in the editor replaces the previous machine's sensors with the new one's. **⚡ Auto-fill** only fills empty slots, so you can fine-tune anything and keep your choices.

### Colors and thresholds

Bars and the temperature dot change color based on load, so problems jump out:

| Metric        | 🟢 Healthy | 🟠 Warning | 🔴 Critical |
| ------------- | :--------: | :--------: | :---------: |
| CPU / RAM     |  < 70 %    |  70–88 %   |   ≥ 88 %    |
| Disk          |  < 75 %    |  75–90 %   |   ≥ 90 %    |
| CPU temp      |  < 65 °C   |  65–80 °C  |   ≥ 80 °C   |

Temperatures reported in °F are converted before comparing. Bars are only drawn for percentage sensors; if you pick a sensor with another unit (e.g. memory in MiB), the value is shown with its unit and no bar.

### Network units

Glances reports throughput in bytes per second, and Home Assistant converts it to the unit set in the sensor's settings (Mbit/s by default). The card shows that formatted value. If a sensor reports a raw byte unit (`B`, `B/s`), it's scaled to a readable `KiB` / `MiB` / `GiB`, keeping the `/s` suffix.

---

## Troubleshooting

**The card says "Custom element doesn't exist."**
The resource isn't loaded. Re-check the resource URL and type, then hard-refresh your browser (the file is often cached).

**The device dropdown is empty.**
Make sure the Glances integration is set up and has created at least one device.

**Some metrics show a dash (`—`).**
That sensor isn't set, couldn't be detected, or is unavailable — hover the tile to see which. Pick the matching entity in the editor (or run Auto-fill).

**The header shows "offline".**
Every sensor on the card is unavailable, which usually means Home Assistant can't reach Glances on that machine. Check that Glances is running in web server mode (`glances -w`) and that the integration is connected.

**The editor says it couldn't load.**
Use **Show code editor** in the card dialog to edit the YAML directly, and please open an issue with your Home Assistant version.

---

## Contributing

Issues and pull requests are welcome — extra sensor name patterns, layout tweaks, and theme fixes especially.

## License

Released under the [MIT License](LICENSE).

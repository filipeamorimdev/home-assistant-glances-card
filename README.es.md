# Home Assistant Glances Machine Card

[English](README.md) · **Español** · [Français](README.fr.md) · [Deutsch](README.de.md) · [Português](README.pt.md)

Una tarjeta [Lovelace](https://www.home-assistant.io/dashboards/) compacta y atractiva para Home Assistant que muestra de un vistazo las constantes vitales de cualquier máquina monitorizada por la [integración Glances](https://www.home-assistant.io/integrations/glances/): CPU, RAM, disco, temperatura, red y tiempo de actividad.

Apúntala a un dispositivo y se encarga del resto. Sin pelearte con YAML ni buscar IDs de entidades.

> **Basada en la integración oficial.** Esta tarjeta lee las entidades creadas por la [integración oficial de Glances](https://www.home-assistant.io/integrations/glances) de Home Assistant; no necesitas ningún complemento ni integración personalizada adicional. Configura primero esa integración.

![Glances Machine Card mostrando CPU, RAM, disco, temperatura, red y tiempo de actividad de un host PiVPN](docs/preview.png)

### Capturas de pantalla

**Selector de tarjetas** — así aparece la tarjeta al añadirla a un panel:

![Glances Machine Card en el selector de tarjetas de Home Assistant, con título y descripción breve](docs/card-picker.png)

*Entrada del selector: «Glances Machine Card» — una tarjeta de diagnóstico para una máquina monitorizada por Glances. Elige el dispositivo y sus sensores en el editor.*

**Editor visual** — elige un dispositivo Glances y sus sensores se rellenan solos:

![Diálogo de configuración de Glances Machine Card con selector de dispositivo, campos de sensores y vista previa en vivo](docs/card-configuration.png)

---

## Características

- **Selector de dispositivos** — el editor visual lista tus dispositivos Glances por su nombre en Home Assistant. Solo elige uno en un desplegable.
- **Detección automática de sensores** — al elegir un dispositivo se rellenan CPU, RAM, disco, temperatura, red y tiempo de actividad. Los sensores de Glances se reconocen por las claves internas de la propia integración, no adivinando por el nombre, así que elige el *uso* de CPU (no la carga media), tu tarjeta de red real (no loopback ni puentes de Docker) y el sistema de archivos raíz.
- **Selectores de entidades acotados** — cada campo de sensor es un selector de entidades nativo de Home Assistant limitado a los sensores del dispositivo seleccionado.
- **Editor de interfaz completo** — sin necesidad de YAML. Usa los componentes de formulario estándar de Home Assistant, sin descargas externas, así que también funciona en instalaciones sin conexión.
- **Barras y colores inteligentes** — CPU, RAM y disco se muestran como barras de progreso finas que se vuelven ámbar y luego rojas a medida que se acercan a sus límites, con los colores de éxito / aviso / error de tu tema.
- **Indicador de temperatura** — un punto de color avisa cuando tu CPU se está calentando, en °C o °F.
- **Rendimiento de red** — la descarga/subida usa la unidad que elegiste para el sensor en Home Assistant (Mbit/s por defecto); las unidades de bytes en bruto se escalan a `KiB` / `MiB` / `GiB` legibles.
- **Distintivo de tiempo de actividad** — el tiempo desde el arranque, como una píldora ordenada en la cabecera. Se convierte en un distintivo **offline** cuando la máquina deja de responder.
- **Toca para ver detalles** — haz clic en cualquier métrica para abrir el diálogo de información de Home Assistant con su historial.
- **Compatible con temas** — usa las variables de tema de tu Home Assistant, así que encaja igual de bien en modo claro u oscuro, y se dimensiona correctamente en la vista de secciones.

---

## Instalación

1. Descarga [`glances-machine-card.js`](glances-machine-card.js).
2. Cópialo en la carpeta de configuración de tu Home Assistant, dentro de `www/`:

   ```
   /config/www/glances-machine-card.js
   ```

3. Ve a **Ajustes → Paneles → ⋮ → Recursos → Añadir recurso** e introduce:

   - **URL:** `/local/glances-machine-card.js`
   - **Tipo de recurso:** `Módulo JavaScript`

4. Recarga tu navegador (recarga forzada para limpiar la caché).

Cuando actualices el archivo, vuelve a forzar la recarga (o añade un sufijo de versión a la URL del recurso, p. ej. `/local/glances-machine-card.js?v=2`).

---

## Configuración inicial

Necesitas la **[integración Glances](https://www.home-assistant.io/integrations/glances/)** configurada y reportando sensores de al menos una máquina. Glances se ejecuta en cada máquina que quieras monitorizar (una Raspberry Pi, un NAS, un servidor, etc.).

Una vez esté listo:

1. Edita un panel → **Añadir tarjeta** → busca **Glances Machine Card**.
2. En el editor, elige tu máquina en el desplegable **Glances device**. Sus sensores se rellenan automáticamente.
3. Ajusta cualquier sensor si quieres: cada selector está limitado a los sensores del dispositivo seleccionado. **⚡ Auto-fill empty sensors from device** rellena los huecos que hayas vaciado.
4. Pon un **Título** (y un **Subtítulo** opcional), y ya está.

---

## Configuración

Todas las opciones se pueden editar desde el editor visual, pero aquí tienes el YAML si lo prefieres:

```yaml
type: custom:glances-machine-card
device_id: 5c1f0e…                      # Lo establece el editor
title: "NAS · Pi"                       # Etiqueta de la cabecera (opcional)
subtitle: "OpenMediaVault"              # Pequeña etiqueta inferior derecha (opcional)
entity_cpu: sensor.nas_cpu_usage
entity_mem: sensor.nas_memory_usage
entity_disk: sensor.nas_disk_usage
entity_temp: sensor.nas_cpu_thermal_0_temperature
entity_net_rx: sensor.nas_eth0_rx
entity_net_tx: sensor.nas_eth0_tx
entity_uptime: sensor.nas_uptime
```

Glances nombra sus sensores según el host que configuraste, así que una máquina añadida como `10.0.0.99` tiene sensores como `sensor.10_0_0_99_cpu_usage`.

### Opciones

| Opción           | Obligatorio | Descripción                                                          |
| ---------------- | :---------: | ------------------------------------------------------------------- |
| `type`           |     sí      | Debe ser `custom:glances-machine-card`.                            |
| `device_id`      |     no      | ID de registro del dispositivo Glances. Lo establece el editor; acota los selectores de entidades. Cualquier sensor vacío se detecta en este dispositivo. |
| `title`          |     no      | Título mostrado en la cabecera. Por defecto, el nombre del dispositivo. |
| `subtitle`       |     no      | Pequeña etiqueta atenuada en la esquina inferior derecha.          |
| `entity_cpu`     |    sí\*     | Sensor de uso de CPU.                                              |
| `entity_mem`     |    sí\*     | Sensor de uso de memoria.                                          |
| `entity_disk`    |    sí\*     | Sensor de uso de disco.                                            |
| `entity_temp`    |     no      | Sensor de temperatura de la CPU.                                   |
| `entity_net_rx`  |     no      | Sensor de descarga de red (RX).                                    |
| `entity_net_tx`  |     no      | Sensor de subida de red (TX).                                      |
| `entity_uptime`  |     no      | Sensor de tiempo de actividad / último arranque.                   |
| `device`         |     no      | Legacy: prefijo de ID de entidad (p. ej. `nas`) usado para detectar sensores cuando no hay `device_id`. |

\* Necesitas al menos un `entity_*` **o** un `device_id`. Una tarjeta con solo `device_id: …` funciona: todos los sensores
se detectan en ese dispositivo. Un sensor sin definir que no se puede detectar muestra un guion. La temperatura, la red y el
tiempo de actividad se ocultan cuando no hay sensor para ellos.

---

## Cómo funciona

### El desplegable de dispositivos

El editor usa el selector de dispositivos del propio Home Assistant, filtrado por la integración **Glances**, y lista cada dispositivo por el nombre que le diste en Home Assistant. Los cambios de nombre aparecen al instante.

### Selectores de entidades acotados

Cada campo de sensor es el selector de entidades nativo de Home Assistant, restringido a los sensores del dispositivo que seleccionaste. Así solo ves los sensores de esa máquina, con búsqueda y autocompletado completos.

### Detección de sensores

La integración Glances da a cada sensor una clave interna fija: `cpu_usage`, `memory_usage`, `disk_usage`, `temperature`, `network_rx` / `network_tx` y `uptime`. La tarjeta empareja por esas claves, así que la detección funciona sin importar cómo se llamen tu host o tus entidades. Cuando varios sensores encajan, prefiere:

- el **sistema de archivos raíz** frente a `/boot`, firmware y montajes snap;
- una temperatura de **CPU** (`cpu_thermal`, `Core`, `Package`, …) frente a temperaturas de disco o GPU;
- una **interfaz de red física** (`eth*`, `en*`, `wlan*`) frente a loopback, Docker y puentes virtuales; y la subida siempre usa la misma interfaz que la descarga.

Para sensores de otras integraciones, recurre a los IDs de entidad y a las unidades (solo los sensores en `%` valen para las barras de CPU, RAM y disco).

Cambiar el dispositivo en el editor sustituye los sensores de la máquina anterior por los de la nueva. **⚡ Auto-fill** solo rellena huecos vacíos, así que puedes ajustar lo que quieras y conservar tus elecciones.

### Colores y umbrales

Las barras y el punto de temperatura cambian de color según la carga, para que los problemas salten a la vista:

| Métrica       | 🟢 Saludable | 🟠 Aviso   | 🔴 Crítico  |
| ------------- | :----------: | :--------: | :---------: |
| CPU / RAM     |   < 70 %     |  70–88 %   |   ≥ 88 %    |
| Disco         |   < 75 %     |  75–90 %   |   ≥ 90 %    |
| Temp. CPU     |   < 65 °C    |  65–80 °C  |   ≥ 80 °C   |

Las temperaturas en °F se convierten antes de comparar. Las barras solo se dibujan para sensores en porcentaje; si eliges un sensor con otra unidad (p. ej. memoria en MiB), el valor se muestra con su unidad y sin barra.

### Unidades de red

Glances reporta el rendimiento en bytes por segundo y Home Assistant lo convierte a la unidad definida en los ajustes del sensor (Mbit/s por defecto). La tarjeta muestra ese valor formateado. Si un sensor reporta una unidad de bytes en bruto (`B`, `B/s`), se escala a `KiB` / `MiB` / `GiB` legibles, conservando el sufijo `/s`.

---

## Solución de problemas

**La tarjeta dice "Custom element doesn't exist."**
El recurso no está cargado. Vuelve a comprobar la URL y el tipo del recurso, luego fuerza una recarga del navegador (el archivo suele quedar en caché).

**El desplegable de dispositivos está vacío.**
Asegúrate de que la integración Glances esté configurada y haya creado al menos un dispositivo.

**Algunas métricas muestran un guion (`—`).**
Ese sensor no está definido, no se pudo detectar o no está disponible; pasa el ratón por encima del recuadro para ver cuál. Elige la entidad correspondiente en el editor (o ejecuta el Auto-fill).

**La cabecera muestra "offline".**
Todos los sensores de la tarjeta no están disponibles, lo que suele significar que Home Assistant no alcanza Glances en esa máquina. Comprueba que Glances se ejecuta en modo servidor web (`glances -w`) y que la integración está conectada.

**El editor dice que no se pudo cargar.**
Usa **Mostrar editor de código** en el diálogo de la tarjeta para editar el YAML directamente y abre una incidencia indicando tu versión de Home Assistant.

---

## Contribuir

Las incidencias y pull requests son bienvenidas, especialmente patrones extra de nombres de sensores, ajustes de diseño y correcciones de temas.

## Licencia

Publicado bajo la [Licencia MIT](LICENSE).

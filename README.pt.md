# Home Assistant Glances Machine Card

[English](README.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · **Português**

Um cartão [Lovelace](https://www.home-assistant.io/dashboards/) compacto e bonito para o Home Assistant que mostra os sinais vitais de qualquer máquina monitorizada pela [integração Glances](https://www.home-assistant.io/integrations/glances/) — CPU, RAM, disco, temperatura, rede e tempo de atividade — num relance.

Aponta-o a um dispositivo e ele trata do resto. Sem lutas com YAML, sem caçar IDs de entidades.

> **Baseado na integração oficial.** Este cartão lê as entidades criadas pela [integração oficial do Glances](https://www.home-assistant.io/integrations/glances) do Home Assistant — não precisas de nenhum add-on nem de integração personalizada adicional. Configura primeiro essa integração.

![Glances Machine Card a mostrar CPU, RAM, disco, temperatura, rede e tempo de atividade de um anfitrião PiVPN](docs/preview.png)

### Capturas de ecrã

**Seletor de cartões** — como o cartão aparece ao adicioná-lo a um painel:

![Glances Machine Card no seletor de cartões do Home Assistant, com título e descrição breve](docs/card-picker.png)

*Entrada do seletor: «Glances Machine Card» — um cartão de diagnóstico para uma máquina monitorizada pelo Glances. Escolhe o dispositivo e os sensores no editor.*

**Editor visual** — escolhe um dispositivo Glances e os sensores preenchem-se sozinhos:

![Diálogo de configuração do Glances Machine Card com seletor de dispositivo, campos de sensores e pré-visualização em direto](docs/card-configuration.png)

---

## Funcionalidades

- **Seletor de dispositivos** — o editor visual lista os teus dispositivos Glances pelo nome que têm no Home Assistant. Basta escolher um numa lista pendente.
- **Deteção automática de sensores** — escolher um dispositivo preenche CPU, RAM, disco, temperatura, rede e tempo de atividade. Os sensores do Glances são reconhecidos pelas chaves internas da própria integração, e não por adivinhação a partir dos nomes, por isso escolhe a *utilização* da CPU (não a carga média), a tua placa de rede real (não o loopback nem as pontes do Docker) e o sistema de ficheiros raiz.
- **Seletores de entidades restritos** — cada campo de sensor é um seletor de entidades nativo do Home Assistant limitado aos sensores do dispositivo selecionado.
- **Editor de interface completo** — sem necessidade de YAML. Usa os componentes de formulário padrão do Home Assistant, sem transferências externas, por isso também funciona em instalações sem internet.
- **Barras e cores inteligentes** — CPU, RAM e disco são apresentados como barras de progresso finas que ficam âmbar e depois vermelhas à medida que se aproximam dos seus limites, com as cores de sucesso / aviso / erro do teu tema.
- **Indicador de temperatura** — um ponto colorido assinala quando a tua CPU está a aquecer, em °C ou °F.
- **Débito de rede** — o descarregamento/carregamento usa a unidade que escolheste para o sensor no Home Assistant (Mbit/s por predefinição); as unidades de bytes brutos são escaladas para `KiB` / `MiB` / `GiB` legíveis.
- **Emblema de tempo de atividade** — o tempo desde o arranque, como uma pílula arrumada no cabeçalho. Transforma-se num emblema **offline** quando a máquina deixa de responder.
- **Toca para ver detalhes** — clica em qualquer métrica para abrir o diálogo de informações do Home Assistant com o respetivo histórico.
- **Compatível com temas** — usa as variáveis de tema do teu Home Assistant, por isso fica bem tanto no modo claro como no escuro, e ajusta o tamanho corretamente na vista de secções.

---

## Instalação

1. Descarrega [`glances-machine-card.js`](glances-machine-card.js).
2. Copia-o para a pasta de configuração do teu Home Assistant, dentro de `www/`:

   ```
   /config/www/glances-machine-card.js
   ```

3. Vai a **Definições → Painéis → ⋮ → Recursos → Adicionar recurso** e introduz:

   - **URL:** `/local/glances-machine-card.js`
   - **Tipo de recurso:** `Módulo JavaScript`

4. Recarrega o teu navegador (recarregamento forçado para limpar a cache).

Quando atualizares o ficheiro, volta a forçar o recarregamento (ou acrescenta um sufixo de versão ao URL do recurso, por exemplo `/local/glances-machine-card.js?v=2`).

---

## Configuração inicial

Precisas da **[integração Glances](https://www.home-assistant.io/integrations/glances/)** configurada e a reportar sensores de pelo menos uma máquina. O Glances corre em cada máquina que queiras monitorizar (um Raspberry Pi, um NAS, um servidor, etc.).

Assim que estiver pronto:

1. Edita um painel → **Adicionar cartão** → procura por **Glances Machine Card**.
2. No editor, escolhe a tua máquina na lista pendente **Glances device**. Os sensores são preenchidos automaticamente.
3. Ajusta qualquer sensor se quiseres — cada seletor está limitado aos sensores do dispositivo selecionado. **⚡ Auto-fill empty sensors from device** preenche os espaços que tenhas limpado.
4. Define um **Título** (e um **Subtítulo** opcional), e está concluído.

---

## Configuração

Todas as opções são editáveis através do editor visual, mas aqui está o YAML caso o prefiras:

```yaml
type: custom:glances-machine-card
device_id: 5c1f0e…                      # Definido pelo editor
title: "NAS · Pi"                       # Etiqueta do cabeçalho (opcional)
subtitle: "OpenMediaVault"              # Pequena etiqueta no canto inferior direito (opcional)
entity_cpu: sensor.nas_cpu_usage
entity_mem: sensor.nas_memory_usage
entity_disk: sensor.nas_disk_usage
entity_temp: sensor.nas_cpu_thermal_0_temperature
entity_net_rx: sensor.nas_eth0_rx
entity_net_tx: sensor.nas_eth0_tx
entity_uptime: sensor.nas_uptime
```

O Glances dá aos sensores o nome do anfitrião que configuraste, por isso uma máquina adicionada como `10.0.0.99` tem sensores como `sensor.10_0_0_99_cpu_usage`.

### Opções

| Opção            | Obrigatório | Descrição                                                           |
| ---------------- | :---------: | ------------------------------------------------------------------- |
| `type`           |     sim     | Tem de ser `custom:glances-machine-card`.                          |
| `device_id`      |     não     | ID de registo do dispositivo Glances. Definido pelo editor; restringe os seletores de entidades. Qualquer sensor deixado vazio é detetado a partir deste dispositivo. |
| `title`          |     não     | Título apresentado no cabeçalho. Por predefinição, o nome do dispositivo. |
| `subtitle`       |     não     | Pequena etiqueta esbatida no canto inferior direito.               |
| `entity_cpu`     |    sim\*    | Sensor de utilização da CPU.                                       |
| `entity_mem`     |    sim\*    | Sensor de utilização da memória.                                   |
| `entity_disk`    |    sim\*    | Sensor de utilização do disco.                                     |
| `entity_temp`    |     não     | Sensor de temperatura da CPU.                                      |
| `entity_net_rx`  |     não     | Sensor de descarregamento de rede (RX).                            |
| `entity_net_tx`  |     não     | Sensor de carregamento de rede (TX).                               |
| `entity_uptime`  |     não     | Sensor de tempo de atividade / último arranque.                    |
| `device`         |     não     | Legacy: prefixo de ID de entidade (por exemplo `nas`) usado para detetar sensores quando não há `device_id`. |

\* Precisas de pelo menos um `entity_*` **ou** um `device_id`. Um cartão só com `device_id: …` funciona: todos os sensores
são detetados a partir desse dispositivo. Um sensor por definir que não possa ser detetado mostra simplesmente um travessão.
A temperatura, a rede e o tempo de atividade ficam ocultos quando não há sensor para eles.

---

## Como funciona

### A lista pendente de dispositivos

O editor usa o seletor de dispositivos do próprio Home Assistant, filtrado pela integração **Glances**, e lista cada dispositivo pelo nome que lhe deste no Home Assistant. As mudanças de nome aparecem de imediato.

### Seletores de entidades restritos

Cada campo de sensor é o seletor de entidades nativo do Home Assistant, restrito aos sensores do dispositivo que selecionaste. Assim só vês os sensores dessa máquina, com pesquisa e preenchimento automático completos.

### Deteção de sensores

A integração Glances dá a cada sensor uma chave interna fixa — `cpu_usage`, `memory_usage`, `disk_usage`, `temperature`, `network_rx` / `network_tx` e `uptime`. O cartão faz a correspondência por essas chaves, por isso a deteção funciona independentemente do nome do anfitrião ou das entidades. Quando vários sensores servem, prefere:

- o **sistema de ficheiros raiz** em vez de `/boot`, firmware e montagens snap;
- uma temperatura de **CPU** (`cpu_thermal`, `Core`, `Package`, …) em vez de temperaturas de disco ou GPU;
- uma **interface de rede física** (`eth*`, `en*`, `wlan*`) em vez de loopback, Docker e pontes virtuais — e o carregamento usa sempre a mesma interface que o descarregamento.

Para sensores de outras integrações, recorre aos IDs de entidade e às unidades (só os sensores em `%` servem para as barras de CPU, RAM e disco).

Mudar de dispositivo no editor substitui os sensores da máquina anterior pelos da nova. O **⚡ Auto-fill** só preenche espaços vazios, por isso podes afinar o que quiseres e manter as tuas escolhas.

### Cores e limiares

As barras e o ponto de temperatura mudam de cor consoante a carga, para que os problemas saltem à vista:

| Métrica       | 🟢 Saudável | 🟠 Aviso   | 🔴 Crítico  |
| ------------- | :---------: | :--------: | :---------: |
| CPU / RAM     |   < 70 %    |  70–88 %   |   ≥ 88 %    |
| Disco         |   < 75 %    |  75–90 %   |   ≥ 90 %    |
| Temp. CPU     |   < 65 °C   |  65–80 °C  |   ≥ 80 °C   |

As temperaturas em °F são convertidas antes da comparação. As barras só são desenhadas para sensores em percentagem; se escolheres um sensor com outra unidade (por exemplo, memória em MiB), o valor é mostrado com a sua unidade e sem barra.

### Unidades de rede

O Glances reporta o débito em bytes por segundo e o Home Assistant converte-o para a unidade definida nas definições do sensor (Mbit/s por predefinição). O cartão mostra esse valor formatado. Se um sensor reportar uma unidade de bytes brutos (`B`, `B/s`), é escalada para `KiB` / `MiB` / `GiB` legíveis, mantendo o sufixo `/s`.

---

## Resolução de problemas

**O cartão diz "Custom element doesn't exist."**
O recurso não está carregado. Verifica novamente o URL e o tipo do recurso e depois força o recarregamento do navegador (o ficheiro fica frequentemente em cache).

**A lista pendente de dispositivos está vazia.**
Certifica-te de que a integração Glances está configurada e criou pelo menos um dispositivo.

**Algumas métricas mostram um travessão (`—`).**
Esse sensor não está definido, não foi detetado ou está indisponível — passa o rato por cima do mosaico para ver qual. Escolhe a entidade correspondente no editor (ou executa o Auto-fill).

**O cabeçalho mostra "offline".**
Todos os sensores do cartão estão indisponíveis, o que normalmente significa que o Home Assistant não consegue chegar ao Glances nessa máquina. Verifica se o Glances está a correr em modo servidor web (`glances -w`) e se a integração está ligada.

**O editor diz que não conseguiu carregar.**
Usa **Mostrar editor de código** no diálogo do cartão para editar o YAML diretamente e abre uma issue com a tua versão do Home Assistant.

---

## Contribuir

Issues e pull requests são bem-vindos — sobretudo padrões adicionais de nomes de sensores, ajustes de layout e correções de tema.

## Licença

Lançado sob a [Licença MIT](LICENSE).

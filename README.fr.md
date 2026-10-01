# Home Assistant Glances Machine Card

[English](README.md) · [Español](README.es.md) · **Français** · [Deutsch](README.de.md) · [Português](README.pt.md)

Une carte [Lovelace](https://www.home-assistant.io/dashboards/) compacte et élégante pour Home Assistant qui affiche en un coup d'œil les constantes de n'importe quelle machine surveillée par l'[intégration Glances](https://www.home-assistant.io/integrations/glances/) : processeur, RAM, disque, température, réseau et temps de fonctionnement.

Pointez-la vers un appareil et elle se charge du reste. Pas besoin de bricoler du YAML ni de chercher des identifiants d'entités.

> **Basée sur l'intégration officielle.** Cette carte lit les entités créées par l'[intégration officielle Glances](https://www.home-assistant.io/integrations/glances) de Home Assistant ; aucun module complémentaire ni intégration personnalisée n'est nécessaire. Configurez d'abord cette intégration.

![Glances Machine Card affichant le processeur, la RAM, le disque, la température, le réseau et le temps de fonctionnement d'un hôte PiVPN](docs/preview.png)

### Captures d'écran

**Sélecteur de cartes** — apparence de la carte lors de son ajout à un tableau de bord :

![Glances Machine Card dans le sélecteur de cartes Home Assistant, avec titre et courte description](docs/card-picker.png)

*Entrée du sélecteur : « Glances Machine Card » — une carte de diagnostic pour une machine surveillée par Glances. Choisissez l'appareil et ses capteurs dans l'éditeur.*

**Éditeur visuel** — choisissez un appareil Glances et ses capteurs se remplissent tout seuls :

![Boîte de dialogue de configuration de Glances Machine Card avec sélecteur d'appareil, champs de capteurs et aperçu en direct](docs/card-configuration.png)

---

## Fonctionnalités

- **Sélecteur d'appareils** — l'éditeur visuel liste vos appareils Glances par leur nom dans Home Assistant. Il suffit d'en choisir un dans une liste déroulante.
- **Détection automatique des capteurs** — choisir un appareil remplit le processeur, la RAM, le disque, la température, le réseau et le temps de fonctionnement. Les capteurs Glances sont reconnus grâce aux clés internes de l'intégration, et non en devinant d'après les noms : la carte choisit donc l'*utilisation* du processeur (pas la charge moyenne), votre vraie carte réseau (pas le loopback ni les ponts Docker) et le système de fichiers racine.
- **Sélecteurs d'entités restreints** — chaque champ de capteur est un sélecteur d'entités natif de Home Assistant limité aux capteurs de l'appareil sélectionné.
- **Éditeur d'interface complet** — aucun YAML requis. Il repose sur les composants de formulaire standard de Home Assistant, sans téléchargement externe, et fonctionne donc aussi sur les installations hors ligne.
- **Barres et couleurs intelligentes** — le processeur, la RAM et le disque s'affichent sous forme de fines barres de progression qui passent à l'ambre puis au rouge à l'approche de leurs limites, avec les couleurs succès / avertissement / erreur de votre thème.
- **Pastille de température** — un point coloré signale lorsque votre processeur chauffe, en °C ou en °F.
- **Débit réseau** — le téléchargement/téléversement utilise l'unité choisie pour le capteur dans Home Assistant (Mbit/s par défaut) ; les unités d'octets bruts sont converties en `KiB` / `MiB` / `GiB` lisibles.
- **Badge de temps de fonctionnement** — le temps écoulé depuis le démarrage, sous forme de pastille soignée dans l'en-tête. Il devient un badge **offline** lorsque la machine ne répond plus.
- **Touchez pour les détails** — cliquez sur n'importe quelle métrique pour ouvrir la fenêtre d'informations de Home Assistant avec son historique.
- **Adapté aux thèmes** — utilise les variables de thème de votre Home Assistant, pour un rendu cohérent en mode clair comme en mode sombre, et se dimensionne correctement dans la vue en sections.

---

## Installation

1. Téléchargez [`glances-machine-card.js`](glances-machine-card.js).
2. Copiez-le dans le dossier de configuration de votre Home Assistant, sous `www/` :

   ```
   /config/www/glances-machine-card.js
   ```

3. Allez dans **Paramètres → Tableaux de bord → ⋮ → Ressources → Ajouter une ressource** et saisissez :

   - **URL :** `/local/glances-machine-card.js`
   - **Type de ressource :** `Module JavaScript`

4. Rechargez votre navigateur (rechargement forcé pour vider le cache).

Lorsque vous mettez le fichier à jour, forcez de nouveau le rechargement (ou ajoutez un suffixe de version à l'URL de la ressource, par ex. `/local/glances-machine-card.js?v=2`).

---

## Configuration initiale

Vous avez besoin de l'**[intégration Glances](https://www.home-assistant.io/integrations/glances/)** configurée et remontant des capteurs pour au moins une machine. Glances lui-même s'exécute sur chaque machine que vous souhaitez surveiller (un Raspberry Pi, un NAS, un serveur, etc.).

Une fois cela en place :

1. Modifiez un tableau de bord → **Ajouter une carte** → recherchez **Glances Machine Card**.
2. Dans l'éditeur, choisissez votre machine dans la liste déroulante **Glances device**. Ses capteurs sont remplis automatiquement.
3. Ajustez un capteur si besoin — chaque sélecteur est limité aux capteurs de l'appareil sélectionné. **⚡ Auto-fill empty sensors from device** remplit les emplacements que vous avez vidés.
4. Définissez un **Titre** (et un **Sous-titre** facultatif), et c'est terminé.

---

## Configuration

Toutes les options sont modifiables via l'éditeur visuel, mais voici le YAML si vous le préférez :

```yaml
type: custom:glances-machine-card
device_id: 5c1f0e…                      # Défini par l'éditeur
title: "NAS · Pi"                       # Libellé de l'en-tête (facultatif)
subtitle: "OpenMediaVault"              # Petit libellé en bas à droite (facultatif)
entity_cpu: sensor.nas_cpu_usage
entity_mem: sensor.nas_memory_usage
entity_disk: sensor.nas_disk_usage
entity_temp: sensor.nas_cpu_thermal_0_temperature
entity_net_rx: sensor.nas_eth0_rx
entity_net_tx: sensor.nas_eth0_tx
entity_uptime: sensor.nas_uptime
```

Glances nomme ses capteurs d'après l'hôte que vous avez configuré : une machine ajoutée sous `10.0.0.99` a des capteurs comme `sensor.10_0_0_99_cpu_usage`.

### Options

| Option           | Requis | Description                                                          |
| ---------------- | :----: | ------------------------------------------------------------------- |
| `type`           |  oui   | Doit être `custom:glances-machine-card`.                           |
| `device_id`      |  non   | Identifiant de registre de l'appareil Glances. Défini par l'éditeur ; restreint les sélecteurs d'entités. Tout capteur laissé vide est détecté sur cet appareil. |
| `title`          |  non   | Titre affiché dans l'en-tête. Par défaut, le nom de l'appareil.    |
| `subtitle`       |  non   | Petit libellé atténué dans le coin inférieur droit.                |
| `entity_cpu`     | oui\*  | Capteur d'utilisation du processeur.                               |
| `entity_mem`     | oui\*  | Capteur d'utilisation de la mémoire.                               |
| `entity_disk`    | oui\*  | Capteur d'utilisation du disque.                                   |
| `entity_temp`    |  non   | Capteur de température du processeur.                              |
| `entity_net_rx`  |  non   | Capteur de téléchargement réseau (RX).                            |
| `entity_net_tx`  |  non   | Capteur de téléversement réseau (TX).                             |
| `entity_uptime`  |  non   | Capteur de temps de fonctionnement / dernier démarrage.           |
| `device`         |  non   | Legacy : préfixe d'identifiant d'entité (par ex. `nas`) utilisé pour détecter les capteurs en l'absence de `device_id`. |

\* Vous avez besoin d'au moins un `entity_*` **ou** d'un `device_id`. Une carte avec seulement `device_id: …` fonctionne :
tous les capteurs sont détectés sur cet appareil. Un capteur non défini et introuvable affiche simplement un tiret. La
température, le réseau et le temps de fonctionnement sont masqués lorsqu'aucun capteur ne leur correspond.

---

## Comment ça marche

### La liste déroulante des appareils

L'éditeur utilise le sélecteur d'appareils de Home Assistant, filtré sur l'intégration **Glances**, et liste chaque appareil par le nom que vous lui avez donné dans Home Assistant. Les changements de nom apparaissent immédiatement.

### Sélecteurs d'entités restreints

Chaque champ de capteur est le sélecteur d'entités natif de Home Assistant, restreint aux capteurs de l'appareil que vous avez sélectionné. Vous ne voyez donc que les capteurs de cette machine, avec recherche et autocomplétion complètes.

### Détection des capteurs

L'intégration Glances attribue à chaque capteur une clé interne fixe : `cpu_usage`, `memory_usage`, `disk_usage`, `temperature`, `network_rx` / `network_tx` et `uptime`. La carte s'appuie sur ces clés, la détection fonctionne donc quel que soit le nom de votre hôte ou de vos entités. Lorsque plusieurs capteurs conviennent, elle privilégie :

- le **système de fichiers racine** plutôt que `/boot`, le firmware et les montages snap ;
- une température **processeur** (`cpu_thermal`, `Core`, `Package`, …) plutôt que celles des disques ou du GPU ;
- une **interface réseau physique** (`eth*`, `en*`, `wlan*`) plutôt que le loopback, Docker et les ponts virtuels — et le téléversement utilise toujours la même interface que le téléchargement.

Pour les capteurs d'autres intégrations, elle se rabat sur les identifiants d'entités et les unités (seuls les capteurs en `%` conviennent pour les barres processeur, RAM et disque).

Changer d'appareil dans l'éditeur remplace les capteurs de l'ancienne machine par ceux de la nouvelle. **⚡ Auto-fill** ne remplit que les emplacements vides : vous pouvez donc tout ajuster et garder vos choix.

### Couleurs et seuils

Les barres et le point de température changent de couleur selon la charge, pour que les problèmes sautent aux yeux :

| Métrique      | 🟢 Sain   | 🟠 Avertissement | 🔴 Critique |
| ------------- | :-------: | :--------------: | :---------: |
| Processeur / RAM | < 70 % |     70–88 %      |   ≥ 88 %    |
| Disque        |  < 75 %   |     75–90 %      |   ≥ 90 %    |
| Temp. proc.   |  < 65 °C  |     65–80 °C     |   ≥ 80 °C   |

Les températures en °F sont converties avant la comparaison. Les barres ne sont tracées que pour les capteurs en pourcentage ; si vous choisissez un capteur avec une autre unité (par ex. la mémoire en MiB), la valeur est affichée avec son unité, sans barre.

### Unités réseau

Glances remonte le débit en octets par seconde, et Home Assistant le convertit dans l'unité définie dans les paramètres du capteur (Mbit/s par défaut). La carte affiche cette valeur formatée. Si un capteur remonte une unité d'octets bruts (`B`, `B/s`), elle est convertie en `KiB` / `MiB` / `GiB` lisibles, en conservant le suffixe `/s`.

---

## Dépannage

**La carte affiche « Custom element doesn't exist. »**
La ressource n'est pas chargée. Vérifiez à nouveau l'URL et le type de la ressource, puis forcez le rechargement de votre navigateur (le fichier est souvent mis en cache).

**La liste déroulante des appareils est vide.**
Assurez-vous que l'intégration Glances est configurée et a créé au moins un appareil.

**Certaines métriques affichent un tiret (`—`).**
Ce capteur n'est pas défini, n'a pas pu être détecté ou est indisponible — survolez la tuile pour savoir lequel. Choisissez l'entité correspondante dans l'éditeur (ou lancez l'Auto-fill).

**L'en-tête affiche « offline ».**
Tous les capteurs de la carte sont indisponibles, ce qui signifie généralement que Home Assistant ne parvient pas à joindre Glances sur cette machine. Vérifiez que Glances tourne en mode serveur web (`glances -w`) et que l'intégration est connectée.

**L'éditeur indique qu'il n'a pas pu se charger.**
Utilisez **Afficher l'éditeur de code** dans la boîte de dialogue de la carte pour modifier directement le YAML, et ouvrez un ticket en précisant votre version de Home Assistant.

---

## Contribuer

Les tickets et pull requests sont les bienvenus — en particulier les motifs supplémentaires de noms de capteurs, les ajustements de mise en page et les correctifs de thème.

## Licence

Publié sous la [licence MIT](LICENSE).

# US-Nationalparks (NPS)

Verfolge in Gladys die **Warnungen, Schließungen und Veranstaltungen** der
US-Nationalparks, die dich interessieren (Yosemite, Yellowstone, Grand
Canyon…), über die offizielle API des **National Park Service** (NPS).

> Keine Verbindung zum National Park Service. Die Pfeilspitze des NPS ist ein
> geschütztes Emblem: diese Integration verwendet sie nicht.

## Was du bekommst

- **Ein Gerät pro Park**, mit:
  - der Anzahl der aktuellen Warnungen in jeder NPS-Kategorie: **Schließung**,
    **Gefahr**, **Vorsicht**, **Information**;
  - **Schließung aktiv** (ja / nein): eine „Park Closure“-Warnung ist
    veröffentlicht. Oft betrifft das nur einen Teil: eine Straße, einen Weg, ein Gebiet,
    selten den ganzen Park;
  - einer **Warnstufe**: 0 keine Warnung, 1 Information, 2 Vorsicht, 3 Gefahr
    oder Schließung;
  - der **schwersten Warnung** als Text („Schließung: Tioga Road and Glacier
    Point Road will temporarily close…“);
  - der **nächsten Veranstaltung** des Parkkalenders (Ranger-Führungen,
    Abendprogramme…), zur Ortszeit des Parks.
- Ein **Dashboard-Widget** mit den aktuellen Warnungen, die schwersten zuerst.
- Ein **Szenen-Auslöser** „Neue Park-Warnung“, filterbar nach Park und
  Kategorie.
- Eine **Szenen-Aktion**, die die Warnungen vorliest oder per Nachricht sendet.

Die Titel der Warnungen und die Namen der Veranstaltungen stammen vom NPS, auf
Englisch.

## Voraussetzungen

- Gladys Assistant **5.3.0** oder neuer.
- Internetzugang von Gladys aus.
- Optional, aber empfohlen: ein kostenloser **API-Schlüssel** von
  api.data.gov.

## Installation

1. Gehe in Gladys zu **Integrationen → Von GitHub installieren**.
2. Füge die Adresse des Repositorys ein: `https://github.com/guim31/gladys-nps`.
3. Installiere sie und öffne dann die Konfigurationsseite der Integration.

## Konfiguration

### Einstellungen

| Einstellung                       | Bedeutung                                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| NPS-API-Schlüssel                 | Dein kostenloser Schlüssel. Leer: `DEMO_KEY`, geteilt und auf wenige Anfragen pro Stunde begrenzt.        |
| Nationalparks                     | Die 63 Nationalparks.                                                                                     |
| Andere NPS-Stätten                | Codes anderer NPS-Stätten (Monumente, Küsten, historische Stätten…), durch Kommas getrennt: `stli, alca`. |
| Aktualisierung                    | Alle 30 Minuten, jede Stunde (Standard) oder alle 2 Stunden.                                              |
| Sprache der Namen und Nachrichten | Namen der Funktionen (beim Hinzufügen festgelegt), Texte, Widget und Szenensätze. Standard: Französisch.  |

**Einen Schlüssel holen**: fülle das Formular auf
[nps.gov/subjects/developer/get-started.htm](https://www.nps.gov/subjects/developer/get-started.htm)
aus (Name und E-Mail); der Schlüssel kommt sofort per E-Mail. Füge ihn in das
Feld **NPS-API-Schlüssel** ein und speichere.

**Der Code einer Stätte** ist der Teil ihrer nps.gov-Adresse nach der Domain:
`https://www.nps.gov/stli/` ergibt `stli` (Freiheitsstatue).

### Parks hinzufügen

Speichere die Konfiguration: jeder Park erscheint im Tab **Entdecken** der
Integration. Füge die gewünschten zu Gladys hinzu. Ein aus der Liste
entfernter Park funktioniert weiter, solange sein Gerät in Gladys existiert.

### Überprüfen

Die Schaltfläche **Status** der Konfigurationsseite listet die verfolgten
Parks, ihre Anzahl an Warnungen, die letzte Abfrage und den letzten Fehler. Ein
ungültiger Schlüssel oder ein erreichtes Stundenlimit wird auch oben auf der
Seite der Integration angezeigt.

## Geräte

| Funktion              | Typ             | Werte                                                               |
| --------------------- | --------------- | ------------------------------------------------------------------- |
| Schließungswarnungen  | Zähler          | aktuelle „Park Closure“-Warnungen                                   |
| Gefahrenwarnungen     | Zähler          | aktuelle „Danger“-Warnungen                                         |
| Vorsichtswarnungen    | Zähler          | aktuelle „Caution“-Warnungen                                        |
| Informationsmeldungen | Zähler          | aktuelle „Information“-Warnungen                                    |
| Schließung aktiv      | Eingang (binär) | 1, solange eine Schließungswarnung veröffentlicht ist               |
| Warnstufe             | Risikostufe     | 0 keine, 1 Information, 2 Vorsicht, 3 Gefahr/Schließung             |
| Schwerste Warnung     | Text            | „Gefahr: <Titel>“ oder „Keine Warnung“                              |
| Nächste Veranstaltung | Text            | „Sa., 14. Nov., 18:30 · <Titel>“ oder „Keine Veranstaltung geplant“ |

Die Zähler, die Schließung und die Stufe behalten ihren Verlauf: ein Diagramm
zeigt, wie lange eine Straße gesperrt war. Nutze sie in Szenen („wenn
Schließungswarnungen von Yosemite sich ändert“, „wenn Warnstufe 3 ist“).

## Dashboard-Widget

**Park-Warnungen**: die aktuellen Warnungen der zu Gladys hinzugefügten Parks,
die schwersten zuerst (Schließungen und Gefahren rot, Vorsicht orange,
Information blau), höchstens 10 Zeilen. Darüber die Anzahl pro Park; darunter
ein Link zur Seite **Current conditions** des Parks auf nps.gov, wenn nur ein
Park angezeigt wird.

Einstellungen: die angezeigten Parks (leer: alle) und Schalter, um die
Informationsmeldungen, die Anzahl pro Park und den Link auszublenden.

## Szenen-Auslöser

**Neue Park-Warnung**: der NPS veröffentlicht eine Warnung, die bei der
vorherigen Abfrage noch nicht da war, für einen zu Gladys hinzugefügten Park.
Filter: Parks (leer: jeder) und Kategorien (Schließung, Gefahr, Vorsicht,
Information; leer: jede). Variablen: Name des Parks, Kategorie, Titel der
Warnung (Englisch), Text „Kategorie: Titel“, Link zur Warnung.

Warnungen, die beim Hinzufügen eines Parks oder beim Start der Integration
schon da sind, lösen ihn nicht aus.

## Szenen-Aktion

**Park-Warnungen lesen**: die aktuellen Warnungen der gewählten Parks (leer:
alle) in einem Satz („Zion National Park: 4 Warnungen. Schließung: …“), dazu
Zahlen: Anzahl der Warnungen, Schließungswarnungen, Gefahrenwarnungen und die
schwerste Kategorie (`none`, `closure`, `danger`, `caution`, `information`).

## Szenenbeispiele

- **Reise in Sicht**: Auslöser „Neue Park-Warnung“, Park Yosemite, Kategorien
  Schließung und Gefahr → den Text „Kategorie: Titel“ und den Link per
  Nachricht senden.
- **Morgenbriefing während der Reise**: jeden Tag um 7:00 → „Park-Warnungen
  lesen“ → den Satz vorlesen.
- **Eine Straße im Blick behalten**: wenn „Schließungswarnungen“ von
  Yellowstone wieder 0 ist → eine Nachricht senden.

## Daten und Aktualisierung

- Warnungen: eine gemeinsame Anfrage für alle Parks bei jeder Aktualisierung.
- Veranstaltungen: eine Anfrage (oder wenige Seiten zu 50) alle 6 Stunden und
  an jedem neuen Tag, für die nächsten 31 Tage.
- Namen der Stätten: eine Anfrage, wenn Stätten per Code eingegeben sind.
- api.data.gov erlaubt **1.000 Anfragen pro Stunde** mit einem persönlichen
  Schlüssel; `DEMO_KEY` teilen sich alle Nutzer einer Adresse, begrenzt auf
  wenige Anfragen pro Stunde: genug für einen Test, nicht für den Alltag.
- Bei einem ungültigen Schlüssel oder einem erreichten Limit zeigt die
  Integration das auf ihrer Seite an, pausiert nach einem Limit eine Stunde und
  behält die letzten Werte.

## Fehlerbehebung

- **„Der NPS-API-Schlüssel ist ungültig“**: prüfe den Schlüssel (ohne
  Leerzeichen) oder leere das Feld, um es mit `DEMO_KEY` zu versuchen.
- **„Stundenlimit der NPS-API erreicht“**: hol dir deinen eigenen Schlüssel
  (siehe oben).
- **Eine eingegebene Stätte erscheint nicht**: die Schaltfläche **Status**
  listet die Codes, die der NPS nicht kennt; prüfe den Code in der
  nps.gov-Adresse.
- **Protokolle**: in Gladys die Container-Protokolle der Integration; setze
  `LOG_LEVEL=debug` für eine Zeile pro Abfrage.

## Einschränkungen

- Daten des NPS: eine Warnung erscheint, wenn der Park sie veröffentlicht,
  manchmal Stunden nach einer Schließung. Prüfe vor einer Reise immer nps.gov.
- „Schließung aktiv“ bedeutet, dass eine Schließungswarnung veröffentlicht ist,
  nicht dass der ganze Park geschlossen ist.
- Die Zeiten der Veranstaltungen gelten zur Ortszeit des Parks (Zeitzone
  seines Bundesstaats).
- Straßenzustände sind nicht abgedeckt: der NPS nennt sie im Text der
  Warnungen.
- Gegen die echte NPS-API entwickelt und getestet, aber ohne
  Langzeiterfahrung: Rückmeldungen im Forum willkommen.

## Danksagung

- Daten: [API des National Park Service](https://www.nps.gov/subjects/developer/api-documentation.htm),
  gemeinfrei (Werk der US-Regierung), über api.data.gov.
- Keine Verbindung zum National Park Service. Das Pfeilspitzen-Emblem des NPS
  wird nicht verwendet.
- Integration von guim31, Apache-2.0-Lizenz.

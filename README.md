# Poll-App

Eine Web-Applikation zum Erstellen, Verwalten und Teilnehmen an Umfragen.
Aufgesetzt mit **TypeScript** und **Vite**, ohne weiteres UI-Framework.
Die Styles liegen modular unter `src/styles/` und werden über `src/styles/main.css`
eingebunden.

## Voraussetzungen

- [Node.js](https://nodejs.org/) ≥ 18
- npm (wird mit Node.js installiert)

## Setup

```bash
npm install
```

## Entwicklung

```bash
npm run dev
```

Vite startet einen lokalen Dev-Server (standardmäßig unter
`http://localhost:5173`) mit Hot-Reload.

## Type-Check und Build

```bash
npm run type-check   
npm run build      
npm run preview     
```

## Projektstruktur

```
Poll-App/
├── index.html                 # Einstiegspunkt mit semantischem Markup
├── main.ts                    # Bootstrap der Anwendung
├── package.json
├── tsconfig.json
├── public/
│   └── favicon.svg
└── src/
    ├── components/            # UI-Controller
    │   ├── active-panel-scrollbar.ts  # Eigene Scroll-Leiste (aktives Tab-Panel)
    │   ├── poll-card.ts
    │   ├── poll-list.ts       # User Story 1 + 2 (Listen, Tabs, Karten)
    │   ├── poll-form.ts       # User Story 3
    │   ├── poll-detail.ts     # User Story 4 + 5
    │   └── sort-dropdown.ts   # Kategorie-Filter für aktive / vergangene Umfragen
    ├── data/
    │   └── mock-polls.ts      # Beispielumfragen
    ├── services/
    │   └── poll-service.ts    # State + Geschäftslogik
    ├── styles/                # CSS (ohne Kommentare; Einstieg: main.css)
    │   ├── main.css           # @import der Teil-Stylesheets
    │   ├── tokens.css
    │   ├── layout-hero.css
    │   ├── surveys-panels.css
    │   ├── poll-card.css
    │   ├── modal-form.css
    │   ├── poll-detail.css
    │   └── responsive.css
    ├── types/
    │   └── poll.ts            # TypeScript-Typen
    └── utils/
        ├── dom.ts             # DOM-Helfer
        └── format.ts          # Datums- und Prozent-Formatierung
```

## User-Story-Abdeckung

| Story | Umsetzung |
| ----- | --------- |
| US 1 – Bald endende Umfragen | `PollService.getEndingSoonPolls` + Sektion in `PollListController.renderEndingSoon` |
| US 2 – Übersicht mit Tabs    | `PollListController` mit `Active`/`Past`-Tabs; `SortDropdownController` filtert nach Kategorie; Karten mit Titel, Kategorie und Deadline |
| US 3 – Neue Umfrage anlegen   | `PollFormController` öffnet `<dialog>` mit Pflicht-/Optionalfeldern und Validierung |
| US 4 – Detailansicht          | `PollDetailController.open` öffnet die Detailansicht; beendete Umfragen sind nicht klickbar |
| US 5 – Voten + Live-Ergebnis  | `PollDetailController` rendert Voting links und Auswertung rechts; Live-Update via Service-Subscription |

## Coding-Konventionen

### HTML
- Sprachattribut `lang="de"` und vollständiger Meta-Block
- Semantische Elemente (`header`, `main`, `section`, `article`, `dialog`, …)
- `aria-*`-Attribute für Tabs, Dialoge und Auswertungs-Balken
- BEM-Klassennamen (`block__element--modifier`)
- Keine Inline-Styles und keine Inline-Event-Handler
- Keine HTML-Kommentare
- Skip-Link für Tastatur-Navigation

### CSS
- Keine Kommentare in HTML/CSS-Dateien
- Zentrale Design-Tokens in `tokens.css`; weiterführende Sektionen in eigenen Dateien unter `src/styles/`
- Einzelne Stylesheet-Dateien bleiben überschaubar (klein gehalten für Wartung)

### TypeScript
- `strict` und alle ergänzenden Strictness-Flags aktiviert
- Explizite Typen für öffentliche APIs, `readonly` wo möglich
- Klassen für Controller, Interfaces für Datenstrukturen
- Kein `any`; DOM-Zugriffe über typisierten `requireElementById`-Helper
- Trennung von Geschäftslogik (`services/`) und UI (`components/`)
- Kurze englische JSDoc-Zeilen an öffentlichen APIs; komplexe Logik in kleine Helfer aufteilen (Ziel: wenige Zeilen pro Funktion, z. B. maximal ~14)
- Fehlermeldungen, die der Nutzer sieht (z. B. Validierung), auf Englisch

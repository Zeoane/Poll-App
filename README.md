# Poll-App

Eine Web-Applikation zum Erstellen, Verwalten und Teilnehmen an Umfragen.
Aufgesetzt mit **TypeScript** und **Vite**, ohne weiteres UI-Framework –
das spätere Figma-Design lässt sich direkt in das vorhandene CSS einfügen.

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
npm run type-check   # nur TypeScript prüfen
npm run build        # Type-Check + Production-Build nach dist/
npm run preview      # Production-Build lokal testen
```

## Projektstruktur

```
Poll-App/
├── index.html                 # Einstiegspunkt mit semantischem Markup
├── main.ts                    # Bootstrap der Anwendung
├── main.css                   # Basis-CSS (Figma folgt später)
├── package.json
├── tsconfig.json
├── public/
│   └── favicon.svg
└── src/
    ├── components/            # UI-Controller
    │   ├── poll-card.ts
    │   ├── poll-list.ts       # User Story 1 + 2
    │   ├── poll-form.ts       # User Story 3
    │   └── poll-detail.ts     # User Story 4 + 5
    ├── data/
    │   └── mock-polls.ts      # Beispielumfragen
    ├── services/
    │   └── poll-service.ts    # State + Geschäftslogik
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
| US 2 – Übersicht mit Tabs    | `PollListController` mit `Active`/`Past`-Tabs, Karten zeigen Titel, Beschreibung und Deadline |
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
- Skip-Link für Tastatur-Navigation

### TypeScript
- `strict` und alle ergänzenden Strictness-Flags aktiviert
- Explizite Typen für öffentliche APIs, `readonly` wo möglich
- Klassen für Controller, Interfaces für Datenstrukturen
- Kein `any`; DOM-Zugriffe über typisierten `requireElementById`-Helper
- Trennung von Geschäftslogik (`services/`) und UI (`components/`)
- JSDoc-Kommentare an öffentlichen Klassen und Methoden
```

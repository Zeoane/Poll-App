# Poll-App

Eine Web-Applikation zum Erstellen, Verwalten und Teilnehmen an Umfragen.
Aufgesetzt mit **Angular 19** (Application Builder) und **TypeScript**.
Die UI-Logik läuft zunächst als bestehende Controller-Klassen, angebunden über
`bootstrapPollApp()` in `AppComponent` nach `ngAfterViewInit`.

Styles liegen modular unter `src/styles/` mit Einstieg `main.css` (in
`angular.json` als globales Stylesheet eingetragen).

## Voraussetzungen

- [Node.js](https://nodejs.org/) ≥ 18
- npm (wird mit Node.js installiert)

## Setup

```bash
npm install
```

## Entwicklung

```bash
npm start
```

Entspricht `ng serve -o` und öffnet die App im Browser (standardmäßig
`http://localhost:4200`).

## Build

```bash
npm run build
```

Ausgabe unter `dist/poll-app/browser/` (je nach Angular-Version; Inhalt nach `dist/poll-app/` deployen wie in der Angular-Doku beschrieben).

**Deployment unter einem Unterordner** (z. B. `https://example.de/angular-projects/pollapp/`):

- Lokal niemals dauerhaft `<base href="/angular-projects/...">` in der Quell-`index.html` setzen, solange du mit `ng serve` unter `/` arbeitest – sonst bleibt die Seite weiß (Bundles werden unter dem falschen Pfad geladen).
- Production-Build mit passendem Base:

```bash
npm run build:fz
```

Inhalt von `dist/poll-app/browser/` auf den Server unter den Ordner `angular-projects/pollapp/` legen.

Lokales Testen wie auf dem Unterpfad: `npm run start:fz-path` und im Browser
`http://localhost:4200/angular-projects/pollapp/` aufrufen.

## Tests

```bash
npm test
```

## Projektstruktur

```
Poll-App/
├── angular.json
├── package.json
├── public/
│   └── favicon.svg
├── tsconfig.json
├── tsconfig.app.json
└── src/
    ├── index.html
    ├── main.ts
    ├── app/
    │   ├── app.component.ts
    │   ├── app.component.html    # bisheriges Seiten-Markup
    │   ├── app-legacy-bootstrap.ts
    │   ├── app.config.ts
    │   └── app.routes.ts
    ├── components/
    ├── data/
    ├── services/
    ├── styles/
    ├── types/
    ├── utils/
    └── assets/img/
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
- `strict` und Angular-Compiler-Strictness
- Explizite Typen für öffentliche APIs, `readonly` wo möglich
- Klassen für Controller, Interfaces für Datenstrukturen
- Kein `any`; DOM-Zugriffe über typisierten `requireElementById`-Helper
- Trennung von Geschäftslogik (`services/`) und UI (`components/`)
- Kurze englische JSDoc-Zeilen an öffentlichen APIs; komplexe Logik in kleine Helfer aufteilen (Ziel: wenige Zeilen pro Funktion, z. B. maximal ~14)
- Fehlermeldungen, die der Nutzer sieht (z. B. Validierung), auf Englisch

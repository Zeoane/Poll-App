# Poll-App

## Inhaltsverzeichnis / Table of contents

**<a href="#de" style="color:#0366d6;text-decoration:underline;">Deutsch</a>**

- [Demokarten (Demo-Umfragen)](#de-demokarten)
- [Voraussetzungen](#de-voraussetzungen)
- [Setup](#de-setup)
- [Entwicklung](#de-entwicklung)
- [Build](#de-build)
- [Tests](#de-tests)
- [Projektstruktur](#de-projektstruktur)
- [User-Story-Abdeckung](#de-user-stories)
- [Coding-Konventionen](#de-coding-konventionen)

**<a href="#en" style="color:#0366d6;text-decoration:underline;">English</a>**

- [Demo survey cards](#en-demo-survey-cards)
- [Prerequisites](#en-prerequisites)
- [Setup](#en-setup)
- [Development](#en-development)
- [Build](#en-build)
- [Tests](#en-tests)
- [Project structure](#en-project-structure)
- [User story coverage](#en-user-stories)
- [Coding conventions](#en-coding-conventions)

<a id="de"></a>

Eine Web-Applikation zum Erstellen, Verwalten und Teilnehmen an Umfragen.
Aufgesetzt mit **Angular 19** (Application Builder) und **TypeScript**.
Die UI-Logik läuft zunächst als bestehende Controller-Klassen, angebunden über
`bootstrapPollApp()` in `AppComponent` nach `ngAfterViewInit`.

Styles liegen modular unter `src/styles/` mit Einstieg `main.css` (in
`angular.json` als globales Stylesheet eingetragen).

<a id="de-demokarten"></a>

## Demokarten (Demo-Umfragen)

Auf der Startseite werden fest eingebaute **Demokarten** angezeigt (`poll-card`,
teilweise `poll-card--highlight` in „Ending soon“). Sie stammen aus
`src/data/mock-polls.ts` und werden über `src/data/example-polls.ts` mit
`isExample: true` in den `PollService` geladen.

**Wichtig:** Diese Demokarten sind **keine echten Live-Umfragen**. Sie werden
**nicht in Supabase gespeichert**, erscheinen **nicht in der produktiven
Umfragen-Datenbank** und ihre Stimmen werden nur **lokal im Browser**
(in-memory / `localStorage`) gehalten. Echte, veröffentlichte Umfragen kommen
ausschließlich aus Supabase und nutzen persistente Auswertung sowie Realtime.

Ohne Supabase-Konfiguration dienen die Demokarten als UI- und
Entwicklungsbeispiel; mit Supabase liegen sie **zusätzlich** neben den echten
Umfragen in der Übersicht. Auf der Survey-Seite zeigen Demoumfragen für die
Fragen 2–4 statische Vorschau-Inhalte; nur Frage 1 ist für die Demo-Karte
interaktiv abstimmbar.

<a id="de-voraussetzungen"></a>

## Voraussetzungen

- [Node.js](https://nodejs.org/) ≥ 18
- npm (wird mit Node.js installiert)

<a id="de-setup"></a>

## Setup

```bash
npm install
```

<a id="de-entwicklung"></a>

## Entwicklung

```bash
npm start
```

Entspricht `ng serve -o` und öffnet die App im Browser (standardmäßig
`http://localhost:4200`).

<a id="de-build"></a>

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

<a id="de-tests"></a>

## Tests

```bash
npm test
```

<a id="de-projektstruktur"></a>

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

<a id="de-user-stories"></a>

## User-Story-Abdeckung

| Story | Umsetzung |
| ----- | --------- |
| US 1 – Bald endende Umfragen | `PollService.getEndingSoonPolls` + Sektion in `PollListController.renderEndingSoon` |
| US 2 – Übersicht mit Tabs    | `PollListController` mit `Active`/`Past`-Tabs; `SortDropdownController` filtert nach Kategorie; Karten mit Titel, Kategorie und Deadline |
| US 3 – Neue Umfrage anlegen   | `PollFormController` öffnet `<dialog>` mit Pflicht-/Optionalfeldern und Validierung |
| US 4 – Detailansicht          | `PollDetailController.open` öffnet die Detailansicht; beendete Umfragen sind nicht klickbar |
| US 5 – Voten + Live-Ergebnis  | `PollDetailController` rendert Voting links und Auswertung rechts; Live-Update via Service-Subscription |

<a id="de-coding-konventionen"></a>

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

---

<a id="en"></a>

# Poll App (English)

A web application for creating, managing, and participating in surveys.
Built with **Angular 19** (Application Builder) and **TypeScript**.
UI logic currently runs as existing controller classes, wired through
`bootstrapPollApp()` in `AppComponent` after `ngAfterViewInit`.

Styles live modularly under `src/styles/` with entry point `main.css` (registered
in `angular.json` as the global stylesheet).

<a id="en-demo-survey-cards"></a>

## Demo survey cards

The home screen shows built-in **demo cards** (`poll-card`, some as
`poll-card--highlight` in “Ending soon”). They are defined in
`src/data/mock-polls.ts` and loaded into `PollService` via
`src/data/example-polls.ts` with `isExample: true`.

**Important:** These demo cards are **not real live surveys**. They are **not
stored in Supabase**, do **not** appear in the production survey database, and
votes are kept **locally in the browser** only (in-memory / `localStorage`). Real
published surveys come exclusively from Supabase and use persistent results plus
Realtime updates.

Without Supabase configuration, demo cards serve as UI and development samples;
with Supabase configured, they appear **alongside** real surveys in the overview.
On the survey page, demo surveys show static preview content for questions 2–4;
only question 1 is interactively votable for the demo card.

<a id="en-prerequisites"></a>

## Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- npm (included with Node.js)

<a id="en-setup"></a>

## Setup

```bash
npm install
```

<a id="en-development"></a>

## Development

```bash
npm start
```

Equivalent to `ng serve -o` and opens the app in the browser (default
`http://localhost:4200`).

<a id="en-build"></a>

## Build

```bash
npm run build
```

Output under `dist/poll-app/browser/` (deploy contents per Angular docs, typically
under `dist/poll-app/`).

**Deployment under a subpath** (e.g. `https://example.de/angular-projects/pollapp/`):

- Do not permanently set `<base href="/angular-projects/...">` in source
  `index.html` while developing with `ng serve` at `/` — the page stays blank
  (bundles load from the wrong path).
- Production build with matching base:

```bash
npm run build:fz
```

Deploy `dist/poll-app/browser/` to `angular-projects/pollapp/` on the server.

Test locally like on the subpath: `npm run start:fz-path` and open
`http://localhost:4200/angular-projects/pollapp/`.

<a id="en-tests"></a>

## Tests

```bash
npm test
```

<a id="en-project-structure"></a>

## Project structure

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
    │   ├── app.component.html
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

<a id="en-user-stories"></a>

## User story coverage

| Story | Implementation |
| ----- | -------------- |
| US 1 – Ending soon surveys | `PollService.getEndingSoonPolls` + section in `PollListController.renderEndingSoon` |
| US 2 – Overview with tabs | `PollListController` with Active/Past tabs; `SortDropdownController` filters by category; cards with title, category, and deadline |
| US 3 – Create new survey | `PollFormController` opens `<dialog>` with required/optional fields and validation |
| US 4 – Detail view | `PollDetailController.open` opens detail view; ended surveys are not clickable |
| US 5 – Vote + live results | `PollDetailController` renders voting left and results right; live update via service subscription |

<a id="en-coding-conventions"></a>

## Coding conventions

### HTML
- `lang="de"` and full meta block
- Semantic elements (`header`, `main`, `section`, `article`, `dialog`, …)
- `aria-*` attributes for tabs, dialogs, and result bars
- BEM class names (`block__element--modifier`)
- No inline styles or inline event handlers
- No HTML comments
- Skip link for keyboard navigation

### CSS
- No comments in HTML/CSS files
- Central design tokens in `tokens.css`; further sections in separate files under `src/styles/`
- Individual stylesheets kept small for maintainability

### TypeScript
- `strict` and Angular compiler strictness
- Explicit types for public APIs, `readonly` where possible
- Classes for controllers, interfaces for data structures
- No `any`; DOM access via typed `requireElementById` helper
- Separation of business logic (`services/`) and UI (`components/`)
- Short English JSDoc lines on public APIs; split complex logic into small helpers (aim for few lines per function, e.g. max ~14)
- User-visible error messages (e.g. validation) in English

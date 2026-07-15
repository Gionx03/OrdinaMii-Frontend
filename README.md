# OrdinaMii Frontend

OrdinaMii Frontend è una web application sviluppata con Angular per la gestione digitale di un ristorante.

L’applicazione comunica con un backend REST realizzato con Spring Boot e utilizza Keycloak per autenticazione e autorizzazione degli utenti.

Il sistema permette ai clienti di consultare il menu, effettuare ordini, prenotare tavoli e richiedere assistenza. Lo staff può invece gestire ordini, prenotazioni, piatti, tavoli, utenti e richieste provenienti dalla sala.

---

## Tecnologie utilizzate

- Angular 22
- TypeScript
- SCSS
- RxJS
- Angular Reactive Forms
- Angular Router
- Angular Signals
- Keycloak JS
- npm
- Spring Boot REST API

---

## Architettura del progetto

OrdinaMii è composto da tre elementi principali:

```text
┌─────────────────────┐
│  Frontend Angular   │
│  localhost:4200     │
└──────────┬──────────┘
           │ HTTP REST
           ▼
┌─────────────────────┐
│ Backend Spring Boot │
│ localhost:8080      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ PostgreSQL          │
│ localhost:5433      │
└─────────────────────┘
```

L’autenticazione viene gestita separatamente da Keycloak:

```text
Keycloak
localhost:8081
```

---

## Ruoli applicativi

L’applicazione prevede quattro ruoli:

```text
CLIENTE
CAMERIERE
CUOCO
ADMIN
```

### Cliente

Il cliente può:

- consultare il menu;
- filtrare i piatti;
- aggiungere piatti al carrello;
- modificare quantità e contenuto del carrello;
- scegliere tra ordine d’asporto e ordine al tavolo;
- effettuare un ordine;
- consultare i propri ordini;
- creare una prenotazione;
- consultare le proprie prenotazioni;
- inviare una richiesta di assistenza;
- consultare e modificare il proprio profilo.

### Cameriere

Il cameriere può:

- consultare gli ordini;
- creare ordini per un cliente;
- modificare gli ordini;
- aggiornare lo stato degli ordini;
- aggiornare lo stato dei pagamenti;
- consultare le prenotazioni;
- creare prenotazioni per un cliente;
- modificare le prenotazioni;
- completare o annullare una prenotazione;
- gestire le richieste di assistenza;
- consultare e gestire i piatti.

### Cuoco

Il cuoco può:

- consultare gli ordini;
- visualizzare le comande;
- iniziare la preparazione di un ordine;
- segnare un ordine come servito;
- consultare e gestire i piatti.

### Amministratore

L’amministratore può accedere a tutte le funzioni, comprese:

- gestione ordini;
- gestione prenotazioni;
- gestione piatti;
- gestione tavoli;
- gestione utenti;
- consultazione dello storico degli utenti;
- gestione delle richieste di assistenza.

---

## Funzionalità principali

### Menu

Il menu mostra solamente i piatti disponibili.

È possibile filtrare i piatti per:

- nome;
- categoria;
- descrizione.

Le categorie disponibili sono:

```text
ANTIPASTO
PRIMO
SECONDO
CONTORNO
DOLCE
BEVANDE
```

---

### Carrello

Il carrello viene gestito tramite un Angular service basato sui Signals.

Il contenuto viene salvato nel `localStorage`, quindi non viene perso aggiornando la pagina.

È possibile:

- aggiungere un piatto;
- aumentare la quantità;
- diminuire la quantità;
- rimuovere un piatto;
- svuotare il carrello;
- visualizzare quantità totale e prezzo totale.

---

### Checkout

Durante il checkout il cliente può scegliere:

```text
TAKE_AWAY
ON_THE_TABLE
```

Per un ordine d’asporto non viene richiesto alcun tavolo.

Per un ordine al tavolo è obbligatorio selezionare un tavolo attivo.

Il prezzo definitivo viene sempre ricalcolato dal backend.

---

### Ordini

Gli stati disponibili sono:

```text
PENDING
PREPARING
SERVED
CANCELLED
```

Il normale flusso di un ordine è:

```text
PENDING → PREPARING → SERVED
```

Un ordine può essere annullato solamente se le regole del backend lo consentono.

Gli stati di pagamento disponibili sono:

```text
NOT_PAID
PENDING
PAID
PAY_AT_COUNTER
CANCELLED
```

---

### Prenotazioni

Una prenotazione contiene:

- cliente;
- data;
- ora;
- numero di persone;
- tavolo;
- stato.

Gli stati disponibili sono:

```text
CONFIRMED
COMPLETED
CANCELLED
```

Il frontend mostra solamente tavoli attivi con un numero sufficiente di posti.

Il backend impedisce la creazione di due prenotazioni attive per lo stesso tavolo, nella stessa data e alla stessa ora.

---

### Assistenza

Il cliente può inviare una richiesta di assistenza associata a un tavolo.

Gli stati disponibili sono:

```text
PENDING
RESOLVED
CANCELLED
```

Camerieri e amministratori possono consultare e risolvere le richieste.

---

### Gestione piatti

Lo staff autorizzato può:

- creare un piatto;
- modificare un piatto;
- modificare nome, descrizione e prezzo;
- scegliere la categoria;
- impostare l’URL di un’immagine;
- modificare la disponibilità;
- disattivare logicamente un piatto.

La disattivazione non elimina fisicamente il piatto, in modo da mantenere coerente lo storico degli ordini.

---

### Gestione tavoli

L’amministratore può:

- creare un tavolo;
- modificare numero e capienza;
- attivare o disattivare un tavolo;
- consultare tutti i tavoli.

Un tavolo disattivato non può essere utilizzato per nuovi ordini o nuove prenotazioni.

---

### Gestione utenti

L’amministratore può:

- consultare gli utenti registrati;
- filtrare gli utenti per ruolo;
- visualizzare i dati di un utente;
- consultare gli ultimi ordini;
- consultare le ultime prenotazioni.

---

## Autenticazione

L’autenticazione viene gestita tramite Keycloak.

Configurazione utilizzata:

```text
URL: http://localhost:8081
Realm: OrdinaMii
Client frontend: ordinamii-frontend
```

Il frontend riceve un token JWT da Keycloak e lo invia automaticamente al backend attraverso l’header:

```http
Authorization: Bearer <access-token>
```

L’aggiunta del token viene gestita dall’interceptor HTTP dell’applicazione.

---

## Protezione delle route

Le route Angular sono protette tramite:

```text
authGuard
roleGuard
```

`authGuard` verifica che l’utente sia autenticato.

`roleGuard` verifica che l’utente possieda almeno uno dei ruoli richiesti dalla pagina.

La protezione frontend migliora l’esperienza utente, ma la sicurezza definitiva viene sempre applicata dal backend Spring Security.

---

## Struttura delle cartelle

```text
src/app
├── core
│   ├── auth
│   └── http
│
├── features
│   ├── assistance-request
│   ├── cart
│   ├── checkout
│   ├── dishes
│   ├── menu
│   ├── orders
│   ├── profile
│   ├── reservations
│   ├── staff
│   ├── system
│   ├── tables
│   └── users
│
├── shared
│   ├── animations
│   └── layout
│
├── app.config.ts
├── app.routes.ts
├── app.html
├── app.scss
└── app.ts
```

### Core

La cartella `core` contiene servizi utilizzati da tutta l’applicazione:

- autenticazione;
- inizializzazione Keycloak;
- route guard;
- interceptor HTTP;
- tipi condivisi per le risposte paginate.

### Features

La cartella `features` contiene le funzionalità applicative.

Ogni funzionalità mantiene vicini:

- model TypeScript;
- service API;
- componenti;
- template HTML;
- stili SCSS.

### Shared

La cartella `shared` contiene componenti riutilizzabili, come:

- header;
- layout;
- animazioni condivise.

---

## Requisiti

Per eseguire il frontend sono necessari:

- Node.js compatibile con Angular 22;
- npm;
- backend Spring Boot in esecuzione;
- Keycloak in esecuzione.

Versioni Node consigliate:

```text
Node.js 22.22.3 o successiva
```

oppure:

```text
Node.js 24.15.0 o successiva
```

---

## Installazione

Dalla cartella del frontend eseguire:

```bash
npm install
```

Se è presente un `package-lock.json`, è possibile utilizzare:

```bash
npm ci
```

---

## Avvio del progetto completo

### 1. Avvio di PostgreSQL e Keycloak

Dalla cartella del backend:

```bash
docker compose up -d
```

I servizi saranno disponibili su:

```text
PostgreSQL: localhost:5433
Keycloak:   localhost:8081
```

### 2. Avvio del backend

Su Windows:

```bash
mvnw.cmd spring-boot:run
```

Su Linux o macOS:

```bash
./mvnw spring-boot:run
```

Il backend sarà disponibile su:

```text
http://localhost:8080
```

### 3. Avvio del frontend

Dalla cartella del frontend:

```bash
npm start
```

Il frontend sarà disponibile su:

```text
http://localhost:4200
```

---

## Configurazione degli environment

La configurazione si trova in:

```text
src/environments/environment.ts
src/environments/environment.development.ts
```

Configurazione locale:

```ts
export const environment = {
  production: false,

  apiBaseUrl: 'http://localhost:8080',

  keycloak: {
    url: 'http://localhost:8081',
    realm: 'OrdinaMii',
    clientId: 'ordinamii-frontend',
  },
};
```

---

## Comandi disponibili

### Avvio del server di sviluppo

```bash
npm start
```

### Build

```bash
npm run build
```

I file compilati vengono generati nella cartella:

```text
dist/
```

### Modalità watch

```bash
npm run watch
```

### Test

```bash
npm test
```

---

## Gestione degli errori

Le API possono restituire errori dovuti a:

- utente non autorizzato;
- risorsa non trovata;
- dati non validi;
- piatto non disponibile;
- tavolo non disponibile;
- prenotazione in conflitto;
- transizione di stato non valida;
- ordine già pagato o servito.

Il frontend mostra all’utente il messaggio restituito dal backend quando disponibile.

---

## Responsive design

Le pagine utilizzano SCSS responsive e si adattano a:

- computer desktop;
- tablet;
- dispositivi mobili.

Le principali griglie diventano a colonna singola sugli schermi più piccoli.

---

## Note sul progetto

Il progetto è stato sviluppato per finalità universitarie e viene eseguito interamente in ambiente locale.

Gli indirizzi utilizzati sono:

```text
Frontend:   http://localhost:4200
Backend:    http://localhost:8080
Keycloak:   http://localhost:8081
PostgreSQL: localhost:5433
```

Le cartelle generate automaticamente non devono essere aggiunte al repository:

```text
node_modules/
dist/
.angular/
```

Queste cartelle sono già presenti nel `.gitignore`.

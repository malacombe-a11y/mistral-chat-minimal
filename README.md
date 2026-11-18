# Chat Mistral (minimal)

App web minimale en TypeScript qui appelle l'API Mistral avec le SDK officiel
[`@mistralai/mistralai`](https://www.npmjs.com/package/@mistralai/mistralai),
avec une interface de chat simple. Le modèle utilisé est `mistral-small-latest`.

La clé `MISTRAL_API_KEY` ne quitte jamais le serveur : elle est lue depuis
l'environnement dans `server.ts` et n'est jamais envoyée au navigateur.

## Prérequis

- Node.js >= 20 (testé avec Node 22)

## Installation

```bash
npm install
```

## Configuration

```bash
cp .env.example .env
# puis éditez .env et renseignez votre clé :
# MISTRAL_API_KEY=...
```

La clé est disponible sur [console.mistral.ai](https://console.mistral.ai/api-keys/).
`.env` est ignoré par git (voir `.gitignore`) et ne doit jamais être commité.

## Exécution en local

```bash
npm run dev    # avec rechargement automatique (tsx watch)
# ou
npm start      # sans rechargement
```

Puis ouvrez http://localhost:3000 dans votre navigateur.

## Vérification

```bash
npm run typecheck
```

## Structure

```
server.ts          Serveur HTTP : sert public/ et expose POST /api/chat
public/index.html  Interface de chat (HTML/CSS/JS vanilla)
.env.example       Exemple de configuration (la vraie clé va dans .env)
```

## Fonctionnement

1. Le navigateur envoie l'historique complet des messages à `POST /api/chat`.
2. Le serveur appelle `client.chat.complete({ model: 'mistral-small-latest', messages })`.
3. Seule la réponse de l'assistant est renvoyée au navigateur.

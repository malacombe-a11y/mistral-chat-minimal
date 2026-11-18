import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Mistral } from '@mistralai/mistralai';

try {
  process.loadEnvFile('.env');
} catch {
  // pas de fichier .env : la clé devra venir de l'environnement
}

const PORT = Number(process.env.PORT ?? 3000);
const MODEL = 'mistral-small-latest';
const PUBLIC_DIR = join(fileURLToPath(new URL('.', import.meta.url)), 'public');

const apiKey = process.env.MISTRAL_API_KEY;
if (!apiKey) {
  console.error('Erreur : variable MISTRAL_API_KEY manquante (voir .env.example).');
  process.exit(1);
}

const client = new Mistral({ apiKey });

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw) return {};
  return JSON.parse(raw);
}

async function handleChat(req: IncomingMessage, res: ServerResponse) {
  let body: unknown;
  try {
    body = await readBody(req);
  } catch {
    return sendJson(res, 400, { error: 'JSON invalide.' });
  }

  const messages = (body as { messages?: unknown }).messages;
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    !messages.every(
      (m): m is ChatMessage =>
        typeof m === 'object' && m !== null &&
        (m.role === 'user' || m.role === 'assistant' || m.role === 'system') &&
        typeof m.content === 'string'
    )
  ) {
    return sendJson(res, 400, { error: "messages requis : [{ role, content }]" });
  }

  try {
    const completion = await client.chat.complete({ model: MODEL, messages });
    const content = completion.choices[0]?.message?.content;
    const reply = typeof content === 'string' ? content : '';
    sendJson(res, 200, { reply });
  } catch (err) {
    console.error(err);
    sendJson(res, 502, { error: "Échec de l'appel à l'API Mistral." });
  }
}

async function serveStatic(req: IncomingMessage, res: ServerResponse, pathname: string) {
  const rel = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = normalize(join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end('Interdit');
    return;
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404).end('Introuvable');
  }
}

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  if (req.method === 'POST' && pathname === '/api/chat') {
    void handleChat(req, res);
  } else if (req.method === 'GET') {
    void serveStatic(req, res, pathname);
  } else {
    res.writeHead(405).end('Méthode non autorisée');
  }
});

server.listen(PORT, () => {
  console.log(`Chat disponible sur http://localhost:${PORT}`);
});

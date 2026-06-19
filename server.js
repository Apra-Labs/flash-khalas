import express from 'express';
import cors from 'cors';
import { readFile, mkdir, writeFile } from 'fs/promises';
import { watchFile, unwatchFile, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = join(homedir(), '.apra-fleet', 'data');
const STATUSLINE_PATH = join(DATA_DIR, 'statusline.txt');
const STATE_PATH = join(DATA_DIR, 'statusline-state.json');
const REQUEST_PATH = join(DATA_DIR, 'flash-khalas-request.json');

app.use(cors());
app.use(express.json({ limit: '10kb' }));

async function readSafe(path) {
  try {
    return await readFile(path, 'utf-8');
  } catch {
    return null;
  }
}

app.post('/api/dispatch', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt is required' });
  }
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(REQUEST_PATH, JSON.stringify({ prompt, timestamp: Date.now() }));
  res.json({ ok: true, message: `Dispatched: "${prompt}"` });
});

app.get('/api/status', async (_req, res) => {
  const [statusline, stateRaw] = await Promise.all([
    readSafe(STATUSLINE_PATH),
    readSafe(STATE_PATH),
  ]);
  let state = null;
  if (stateRaw) {
    try { state = JSON.parse(stateRaw); } catch (e) { console.warn('Failed to parse statusline-state.json:', e.message); }
  }
  res.json({ statusline: statusline?.trim() || null, state });
});

app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('data: connected\n\n');

  let lastContent = '';
  const onChange = async () => {
    const content = (await readSafe(STATUSLINE_PATH)) || '';
    if (content === lastContent) return;
    lastContent = content;
    const stateRaw = await readSafe(STATE_PATH);
    let state = null;
    if (stateRaw) {
      try { state = JSON.parse(stateRaw); } catch (e) { console.warn('Failed to parse statusline-state.json in SSE:', e.message); }
    }
    res.write(`data: ${JSON.stringify({ statusline: content.trim(), state })}\n\n`);
    if (content.includes('feature-complete')) {
      res.write(`event: feature-complete\ndata: {}\n\n`);
    }
  };

  if (existsSync(STATUSLINE_PATH)) {
    watchFile(STATUSLINE_PATH, { interval: 1000 }, onChange);
  } else {
    const interval = setInterval(async () => {
      if (existsSync(STATUSLINE_PATH)) {
        clearInterval(interval);
        watchFile(STATUSLINE_PATH, { interval: 1000 }, onChange);
        onChange();
      }
    }, 2000);
    req.on('close', () => clearInterval(interval));
  }

  req.on('close', () => {
    unwatchFile(STATUSLINE_PATH, onChange);
  });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist'));
}

app.listen(PORT, () => {
  console.log(`Fleet API server on http://localhost:${PORT}`);
});

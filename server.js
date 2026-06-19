import express from 'express';
import cors from 'cors';
import { readFile, readdir, stat, mkdir, writeFile, appendFile } from 'fs/promises';
import { watchFile, unwatchFile, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { parsePipelineTasks } from './lib/pipeline.js';

const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = join(homedir(), '.apra-fleet', 'data');
const LOGS_DIR = join(DATA_DIR, 'logs');
const STATUSLINE_PATH = join(DATA_DIR, 'statusline.txt');
const STATE_PATH = join(DATA_DIR, 'statusline-state.json');
const REQUEST_PATH = join(DATA_DIR, 'flash-khalas-request.json');
const DISPATCHES_PATH = join(DATA_DIR, 'flash-khalas-dispatches.jsonl');

if (process.env.NODE_ENV !== 'production') {
  app.use(cors());
}
app.use(express.json({ limit: '100kb' }));

async function readSafe(path) {
  try {
    return await readFile(path, 'utf-8');
  } catch {
    return null;
  }
}

function extractTaskId(prompt) {
  const m = (prompt || '').match(/^\[([a-z0-9]+)\]/);
  return m ? m[1] : null;
}

function workFolderToClaudeProjectDir(workFolder) {
  return join(CLAUDE_PROJECTS_DIR, workFolder.replace(/\//g, '-'));
}

async function readSessionFiles(memberName, projectDir) {
  const files = await readdir(projectDir).catch(() => []);
  const runs = [];

  await Promise.all(
    files
      .filter((f) => /^[0-9a-f-]{36}\.jsonl$/.test(f))
      .map(async (file) => {
        const raw = await readSafe(join(projectDir, file));
        if (!raw) return;

        let currentRun = null;
        let lastResponse = null;

        for (const line of raw.split('\n')) {
          if (!line.trim()) continue;
          let entry;
          try { entry = JSON.parse(line); } catch { continue; }

          if (entry.type === 'queue-operation' && entry.operation === 'enqueue') {
            if (currentRun) {
              if (lastResponse) currentRun.response = lastResponse;
              runs.push(currentRun);
            }
            currentRun = {
              member: memberName,
              taskId: extractTaskId(entry.content),
              response: null,
            };
            lastResponse = null;
          } else if (entry.type === 'assistant' && currentRun) {
            const content = entry.message?.content;
            if (Array.isArray(content)) {
              const text = content.filter((c) => c.type === 'text').map((c) => c.text).join('');
              if (text) lastResponse = text;
            }
          }
        }

        if (currentRun) {
          if (lastResponse) currentRun.response = lastResponse;
          runs.push(currentRun);
        }
      })
  );

  return runs;
}

async function readAllTranscriptData() {
  const registryRaw = await readSafe(join(DATA_DIR, 'registry.json'));
  if (!registryRaw) return {};
  let registry;
  try { registry = JSON.parse(registryRaw); } catch { return {}; }

  const agents = Array.isArray(registry.agents) ? registry.agents : [];
  const byTaskId = {};

  await Promise.all(
    agents.map(async (agent) => {
      const memberName = agent.friendlyName;
      const workFolder = agent.workFolder;
      if (!memberName || !workFolder) return;
      const projectDir = workFolderToClaudeProjectDir(workFolder);
      const runs = await readSessionFiles(memberName, projectDir);
      for (const run of runs) {
        if (run.taskId && run.response) {
          byTaskId[run.taskId] = run.response;
        }
      }
    })
  );

  return byTaskId;
}

async function readAllLogFiles() {
  const files = await readdir(LOGS_DIR).catch(() => []);
  const logFiles = files.filter((f) => /^fleet-\d+\.log$/.test(f));
  if (logFiles.length === 0) return null;
  const contents = await Promise.all(
    logFiles.map((f) => readSafe(join(LOGS_DIR, f)))
  );
  return contents.filter(Boolean).join('\n');
}

let lastDispatchMs = 0;
const DISPATCH_COOLDOWN_MS = 2000;

app.post('/api/dispatch', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt is required' });
  }
  const now = Date.now();
  if (now - lastDispatchMs < DISPATCH_COOLDOWN_MS) {
    return res.status(429).json({ error: 'Rate limited — wait 2 seconds between dispatches' });
  }
  lastDispatchMs = now;
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(REQUEST_PATH, JSON.stringify({ prompt, timestamp: now }));
  res.json({ ok: true, message: `Dispatched: "${prompt}"` });
});

async function readDispatches() {
  const raw = await readSafe(DISPATCHES_PATH);
  if (!raw) return [];
  const entries = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try { entries.push(JSON.parse(line)); } catch { continue; }
  }
  return entries;
}

function matchesDispatch(task, dispatch) {
  if (dispatch.member !== task.member) return false;
  const taskTs = new Date(task.startedAt).getTime();
  const dTs = new Date(dispatch.ts).getTime();
  if (Math.abs(dTs - taskTs) < 300000) return true;
  if (task.prompt && dispatch.prompt) {
    const truncated = task.prompt.replace(/\.{3}$/, '');
    if (dispatch.prompt.startsWith(truncated)) return true;
  }
  return false;
}

function mergeDispatchData(tasks, dispatches, transcriptData) {
  for (const task of tasks) {
    // Explicit PM dispatches take priority
    let best = null;
    for (const d of dispatches) {
      if (!matchesDispatch(task, d)) continue;
      if (!best || d.response) best = d;
    }
    if (best) {
      if (best.prompt) task.fullPrompt = best.prompt;
      if (best.response) task.response = best.response;
    }

    // Fall back to Claude session transcript for response
    if (!task.response && transcriptData) {
      const taskId = extractTaskId(task.prompt);
      if (taskId && transcriptData[taskId]) {
        task.response = transcriptData[taskId];
      }
    }
  }
  return tasks;
}

async function autoRecordDispatches(tasks, existingDispatches) {
  const newEntries = [];
  for (const task of tasks) {
    if (!task.startedAt || !task.member || !task.prompt) continue;
    const alreadyRecorded = existingDispatches.some((d) => matchesDispatch(task, d));
    if (!alreadyRecorded) {
      newEntries.push({ ts: task.startedAt, member: task.member, prompt: task.prompt, response: null });
    }
  }
  if (newEntries.length === 0) return;
  await mkdir(DATA_DIR, { recursive: true });
  await appendFile(DISPATCHES_PATH, newEntries.map((e) => JSON.stringify(e)).join('\n') + '\n');
}

app.post('/api/dispatches', async (req, res) => {
  const { ts, member, prompt, response } = req.body;
  if (!member || !prompt) {
    return res.status(400).json({ error: 'member and prompt are required' });
  }
  await mkdir(DATA_DIR, { recursive: true });
  const entry = JSON.stringify({ ts: ts || new Date().toISOString(), member, prompt, response: response || null });
  await appendFile(DISPATCHES_PATH, entry + '\n');
  res.json({ ok: true });
});

app.get('/api/pipeline', async (_req, res) => {
  try {
    const [raw, dispatches, transcriptData] = await Promise.all([
      readAllLogFiles(),
      readDispatches(),
      readAllTranscriptData(),
    ]);
    if (!raw) return res.json([]);
    const tasks = parsePipelineTasks(raw);
    await autoRecordDispatches(tasks, dispatches);
    res.json(mergeDispatchData(tasks, dispatches, transcriptData));
  } catch (err) {
    console.warn('Failed to parse pipeline:', err.message);
    res.json([]);
  }
});

app.get('/api/status', async (_req, res) => {
  const [statusline, stateRaw] = await Promise.all([
    readSafe(STATUSLINE_PATH),
    readSafe(STATE_PATH),
  ]);
  let state = null;
  if (stateRaw) {
    try { state = JSON.parse(stateRaw); } catch (e) { console.warn('Failed to parse state:', e.message); }
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

  const cleanup = { interval: null, watching: false };
  let lastContent = '';

  const onChange = async () => {
    const content = (await readSafe(STATUSLINE_PATH)) || '';
    if (content === lastContent) return;
    lastContent = content;
    const stateRaw = await readSafe(STATE_PATH);
    let state = null;
    if (stateRaw) {
      try { state = JSON.parse(stateRaw); } catch (e) { console.warn('Failed to parse state in SSE:', e.message); }
    }
    res.write(`data: ${JSON.stringify({ statusline: content.trim(), state })}\n\n`);
    if (content.includes('feature-complete')) {
      res.write(`event: feature-complete\ndata: {}\n\n`);
    }
  };

  if (existsSync(STATUSLINE_PATH)) {
    watchFile(STATUSLINE_PATH, { interval: 1000 }, onChange);
    cleanup.watching = true;
  } else {
    cleanup.interval = setInterval(() => {
      if (existsSync(STATUSLINE_PATH)) {
        clearInterval(cleanup.interval);
        cleanup.interval = null;
        watchFile(STATUSLINE_PATH, { interval: 1000 }, onChange);
        cleanup.watching = true;
        onChange();
      }
    }, 2000);
  }

  req.on('close', () => {
    if (cleanup.interval) clearInterval(cleanup.interval);
    if (cleanup.watching) unwatchFile(STATUSLINE_PATH, onChange);
  });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static('dist'));
}

app.listen(PORT, () => {
  console.log(`Fleet API server on http://localhost:${PORT}`);
});

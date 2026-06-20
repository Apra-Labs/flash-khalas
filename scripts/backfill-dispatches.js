#!/usr/bin/env node
// One-time script: reads all fleet logs and POSTs flash-khalas dispatch records to /api/dispatches.
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const LOGS_DIR = join(homedir(), '.apra-fleet', 'data', 'logs');
const API_URL = 'http://localhost:3001/api/dispatches';

const PROMPT_RE = /^\[([^\]]+)\]\s+resume=\w+\s+timeout=\d+s\s+([\s\S]+)/;

async function main() {
  const files = await readdir(LOGS_DIR).catch(() => []);
  const logFiles = files.filter((f) => /^fleet-\d+\.log$/.test(f));

  // Two-pass: collect entries, then resolve full prompts from prompt_full lines
  const entries = new Map(); // inv -> { ts, member, prompt }

  for (const file of logFiles.sort()) {
    const raw = await readFile(join(LOGS_DIR, file), 'utf-8').catch(() => null);
    if (!raw) continue;

    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      let obj;
      try { obj = JSON.parse(line); } catch { continue; }

      if (obj.tag !== 'execute_prompt') continue;
      if (!obj.mem?.includes('flash-khalas')) continue;

      const msg = obj.msg || '';

      // Start entry — captures truncated prompt
      const match = msg.match(PROMPT_RE);
      if (match && obj.inv) {
        entries.set(obj.inv, { ts: obj.ts, member: obj.mem, prompt: match[2].trim() });
        continue;
      }

      // Full prompt entry — replaces truncated version
      if (msg === 'prompt_full' && obj.data?.prompt && obj.inv && entries.has(obj.inv)) {
        entries.get(obj.inv).prompt = obj.data.prompt;
      }
    }
  }

  let posted = 0;
  let failed = 0;

  for (const entry of entries.values()) {
    const body = JSON.stringify(entry);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (res.ok) {
        posted++;
        process.stdout.write(`✓ ${entry.member} @ ${entry.ts.slice(0, 19)}: ${entry.prompt.slice(0, 60)}\n`);
      } else {
        failed++;
        process.stdout.write(`✗ HTTP ${res.status} for ${entry.member}\n`);
      }
    } catch (e) {
      failed++;
      process.stdout.write(`✗ ${e.message}\n`);
    }
  }

  console.log(`\nDone: ${posted} posted, ${failed} failed`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });

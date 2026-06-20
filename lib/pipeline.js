export function inferPhase(member, prompt) {
  const p = (prompt || '').toLowerCase();
  if (member.includes('reviewer')) return 'review';
  if (p.includes('reviewer') || p.includes('feedback') || p.includes('fix')) return 'fix';
  return 'implement';
}

export function parsePipelineTasks(raw) {
  const tasks = [];
  const pending = {};

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    if (obj.tag === 'stall_poll_tick') continue;
    if (!obj.mem || !obj.mem.includes('flash-khallas')) continue;

    const mem = obj.mem;
    const msg = obj.msg || '';

    if (obj.tag !== 'execute_prompt') continue;

    const startMatch = msg.match(/^\[([^\]]+)\]\s+resume=(\w+)\s+timeout=(\d+)s\s+([\s\S]+)/);
    if (startMatch) {
      if (pending[mem]) {
        pending[mem].status = 'interrupted';
        tasks.push(pending[mem]);
      }
      const prompt = startMatch[4].trim();
      pending[mem] = {
        member: mem,
        model: startMatch[1],
        prompt,
        startedAt: obj.ts,
        status: 'running',
        phase: inferPhase(mem, prompt),
      };
      continue;
    }

    if (msg === 'prompt_full' && obj.data?.prompt && pending[mem]) {
      pending[mem].prompt = obj.data.prompt;
      pending[mem].phase = inferPhase(mem, obj.data.prompt);
      continue;
    }

    if (/^pid=\d+$/.test(msg)) continue;

    const endMatch = msg.match(/^exit=(\d+)\s+in=(\d+)\s+out=(\d+)\s+elapsed=(\d+)ms$/);
    if (endMatch && pending[mem]) {
      Object.assign(pending[mem], {
        tokensIn: parseInt(endMatch[2]),
        tokensOut: parseInt(endMatch[3]),
        elapsedMs: parseInt(endMatch[4]),
        endedAt: obj.ts,
        status: endMatch[1] === '0' ? 'done' : 'error',
      });
      tasks.push(pending[mem]);
      pending[mem] = null;
      continue;
    }

    if (/Command timed out/.test(msg) && pending[mem]) {
      const el = msg.match(/elapsed=(\d+)ms/);
      if (el) pending[mem].elapsedMs = parseInt(el[1]);
      pending[mem].status = 'timeout';
      pending[mem].endedAt = obj.ts;
      tasks.push(pending[mem]);
      pending[mem] = null;
    }
  }

  for (const mem of Object.keys(pending)) {
    if (pending[mem]) tasks.push(pending[mem]);
  }

  return tasks;
}

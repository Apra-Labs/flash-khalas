import { describe, it, expect } from 'vitest';
import { inferPhase, parsePipelineTasks } from '../lib/pipeline.js';

describe('inferPhase', () => {
  it('returns review for reviewer members', () => {
    expect(inferPhase('flash-khallas-reviewer', 'Review the code')).toBe('review');
  });

  it('returns fix for doer prompts mentioning reviewer feedback', () => {
    expect(inferPhase('flash-khallas-doer', 'Reviewer found 2 issues. Fix them')).toBe('fix');
    expect(inferPhase('flash-khallas-doer', 'Apply these feedback items')).toBe('fix');
  });

  it('returns implement for doer prompts without fix keywords', () => {
    expect(inferPhase('flash-khallas-doer', 'Implement GitHub issue #12')).toBe('implement');
  });

  it('returns implement for empty prompt', () => {
    expect(inferPhase('flash-khallas-doer', '')).toBe('implement');
  });
});

describe('parsePipelineTasks', () => {
  it('returns empty array for empty input', () => {
    expect(parsePipelineTasks('')).toEqual([]);
  });

  it('parses a complete execute_prompt cycle', () => {
    const lines = [
      JSON.stringify({ ts: '2026-06-19T10:00:00+04:00', tag: 'execute_prompt', mem: 'flash-khallas-doer', msg: '[claude-sonnet-4-6] resume=false timeout=300s Implement issue #12' }),
      JSON.stringify({ ts: '2026-06-19T10:00:01+04:00', tag: 'execute_prompt', mem: 'flash-khallas-doer', msg: 'pid=12345' }),
      JSON.stringify({ ts: '2026-06-19T10:01:00+04:00', tag: 'execute_prompt', mem: 'flash-khallas-doer', msg: 'exit=0 in=10 out=500 elapsed=60000ms' }),
    ].join('\n');

    const tasks = parsePipelineTasks(lines);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toEqual({
      member: 'flash-khallas-doer',
      model: 'claude-sonnet-4-6',
      prompt: 'Implement issue #12',
      startedAt: '2026-06-19T10:00:00+04:00',
      endedAt: '2026-06-19T10:01:00+04:00',
      status: 'done',
      phase: 'implement',
      tokensIn: 10,
      tokensOut: 500,
      elapsedMs: 60000,
    });
  });

  it('handles timeout status', () => {
    const lines = [
      JSON.stringify({ ts: '2026-06-19T10:00:00+04:00', tag: 'execute_prompt', mem: 'flash-khallas-doer', msg: '[claude-sonnet-4-6] resume=false timeout=300s Implement issue #12' }),
      JSON.stringify({ ts: '2026-06-19T10:05:00+04:00', tag: 'execute_prompt', mem: 'flash-khallas-doer', msg: 'Command timed out after 300000ms of inactivity elapsed=300000ms' }),
    ].join('\n');

    const tasks = parsePipelineTasks(lines);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].status).toBe('timeout');
    expect(tasks[0].elapsedMs).toBe(300000);
  });

  it('marks still-running tasks as running', () => {
    const lines = JSON.stringify({
      ts: '2026-06-19T10:00:00+04:00', tag: 'execute_prompt', mem: 'flash-khallas-doer',
      msg: '[claude-sonnet-4-6] resume=true timeout=600s Working on something',
    });

    const tasks = parsePipelineTasks(lines);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].status).toBe('running');
  });

  it('filters out non-flash-khallas members', () => {
    const lines = JSON.stringify({
      ts: '2026-06-19T10:00:00+04:00', tag: 'execute_prompt', mem: 'other-doer',
      msg: '[claude-sonnet-4-6] resume=false timeout=300s Do something',
    });

    expect(parsePipelineTasks(lines)).toEqual([]);
  });

  it('filters out stall_poll_tick entries', () => {
    const lines = JSON.stringify({
      ts: '2026-06-19T10:00:00+04:00', tag: 'stall_poll_tick', mem: 'flash-khallas-doer',
      msg: 'tick',
    });

    expect(parsePipelineTasks(lines)).toEqual([]);
  });

  it('parses interleaved doer and reviewer tasks', () => {
    const lines = [
      JSON.stringify({ ts: 'T1', tag: 'execute_prompt', mem: 'flash-khallas-doer', msg: '[claude-sonnet-4-6] resume=false timeout=300s Implement feature' }),
      JSON.stringify({ ts: 'T2', tag: 'execute_prompt', mem: 'flash-khallas-doer', msg: 'exit=0 in=5 out=100 elapsed=30000ms' }),
      JSON.stringify({ ts: 'T3', tag: 'execute_prompt', mem: 'flash-khallas-reviewer', msg: '[claude-opus-4-6] resume=false timeout=600s Review the code' }),
      JSON.stringify({ ts: 'T4', tag: 'execute_prompt', mem: 'flash-khallas-reviewer', msg: 'exit=0 in=8 out=200 elapsed=45000ms' }),
    ].join('\n');

    const tasks = parsePipelineTasks(lines);
    expect(tasks).toHaveLength(2);
    expect(tasks[0].phase).toBe('implement');
    expect(tasks[0].model).toBe('claude-sonnet-4-6');
    expect(tasks[1].phase).toBe('review');
    expect(tasks[1].model).toBe('claude-opus-4-6');
  });

  it('handles non-zero exit code as error', () => {
    const lines = [
      JSON.stringify({ ts: 'T1', tag: 'execute_prompt', mem: 'flash-khallas-doer', msg: '[claude-sonnet-4-6] resume=false timeout=300s Task' }),
      JSON.stringify({ ts: 'T2', tag: 'execute_prompt', mem: 'flash-khallas-doer', msg: 'exit=1 in=5 out=100 elapsed=10000ms' }),
    ].join('\n');

    const tasks = parsePipelineTasks(lines);
    expect(tasks[0].status).toBe('error');
  });

  it('skips malformed JSON lines gracefully', () => {
    const lines = [
      'not json at all',
      JSON.stringify({ ts: 'T1', tag: 'execute_prompt', mem: 'flash-khallas-doer', msg: '[claude-sonnet-4-6] resume=false timeout=300s Task' }),
      '{broken json',
      JSON.stringify({ ts: 'T2', tag: 'execute_prompt', mem: 'flash-khallas-doer', msg: 'exit=0 in=5 out=100 elapsed=10000ms' }),
    ].join('\n');

    const tasks = parsePipelineTasks(lines);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].status).toBe('done');
  });
});

import { describe, it, expect } from 'vitest';
import { parseStatusline } from '../src/hooks/useFleetStatus';

describe('parseStatusline', () => {
  it('returns empty array for null/empty input', () => {
    expect(parseStatusline(null)).toEqual([]);
    expect(parseStatusline('')).toEqual([]);
  });

  it('parses a busy member', () => {
    const line = '🔵2 flash-khallas-doer:⚡ busy(02:14)';
    const result = parseStatusline(line);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      icon: '🔵2',
      name: 'flash-khallas-doer',
      statusIcon: '⚡',
      status: 'busy',
      elapsed: '02:14',
    });
  });

  it('parses an idle member', () => {
    const line = '🟢2 flash-khallas-reviewer:💤 idle';
    const result = parseStatusline(line);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      icon: '🟢2',
      name: 'flash-khallas-reviewer',
      statusIcon: '💤',
      status: 'idle',
      elapsed: null,
    });
  });

  it('parses multiple members on one line', () => {
    const line = '🔵2 flash-khallas-doer:⚡ busy(02:14)  🟢2 flash-khallas-reviewer:💤 idle';
    const result = parseStatusline(line);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('flash-khallas-doer');
    expect(result[1].name).toBe('flash-khallas-reviewer');
  });

  it('filters out non-flash-khallas members', () => {
    const line = '🔴3 some-member:❌ error';
    const result = parseStatusline(line);
    expect(result).toHaveLength(0);
  });

  it('parses flash-khallas error status', () => {
    const line = '🔴3 flash-khallas-doer:❌ error';
    const result = parseStatusline(line);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      icon: '🔴3',
      name: 'flash-khallas-doer',
      statusIcon: '❌',
      status: 'error',
      elapsed: null,
    });
  });

  it('returns empty array for garbage/unexpected input', () => {
    expect(parseStatusline('not a status line at all')).toEqual([]);
    expect(parseStatusline('!!!@@@###$$$')).toEqual([]);
    expect(parseStatusline('12345 random words here')).toEqual([]);
  });
});

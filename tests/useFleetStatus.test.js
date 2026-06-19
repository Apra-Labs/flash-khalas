import { describe, it, expect } from 'vitest';
import { parseStatusline } from '../src/hooks/useFleetStatus';

describe('parseStatusline', () => {
  it('returns empty array for null/empty input', () => {
    expect(parseStatusline(null)).toEqual([]);
    expect(parseStatusline('')).toEqual([]);
  });

  it('parses a busy member', () => {
    const line = '🔵2 flash-khalas-doer:⚡ busy(02:14)';
    const result = parseStatusline(line);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      icon: '🔵',
      id: 2,
      name: 'flash-khalas-doer',
      statusIcon: '⚡',
      status: 'busy',
      elapsed: '02:14',
    });
  });

  it('parses an idle member', () => {
    const line = '🟢2 flash-khalas-reviewer:💤 idle';
    const result = parseStatusline(line);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      icon: '🟢',
      id: 2,
      name: 'flash-khalas-reviewer',
      statusIcon: '💤',
      status: 'idle',
      elapsed: null,
    });
  });

  it('parses multiple members on one line', () => {
    const line = '🔵2 flash-khalas-doer:⚡ busy(02:14)  🟢2 flash-khalas-reviewer:💤 idle';
    const result = parseStatusline(line);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('flash-khalas-doer');
    expect(result[1].name).toBe('flash-khalas-reviewer');
  });
});

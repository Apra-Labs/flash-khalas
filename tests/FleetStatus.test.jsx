import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FleetStatus from '../src/components/FleetStatus';

describe('FleetStatus', () => {
  it('shows no members message when empty', () => {
    render(<FleetStatus members={[]} />);
    expect(screen.getByText(/No fleet members detected/)).toBeInTheDocument();
  });

  it('shows member cards with names and status', () => {
    const members = [
      { icon: '🔵2', name: 'flash-khalas-doer', statusIcon: '⚡', status: 'busy', elapsed: '02:14' },
      { icon: '🟢2', name: 'flash-khalas-reviewer', statusIcon: '💤', status: 'idle', elapsed: null },
    ];
    render(<FleetStatus members={members} />);
    expect(screen.getByText('flash-khalas-doer')).toBeInTheDocument();
    expect(screen.getByText('flash-khalas-reviewer')).toBeInTheDocument();
    expect(screen.getByText(/02:14/)).toBeInTheDocument();
  });

  it('applies busy animation class', () => {
    const members = [
      { icon: '🔵2', name: 'flash-khalas-doer', statusIcon: '⚡', status: 'busy', elapsed: '01:00' },
    ];
    render(<FleetStatus members={members} />);
    const card = screen.getByText('flash-khalas-doer').closest('.member-card');
    expect(card.classList.contains('busy')).toBe(true);
  });

  it('sorts busy members before idle', () => {
    const members = [
      { icon: '🟢2', name: 'flash-khalas-reviewer', statusIcon: '💤', status: 'idle', elapsed: null },
      { icon: '🔵2', name: 'flash-khalas-doer', statusIcon: '⚡', status: 'busy', elapsed: '01:00' },
    ];
    render(<FleetStatus members={members} />);
    const names = [...document.querySelectorAll('.member-card .member-card-name')].map((el) => el.textContent);
    expect(names[0]).toBe('flash-khalas-doer');
    expect(names[1]).toBe('flash-khalas-reviewer');
  });

  it('sorts busy members with less elapsed time first', () => {
    const members = [
      { icon: '🔵2', name: 'flash-khalas-doer', statusIcon: '⚡', status: 'busy', elapsed: '05:00' },
      { icon: '🔵2', name: 'flash-khalas-fixer', statusIcon: '⚡', status: 'busy', elapsed: '01:30' },
    ];
    render(<FleetStatus members={members} />);
    const names = [...document.querySelectorAll('.member-card .member-card-name')].map((el) => el.textContent);
    expect(names[0]).toBe('flash-khalas-fixer');
    expect(names[1]).toBe('flash-khalas-doer');
  });
});

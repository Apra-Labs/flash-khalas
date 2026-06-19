import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FleetStatus from '../src/components/FleetStatus';

vi.mock('../src/hooks/useFleetPipeline', () => ({
  default: () => ({ tasks: [] }),
}));

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

  it('shows idle pipeline message when no tasks', () => {
    const members = [
      { icon: '🟢2', name: 'flash-khalas-doer', statusIcon: '💤', status: 'idle', elapsed: null },
    ];
    render(<FleetStatus members={members} />);
    expect(screen.getByText(/dispatch a task/i)).toBeInTheDocument();
  });

  it('applies busy animation class', () => {
    const members = [
      { icon: '🔵2', name: 'flash-khalas-doer', statusIcon: '⚡', status: 'busy', elapsed: '01:00' },
    ];
    render(<FleetStatus members={members} />);
    const card = screen.getByText('flash-khalas-doer').closest('.member-card');
    expect(card.classList.contains('busy')).toBe(true);
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FleetStatus from '../src/components/FleetStatus';

vi.mock('../src/hooks/useFleetPipeline', () => ({
  default: () => ({
    tasks: [
      {
        member: 'flash-khalas-doer',
        model: 'claude-sonnet-4-6',
        prompt: 'Implement issue #12...',
        fullPrompt: 'Implement issue #12: Add a lives system (3 lives before game over).',
        response: 'Done. Added lives system with 3 lives.',
        startedAt: '2026-06-19T12:00:00+04:00',
        endedAt: '2026-06-19T12:01:00+04:00',
        status: 'done',
        phase: 'implement',
        tokensIn: 10,
        tokensOut: 500,
        elapsedMs: 60000,
      },
    ],
  }),
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

  it('shows pipeline tasks as clickable cards', () => {
    const members = [
      { icon: '🟢2', name: 'flash-khalas-doer', statusIcon: '💤', status: 'idle', elapsed: null },
    ];
    render(<FleetStatus members={members} />);
    expect(screen.getByText('Implement')).toBeInTheDocument();
    expect(screen.getByText('1m 0s')).toBeInTheDocument();
  });

  it('opens modal with full prompt and response on task click', () => {
    const members = [
      { icon: '🟢2', name: 'flash-khalas-doer', statusIcon: '💤', status: 'idle', elapsed: null },
    ];
    render(<FleetStatus members={members} />);
    fireEvent.click(screen.getByText('Implement'));

    expect(screen.getByText(/Implement issue #12: Add a lives system/)).toBeInTheDocument();
    expect(screen.getByText(/Added lives system with 3 lives/)).toBeInTheDocument();
    expect(screen.getByText('claude-sonnet-4-6')).toBeInTheDocument();
  });

  it('closes modal on close button click', () => {
    const members = [
      { icon: '🟢2', name: 'flash-khalas-doer', statusIcon: '💤', status: 'idle', elapsed: null },
    ];
    render(<FleetStatus members={members} />);
    fireEvent.click(screen.getByText('Implement'));
    expect(screen.getByText(/Implement issue #12/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('✕'));
    expect(screen.queryByText(/Implement issue #12: Add a lives/)).not.toBeInTheDocument();
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

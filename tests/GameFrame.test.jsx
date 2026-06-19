import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GameFrame from '../src/components/GameFrame';

describe('GameFrame', () => {
  it('renders iframe with base src when featureComplete is false', () => {
    render(<GameFrame featureComplete={false} />);
    const iframe = screen.getByTitle('Flash Khalas Game');
    expect(iframe.src).toContain('/game/index.html');
    expect(iframe.src).not.toContain('?v=');
  });

  it('shows Reloading overlay when featureComplete is true', async () => {
    vi.useFakeTimers();
    render(<GameFrame featureComplete={true} />);
    expect(screen.getByText('Reloading...')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('adds cache-bust ?v= param to iframe src when featureComplete is true', () => {
    render(<GameFrame featureComplete={true} />);
    const iframe = screen.getByTitle('Flash Khalas Game');
    expect(iframe.src).toContain('?v=');
  });

  it('has no overlay when featureComplete is false', () => {
    render(<GameFrame featureComplete={false} />);
    expect(screen.queryByText('Reloading...')).not.toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../src/App';

vi.mock('../src/hooks/useFleetStatus', () => ({
  default: () => ({ members: [], featureComplete: false }),
}));

describe('App', () => {
  it('renders the header', () => {
    render(<App />);
    expect(screen.getByText('Flash Khallas')).toBeInTheDocument();
  });

  it('renders the fleet status panel', () => {
    render(<App />);
    expect(screen.getByText('APRA FLEET')).toBeInTheDocument();
  });

  it('renders the game iframe', () => {
    render(<App />);
    const iframe = document.querySelector('iframe[title="Flash Khallas Game"]');
    expect(iframe).toBeInTheDocument();
    expect(iframe.src).toContain('/game/index.html');
  });
});

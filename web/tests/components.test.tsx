import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, Kicker, Stat } from '@/components/ui/card';
import { EmptyState, Spinner, LoadingBlock } from '@/components/ui/feedback';

describe('Button', () => {
  it('renders its label and fires onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Start</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled while busy and does not fire', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick} disabled>Start</Button>);
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Badge', () => {
  it('renders label with the requested tone', () => {
    render(<Badge tone="success">Verified</Badge>);
    const el = screen.getByText('Verified');
    expect(el.className).toContain('bg-success-soft');
  });
});

describe('Card + Stat + Kicker', () => {
  it('renders a card with children', () => {
    render(<Card>hello</Card>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
  it('renders a stat with value and label', () => {
    render(<Stat label="Gross" value="$1,000" />);
    expect(screen.getByText('Gross')).toBeInTheDocument();
    expect(screen.getByText('$1,000')).toBeInTheDocument();
  });
  it('renders a kicker', () => {
    render(<Kicker>The product</Kicker>);
    expect(screen.getByText('The product')).toBeInTheDocument();
  });
});

describe('Feedback primitives', () => {
  it('renders a spinner with status role', () => {
    render(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
  it('renders a loading block', () => {
    render(<LoadingBlock label="Loading…" />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });
  it('renders an empty state with title + action', () => {
    render(
      <EmptyState title="No loads" body="Nothing here" action={<button>Go</button>} />,
    );
    expect(screen.getByText('No loads')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
  });
});

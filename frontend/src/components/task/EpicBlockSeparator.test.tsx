import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EpicBlockSeparator } from './EpicBlockSeparator';

describe('EpicBlockSeparator', () => {
  it('renders a separator element', () => {
    render(<EpicBlockSeparator />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });
});

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

// Simple test component for basic testing
const TestComponent = () => (
  <div data-testid="test-component">
    Basic Component Test
  </div>
);

describe('Basic Component Tests', () => {
  it('should render test component', () => {
    const { container } = render(<TestComponent />);
    expect(container).toBeInTheDocument();
  });

  it('should contain expected text', () => {
    const { container } = render(<TestComponent />);
    expect(container.textContent).toContain('Basic Component Test');
  });

  it('should render with proper test id', () => {
    const { container } = render(<TestComponent />);
    const element = container.querySelector('[data-testid="test-component"]');
    expect(element).toBeInTheDocument();
  });
}); 
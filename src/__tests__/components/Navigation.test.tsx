import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Navigation } from '@/components/Navigation';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('Navigation Component', () => {
  it('should render the navigation component without crashing', () => {
    const { container } = render(<Navigation />);
    expect(container).toBeInTheDocument();
  });

  it('should render navigation element', () => {
    const { container } = render(<Navigation />);
    const nav = container.querySelector('nav');
    expect(nav).toBeInTheDocument();
  });

  it('should contain CompAI brand text', () => {
    const { container } = render(<Navigation />);
    expect(container.textContent).toContain('CompAI');
  });

  it('should contain navigation items', () => {
    const { container } = render(<Navigation />);
    expect(container.textContent).toContain('Dashboard');
    expect(container.textContent).toContain('Chat Agent');
    expect(container.textContent).toContain('Competitors');
    expect(container.textContent).toContain('Reports');
    expect(container.textContent).toContain('Analytics');
  });

  it('should contain branding text', () => {
    const { container } = render(<Navigation />);
    expect(container.textContent).toContain('Competitor Research Agent');
  });
}); 
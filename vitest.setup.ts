import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

// Next.js mocks
vi.mock('next/image', () => ({
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return React.createElement('img', { ...props, alt: props.alt || '' });
  },
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) =>
    React.createElement('a', { href, ...rest }, children),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock Google OAuth globally to avoid provider requirement in tests
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess, onError }: any) =>
    React.createElement(
      'button',
      {
        onClick: () => onSuccess?.({ credential: 'id-token' }),
      },
      'Google'
    ),
}));

// Mock Embla carousel to avoid DOM/matchMedia requirements in tests
vi.mock('embla-carousel-react', () => {
  const api = {
    on: vi.fn(),
    off: vi.fn(),
    scrollPrev: vi.fn(),
    scrollNext: vi.fn(),
    canScrollPrev: vi.fn(() => false),
    canScrollNext: vi.fn(() => false),
  };
  const hook = () => [vi.fn(), api] as any;
  return { default: hook };
});

// Quiet console noise from tests
const consoleError = console.error;
console.error = (...args: any[]) => {
  const suppress =
    typeof args[0] === 'string' &&
    (args[0].includes('act(') ||
      args[0].includes('Warning:') ||
      args[0].includes('A tree hydrated'));
  if (!suppress) {
    consoleError(...args);
  }
};

// JSDOM lacks scrollIntoView; mock for components using it
if (typeof (Element as any).prototype.scrollIntoView !== 'function') {
  (Element as any).prototype.scrollIntoView = vi.fn();
}



import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Segmented } from '@/components/ui/Segmented';

describe('Segmented Control (W3C APG Radiogroup)', () => {
  const options = [
    { value: 'opt1', label: 'Option 1' },
    { value: 'opt2', label: 'Option 2' },
    { value: 'opt3', label: 'Option 3' },
  ];

  it('renders a radiogroup with proper accessibility semantics', () => {
    const html = renderToString(
      React.createElement(Segmented, {
        value: 'opt2',
        options,
        onChange: vi.fn(),
        label: 'Test Selection',
      })
    );

    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-label="Test Selection"');
    expect(html).toContain('Option 1');
    expect(html).toContain('Option 2');
    expect(html).toContain('Option 3');
  });

  it('sets aria-checked and roving tabindex correctly', () => {
    const html = renderToString(
      React.createElement(Segmented, {
        value: 'opt2',
        options,
        onChange: vi.fn(),
        label: 'Test Selection',
      })
    );

    // Active option opt2 has aria-checked="true" and tabindex="0"
    expect(html).toMatch(/role="radio"[^>]*aria-checked="true"[^>]*tabindex="0"[^>]*>Option 2<\/button>/);
    // Inactive options have aria-checked="false" and tabindex="-1"
    expect(html).toMatch(/role="radio"[^>]*aria-checked="false"[^>]*tabindex="-1"[^>]*>Option 1<\/button>/);
    expect(html).toMatch(/role="radio"[^>]*aria-checked="false"[^>]*tabindex="-1"[^>]*>Option 3<\/button>/);
  });
});

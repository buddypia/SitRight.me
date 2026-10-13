import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { getNextSegmentIndex, Segmented } from '@/components/ui/Segmented';

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

  it('sets tabindex="0" on first option when no option is active per W3C APG', () => {
    const html = renderToString(
      React.createElement(Segmented, {
        value: 'unselected',
        options,
        onChange: vi.fn(),
        label: 'Test Selection',
      })
    );

    // First option receives tabindex="0"
    expect(html).toMatch(/role="radio"[^>]*aria-checked="false"[^>]*tabindex="0"[^>]*>Option 1<\/button>/);
    // Subsequent options receive tabindex="-1"
    expect(html).toMatch(/role="radio"[^>]*aria-checked="false"[^>]*tabindex="-1"[^>]*>Option 2<\/button>/);
    expect(html).toMatch(/role="radio"[^>]*aria-checked="false"[^>]*tabindex="-1"[^>]*>Option 3<\/button>/);
  });

  it('handles arrow key navigation and cycles options cyclically via getNextSegmentIndex', () => {
    // ArrowRight on opt1 (index 0 of 3) moves to opt2 (index 1)
    expect(getNextSegmentIndex('ArrowRight', 0, 3)).toBe(1);
    // ArrowRight on opt3 (index 2 of 3) wraps to opt1 (index 0)
    expect(getNextSegmentIndex('ArrowRight', 2, 3)).toBe(0);

    // ArrowLeft on opt1 (index 0 of 3) wraps to opt3 (index 2)
    expect(getNextSegmentIndex('ArrowLeft', 0, 3)).toBe(2);
    // ArrowLeft on opt2 (index 1 of 3) moves to opt1 (index 0)
    expect(getNextSegmentIndex('ArrowLeft', 1, 3)).toBe(0);

    // ArrowDown on opt2 (index 1 of 3) moves to opt3 (index 2)
    expect(getNextSegmentIndex('ArrowDown', 1, 3)).toBe(2);
    // ArrowUp on opt3 (index 2 of 3) moves to opt2 (index 1)
    expect(getNextSegmentIndex('ArrowUp', 2, 3)).toBe(1);

    // Unrelated keys return -1
    expect(getNextSegmentIndex('Enter', 1, 3)).toBe(-1);
    expect(getNextSegmentIndex('Tab', 1, 3)).toBe(-1);
    expect(getNextSegmentIndex('ArrowRight', 0, 0)).toBe(-1);
  });
});

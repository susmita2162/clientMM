// src/components/ClaimsTable/utils.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateTotal,
  isClickable,
  getBackgroundColor,
  getBandedRowStyle,
} from '../../../src/components/ClaimsTable/utils';
import type { Theme } from '@mui/material';

function makeTheme(mode: 'light' | 'dark'): Theme {
  return { palette: { mode } } as Theme;
}

describe('calculateTotal', () => {
  it('sums HCFA and UB numeric strings', () => {
    expect(calculateTotal('5', '3')).toBe(8);
  });

  it('treats non-numeric input as 0 via parseInt NaN handling', () => {
    // parseInt('', 10) is NaN; NaN + 3 is NaN — this documents current behavior
    expect(Number.isNaN(calculateTotal('', '3'))).toBe(true);
  });

  it('handles both values as zero', () => {
    expect(calculateTotal('0', '0')).toBe(0);
  });
});

describe('isClickable', () => {
  it('returns true for positive numeric strings', () => {
    expect(isClickable('5')).toBe(true);
  });

  it('returns true for positive numbers', () => {
    expect(isClickable(12)).toBe(true);
  });

  it('returns false for zero', () => {
    expect(isClickable('0')).toBe(false);
    expect(isClickable(0)).toBe(false);
  });

  it('returns false for negative values', () => {
    expect(isClickable('-3')).toBe(false);
  });
});

describe('getBackgroundColor', () => {
  it('returns the light gray color in light mode', () => {
    const colorFn = getBackgroundColor('gray');
    expect(colorFn(makeTheme('light'))).toBe('#f5f5f5');
  });

  it('returns the dark gray color in dark mode', () => {
    const colorFn = getBackgroundColor('gray');
    expect(colorFn(makeTheme('dark'))).toBe('#2a2a2a');
  });

  it('returns the correct blue color per mode', () => {
    const colorFn = getBackgroundColor('blue');
    expect(colorFn(makeTheme('light'))).toBe('#e3f2fd');
    expect(colorFn(makeTheme('dark'))).toBe('#1a2e3e');
  });
});

describe('getBandedRowStyle', () => {
  it('assigns a different backgroundColor function for even vs odd rows', () => {
    const evenStyle = getBandedRowStyle(0) as {
      backgroundColor: (t: Theme) => string;
    };
    const oddStyle = getBandedRowStyle(1) as {
      backgroundColor: (t: Theme) => string;
    };

    const evenColor = evenStyle.backgroundColor(makeTheme('light'));
    const oddColor = oddStyle.backgroundColor(makeTheme('light'));

    expect(evenColor).not.toBe(oddColor);
  });

  it('removes the bottom border on the last row', () => {
    const style = getBandedRowStyle(0) as Record<string, unknown>;
    expect(style['&:last-child td, &:last-child th']).toEqual({
      borderBottom: 0,
    });
  });
});

// src/components/ClaimsTable/utils.ts
import { type SxProps, type Theme } from '@mui/material';

/**
 * Calculate total by summing HCFA and UB values
 */
export const calculateTotal = (hcfaValue: string, ubValue: string): number => {
  return parseInt(hcfaValue, 10) + parseInt(ubValue, 10);
};

/**
 * Check if value should be clickable (greater than 0)
 */
export const isClickable = (value: string | number): boolean => {
  const numValue = parseInt(String(value), 10);
  return numValue > 0;
};

// ============================================================================
// STYLE CONSTANTS
// ============================================================================

// Base header cell style
export const baseHeaderCell: SxProps<Theme> = {
  fontWeight: 700,
  fontSize: '0.875rem',
  py: 0.75,
  px: 0.5,
  whiteSpace: 'nowrap',
  borderRight: '1px solid',
  borderColor: 'divider',
};

// Sub-header cell style
export const subHeaderCell: SxProps<Theme> = {
  fontWeight: 600,
  fontSize: '0.875rem',
  py: 0.75,
  px: 0.5,
  whiteSpace: 'nowrap',
  borderRight: '1px solid',
  borderColor: 'divider',
};

// Data cell style
export const dataCell: SxProps<Theme> = {
  py: 1,
  px: 0.5,
  whiteSpace: 'nowrap',
  borderRight: '1px solid',
  borderColor: 'divider',
};

// Last column data cell (no right border)
export const lastDataCell: SxProps<Theme> = {
  py: 1,
  px: 0.5,
  whiteSpace: 'nowrap',
};

// Row hover effect
// export const rowHoverEffect: SxProps<Theme> = {
//   '&:last-child td, &:last-child th': {
//     borderBottom: 0,
//   },
//   '&:hover': {
//     backgroundColor: (theme) =>
//       theme.palette.mode === 'dark' ? '#2a2a2a' : '#f5f5f5',
//   },
// };

// Background colors helper
export const getBackgroundColor = (
  colorType: 'gray' | 'blue'
): ((theme: Theme) => string) => {
  const colors = {
    gray: { light: '#f5f5f5', dark: '#2a2a2a' },
    blue: { light: '#e3f2fd', dark: '#1a2e3e' },
  };

  return (theme: Theme) =>
    theme.palette.mode === 'dark'
      ? colors[colorType].dark
      : colors[colorType].light;
};

// Column widths
export const columnWidths = {
  claimStream: '100px',
  totalCount: '70px',
  dataColumn: '60px',
  aggregatedColumn: '80px',
};

// Banded row helper - alternating colors
export const getBandedRowStyle = (index: number): SxProps<Theme> => ({
  backgroundColor: (theme) =>
    index % 2 === 0
      ? theme.palette.mode === 'dark'
        ? '#1a1a1a'
        : '#fafafa'
      : theme.palette.mode === 'dark'
        ? '#121212'
        : '#ffffff',
  '&:hover': {
    backgroundColor: (theme) =>
      theme.palette.mode === 'dark' ? '#2a2a2a' : '#f5f5f5',
  },
  '&:last-child td, &:last-child th': {
    borderBottom: 0,
  },
});

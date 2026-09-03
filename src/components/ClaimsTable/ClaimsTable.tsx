// src/components/ClaimsTable/ClaimsTable.tsx
import { useState } from 'react';
import {
  Box,
  ButtonBase,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Typography,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { useClaimsData } from './useClaimsData';
import {
  calculateTotal,
  isClickable,
  baseHeaderCell,
  subHeaderCell,
  dataCell,
  lastDataCell,
  getBackgroundColor,
  columnWidths,
  getBandedRowStyle,
} from './utils';
import { claimsApi } from '../../services/claimsApi';
import { adaptHaltedClaimResponse } from '../../utils/claimAdapters';
import type { HaltedClaim, QueueContext } from '../../types/claims';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ClaimsTableProps {
  userName: string;
  onClaimSelected?: (
    claimNumber: string,
    claim: ReturnType<typeof adaptHaltedClaimResponse>
  ) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const parseColumnName = (
  columnName: string
): { category: string; claimType: string } => {
  const lower = columnName.toLowerCase();
  const category = lower.includes('pended') ? 'manual-pended' : 'manual-review';
  let claimType: string;
  if (lower.includes('hcfa')) claimType = 'hcfa';
  else if (lower.includes('ub')) claimType = 'ub';
  else claimType = 'all';
  return { category, claimType };
};

/** 'hcfa' → 'H' | 'ub' → 'U' | 'all' → '' */
const resolveApiClaimType = (claimType: string): string => {
  switch (claimType) {
    case 'hcfa':
      return 'H';
    case 'ub':
      return 'U';
    default:
      return '';
  }
};

// ── Component ─────────────────────────────────────────────────────────────────

const ClaimsTable = ({ userName, onClaimSelected }: ClaimsTableProps) => {
  const [showClaimType, setShowClaimType] = useState(false);

  // Per-cell loading key: "<claimStream>-<columnName>" | null.
  // Tracks exactly which cell is loading so only that cell shows a spinner
  // and all others are disabled (not spinning) during a pending request.
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const [navError, setNavError] = useState<string | null>(null);

  const { rows, loading, error } = useClaimsData();

  /**
   * Calls nextHalted directly, then navigates to ClientManualMatchDashboard
   * with the claim + queueContext in router state.
   *
   * No intermediate route. ClientManualMatchDashboard reads the claim from
   * location.state and uses queueContext to auto-advance after each action.
   */
  const handleCellClick = async (
    claimStream: string,
    columnName: string
  ): Promise<void> => {
    const key = `${claimStream}-${columnName}`;
    const { category, claimType } = parseColumnName(columnName);
    const apiClaimType = resolveApiClaimType(claimType);

    setLoadingKey(key);
    setNavError(null);

    try {
      const response = await claimsApi.getNextHaltedClaim({
        claimType: apiClaimType,
        pended: category === 'manual-pended',
        network: claimStream,
        lockedByUser: userName, // replace with auth user when available
        lockExpiration: 15,
      });

      if (response && (response as any).status?.statusCode === 'A') {
        setNavError(
          (response as any).status?.description ??
            'Claim is already locked by another user.'
        );
        return;
      }

      if (response) {
        const claim = adaptHaltedClaimResponse(response);

        if (!claim.claimNumber) {
          setNavError('Unable to load claim.');
          return;
        }

        if (onClaimSelected) {
          onClaimSelected(claim.claimNumber, claim);
        } else {
          console.warn('No onClaimSeleced handler provided.');
        }
      } else {
        setNavError('No halted claims are available for this selection.');
      }
    } catch {
      setNavError('Failed to load claim. Please try again.');
    } finally {
      setLoadingKey(null);
    }
  };

  const renderClickableCell = (
    value: string | number,
    claimStream: string,
    columnName: string
  ) => {
    if (!isClickable(value)) return value;

    const key = `${claimStream}-${columnName}`;
    const isThisLoading = loadingKey === key;
    const anyLoading = loadingKey !== null;

    return (
      <ButtonBase
        disabled={anyLoading}
        onClick={(e) => {
          e.stopPropagation();
          void handleCellClick(claimStream, columnName);
        }}
        sx={{
          cursor: anyLoading ? 'wait' : 'pointer',
          color: 'primary.main',
          fontWeight: 500,
          fontSize: 'inherit',
          fontFamily: 'inherit',
          borderRadius: '2px',
          width: '100%',
          px: 0.5,
          '&:hover': {
            textDecoration: 'underline',
            backgroundColor: 'transparent',
          },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: '2px',
          },
        }}
      >
        {isThisLoading ? <CircularProgress size={12} /> : value}
      </ButtonBase>
    );
  };

  // ── Loading / Error ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flex: 1,
          p: 2,
        }}
      >
        <Box sx={{ maxWidth: '600px', width: '100%' }}>
          <Alert severity='error' sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Typography variant='body2' color='text.secondary'>
            Failed to load data
          </Typography>
        </Box>
      </Box>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'auto',
        width: '100%',
        py: 1,
        px: { xs: 0.5, sm: 1 },
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: '900px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {navError && (
          <Alert
            severity='warning'
            sx={{ mb: 1.5 }}
            onClose={() => setNavError(null)}
          >
            {navError}
          </Alert>
        )}

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            mb: 1.5,
            px: 1,
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={showClaimType}
                onChange={(e) => setShowClaimType(e.target.checked)}
                sx={{ '& .MuiSvgIcon-root': { fontSize: { xs: 20, sm: 24 } } }}
              />
            }
            label={
              <Typography
                variant='body2'
                sx={{
                  fontWeight: 500,
                  fontSize: { xs: '0.813rem', sm: '0.875rem' },
                }}
              >
                Show Claim Type
              </Typography>
            }
            sx={{
              m: 0,
              '& .MuiFormControlLabel-label': { userSelect: 'none' },
            }}
          />
        </Box>

        <Paper elevation={3} sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
            <Table
              stickyHeader
              sx={{ minWidth: 650, tableLayout: 'auto' }}
              aria-label='claims summary table'
            >
              <TableHead>
                <TableRow>
                  <TableCell
                    rowSpan={2}
                    align='center'
                    sx={{
                      ...baseHeaderCell,
                      backgroundColor: getBackgroundColor('gray'),
                      width: columnWidths.claimStream,
                    }}
                  >
                    Claim Stream
                  </TableCell>
                  <TableCell
                    rowSpan={2}
                    align='center'
                    sx={{
                      ...baseHeaderCell,
                      backgroundColor: getBackgroundColor('gray'),
                      width: columnWidths.totalCount,
                    }}
                  >
                    Total claim count
                  </TableCell>
                  {showClaimType ? (
                    <>
                      <TableCell
                        colSpan={2}
                        align='center'
                        sx={{
                          ...baseHeaderCell,
                          backgroundColor: getBackgroundColor('blue'),
                        }}
                      >
                        Manual Review
                      </TableCell>
                      <TableCell
                        colSpan={2}
                        align='center'
                        sx={{
                          ...baseHeaderCell,
                          backgroundColor: getBackgroundColor('blue'),
                          borderRight: 'none',
                        }}
                      >
                        Manual Review Pended
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell
                        rowSpan={2}
                        align='center'
                        sx={{
                          ...baseHeaderCell,
                          backgroundColor: getBackgroundColor('blue'),
                          width: columnWidths.aggregatedColumn,
                        }}
                      >
                        Manual Review
                      </TableCell>
                      <TableCell
                        rowSpan={2}
                        align='center'
                        sx={{
                          ...baseHeaderCell,
                          backgroundColor: getBackgroundColor('blue'),
                          width: columnWidths.aggregatedColumn,
                          borderRight: 'none',
                        }}
                      >
                        Manual Review Pended
                      </TableCell>
                    </>
                  )}
                </TableRow>
                {showClaimType && (
                  <TableRow>
                    <TableCell
                      align='center'
                      sx={{
                        ...subHeaderCell,
                        backgroundColor: getBackgroundColor('blue'),
                        width: columnWidths.dataColumn,
                      }}
                    >
                      HCFA
                    </TableCell>
                    <TableCell
                      align='center'
                      sx={{
                        ...subHeaderCell,
                        backgroundColor: getBackgroundColor('blue'),
                        width: columnWidths.dataColumn,
                      }}
                    >
                      UB
                    </TableCell>
                    <TableCell
                      align='center'
                      sx={{
                        ...subHeaderCell,
                        backgroundColor: getBackgroundColor('blue'),
                        width: columnWidths.dataColumn,
                      }}
                    >
                      HCFA
                    </TableCell>
                    <TableCell
                      align='center'
                      sx={{
                        ...subHeaderCell,
                        backgroundColor: getBackgroundColor('blue'),
                        width: columnWidths.dataColumn,
                        borderRight: 'none',
                      }}
                    >
                      UB
                    </TableCell>
                  </TableRow>
                )}
              </TableHead>

              <TableBody>
                {rows.map((row, index) => (
                  <TableRow key={row.claimStream} sx={getBandedRowStyle(index)}>
                    <TableCell
                      component='th'
                      scope='row'
                      align='center'
                      sx={{ ...dataCell, fontWeight: 600 }}
                    >
                      {row.claimStream}
                    </TableCell>
                    <TableCell align='center' sx={dataCell}>
                      {renderClickableCell(
                        row.totalClaimCount,
                        row.claimStream,
                        'Total Claim Count'
                      )}
                    </TableCell>
                    {showClaimType ? (
                      <>
                        <TableCell align='center' sx={dataCell}>
                          {renderClickableCell(
                            row.manualMatchwithHCFA,
                            row.claimStream,
                            'Manual Review - HCFA'
                          )}
                        </TableCell>
                        <TableCell align='center' sx={dataCell}>
                          {renderClickableCell(
                            row.manualMatchwithUB,
                            row.claimStream,
                            'Manual Review - UB'
                          )}
                        </TableCell>
                        <TableCell align='center' sx={dataCell}>
                          {renderClickableCell(
                            row.manualMatchPendedwithHCFA,
                            row.claimStream,
                            'Manual Review Pended - HCFA'
                          )}
                        </TableCell>
                        <TableCell align='center' sx={lastDataCell}>
                          {renderClickableCell(
                            row.manualMatchPendedwithUB,
                            row.claimStream,
                            'Manual Review Pended - UB'
                          )}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell align='center' sx={dataCell}>
                          {renderClickableCell(
                            calculateTotal(
                              row.manualMatchwithHCFA,
                              row.manualMatchwithUB
                            ),
                            row.claimStream,
                            'Manual Review (Total)'
                          )}
                        </TableCell>
                        <TableCell align='center' sx={lastDataCell}>
                          {renderClickableCell(
                            calculateTotal(
                              row.manualMatchPendedwithHCFA,
                              row.manualMatchPendedwithUB
                            ),
                            row.claimStream,
                            'Manual Review Pended (Total)'
                          )}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Box>
  );
};

export default ClaimsTable;

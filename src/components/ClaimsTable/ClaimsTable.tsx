// src/components/ClaimsTable/ClaimsTable.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

/**
 * Maps a UI column name to URL-friendly route parameters.
 *
 * URL values (semantic, human-readable — matches main.tsx route examples):
 *   claimType: 'hcfa' | 'ub' | 'all'
 *   category:  'manual-review' | 'manual-pended'
 *
 * API value mapping ('hcfa'→'H', 'ub'→'U', 'all'→'') is the
 * responsibility of ClientManualMatchDashboard, not this component.
 *
 * Column → { category, claimType }:
 *   Total Claim Count              → manual-review,  all
 *   Manual Review (Total)          → manual-review,  all
 *   Manual Review Pended (Total)   → manual-pended,  all
 *   Manual Review - HCFA           → manual-review,  hcfa
 *   Manual Review - UB             → manual-review,  ub
 *   Manual Review Pended - HCFA    → manual-pended,  hcfa
 *   Manual Review Pended - UB      → manual-pended,  ub
 */
const parseColumnName = (
  columnName: string
): { category: string; claimType: string } => {
  const lower = columnName.toLowerCase();

  const category = lower.includes('pended') ? 'manual-pended' : 'manual-review';

  let claimType: string;
  if (lower.includes('hcfa')) {
    claimType = 'hcfa';
  } else if (lower.includes('ub')) {
    claimType = 'ub';
  } else {
    // Total column — no specific claim type filter
    claimType = 'all';
  }

  return { category, claimType };
};

const ClaimsTable = () => {
  const [showClaimType, setShowClaimType] = useState(false);
  const { rows, loading, error } = useClaimsData();
  const navigate = useNavigate();

  /**
   * Renders a clickable cell value.
   *
   * Uses MUI ButtonBase (renders as <button>) instead of <Link href="#">
   * to avoid browser-native anchor behaviour that can conflict with
   * React Router's programmatic navigate():
   *   - <a href="#"> pushes a hash entry to the browser history stack
   *     before navigate() fires, which can cause a brief URL flicker and,
   *     in some environments, trigger the wildcard route redirect back to
   *     /manual-review before the target route mounts.
   *   - stopPropagation() prevents parent Collapsible toggle handlers from
   *     intercepting the click and interfering with navigation.
   */
  const renderClickableCell = (
    value: string | number,
    claimStream: string,
    columnName: string
  ) => {
    if (isClickable(value)) {
      return (
        <ButtonBase
          onClick={(e) => {
            // Prevent click from bubbling to Collapsible or any parent toggle handler.
            e.stopPropagation();
            const { category, claimType } = parseColumnName(columnName);
            // Produces URLs matching main.tsx route:
            //   /claim/manual-review/hcfa/next?stream=HEOS
            //   /claim/manual-pended/ub/next?stream=PHCS
            //   /claim/manual-review/all/next?stream=HEOS
            void navigate(
              `/claim/${category}/${claimType}/next?stream=${encodeURIComponent(claimStream)}`
            );
          }}
          sx={{
            cursor: 'pointer',
            color: 'primary.main',
            fontWeight: 500,
            fontSize: 'inherit',
            fontFamily: 'inherit',
            borderRadius: '2px',
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
          {value}
        </ButtonBase>
      );
    }
    return value;
  };

  if (loading) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' flex={1}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        flex={1}
        p={2}
      >
        <Box maxWidth='600px' width='100%'>
          <Alert severity='error' sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Typography variant='body2' color='text.secondary'>
            Make sure to run:{' '}
            <code>cd server && npm install && npm run dev</code>
          </Typography>
        </Box>
      </Box>
    );
  }

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
        {/* Header with Checkbox */}
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

        {/* Table */}
        <Paper elevation={3} sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
            <Table
              stickyHeader
              sx={{ minWidth: 650, tableLayout: 'auto' }}
              aria-label='claims summary table'
            >
              {/* TABLE HEAD */}
              <TableHead>
                {/* Row 1: Group Headers */}
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

                {/* Row 2: Sub-headers (only in detailed view) */}
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

              {/* TABLE BODY */}
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

// src/components/shared/Collapsible.tsx
import { type ReactNode } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface CollapsibleProps {
  title: string;
  defaultExpanded?: boolean;
  actions?: ReactNode;
  children: ReactNode;
  contentSx?: object; // Optional custom styles for content area
}

/**
 * Reusable Collapsible Component
 * Matches ClaimsSearchForm styling for consistency across the application
 *
 * Features:
 * - Consistent accordion styling
 * - Optional action buttons in header (right side)
 * - Prevents accordion toggle when clicking actions
 * - Customizable content area styles
 *
 * @param title - Header title text
 * @param defaultExpanded - Whether accordion starts expanded (default: false)
 * @param actions - Optional action buttons/elements in header (right side)
 * @param children - Content to display inside accordion
 * @param contentSx - Optional custom styles for AccordionDetails
 */
export default function Collapsible({
  title,
  defaultExpanded = false,
  actions,
  children,
  contentSx = {},
}: CollapsibleProps) {
  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      disableGutters
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        boxShadow: 0,
        bgcolor: 'background.paper',
        '&:before': {
          display: 'none', // Remove default MUI divider
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          minHeight: 40,
          py: 0.5,
          px: 1,
          '& .MuiAccordionSummary-content': {
            my: 0.5,
          },
          '&.Mui-expanded': {
            minHeight: 40,
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            pr: 2,
          }}
        >
          {/* Title */}
          <Typography variant='h6' fontWeight={600} sx={{ fontSize: '1rem' }}>
            {title}
          </Typography>

          {/* Optional Actions (stop propagation to prevent accordion toggle) */}
          {actions && (
            <Box
              onClick={(e) => e.stopPropagation()}
              sx={{ display: 'flex', gap: 1 }}
            >
              {actions}
            </Box>
          )}
        </Box>
      </AccordionSummary>

      <AccordionDetails
        sx={{
          pt: 0.5,
          pb: 1.5,
          px: 2,
          ...contentSx, // Allow custom content styles
        }}
      >
        {children}
      </AccordionDetails>
    </Accordion>
  );
}

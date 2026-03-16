import * as React from "react";
import { Box, Typography, Link as MuiLink } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

type BottomBannerProps = {
  companyLabel?: string;
  companyUrl?: string;
  companyColor?: string;
  extra?: React.ReactNode;
};

export default function BottomBanner({
  companyLabel = "Your Company",
  companyUrl,
  companyColor = "success.main",
  extra,
}: BottomBannerProps) {
  const year = new Date().getFullYear();
  const isExternal = !!companyUrl && /^https?:\/\//i.test(companyUrl);

  const linkSx = {
    color: companyColor,
    fontWeight: 600,
    "&:hover": { textDecoration: "underline" },
    "&:focus-visible": {
      outline: "2px solid",
      outlineColor: "primary.main",
      outlineOffset: 2,
      borderRadius: 0.5,
    },
  } as const;

  const CompanyNode = !companyUrl ? (
    <Box component="span" sx={linkSx}>
      {companyLabel}
    </Box>
  ) : isExternal ? (
    <MuiLink
      href={companyUrl}
      target="_blank"
      rel="noopener noreferrer"
      underline="hover"
      sx={linkSx}
      aria-label={`${companyLabel} (opens in a new tab)`}
    >
      {companyLabel}
    </MuiLink>
  ) : (
    <MuiLink component={RouterLink} to={companyUrl} underline="hover" sx={linkSx}>
      {companyLabel}
    </MuiLink>
  );

  return (
    <Box
      component="footer"
      role="contentinfo"
      sx={{
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        color: "text.primary",
      }}
    >
      {/* Inner centered row */}
      <Box
        sx={{
          maxWidth: (t) => t.breakpoints.values.xl,
          mx: "auto",
          py: 0.5, // ✅ reduced from 1
          px: { xs: 1.5, sm: 2 },
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0.125, // ✅ reduced from 0.25
          textAlign: "center",
        }}
      >
        <Typography variant="body2" sx={{ fontSize: "0.8125rem" }}>
          {" "}
          {/* ✅ smaller font */}© {year} {CompanyNode}
        </Typography>
        {extra && (
          <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
            {" "}
            {/* ✅ smaller font */}
            {extra}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

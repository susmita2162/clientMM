import { createTheme, type PaletteMode } from "@mui/material/styles";

// COMPREHENSIVE SCALING APPROACH
// Instead of CSS zoom/transform, we scale EVERYTHING through MUI's theme system
// This ensures all MUI components scale proportionally

const SCALE_FACTOR = 0.8;

export const createAppTheme = (mode: PaletteMode = "light") => {
  return createTheme({
    palette: {
      mode,
      ...(mode === "light"
        ? {
            // Light mode colors
            primary: {
              main: "#1976d2",
            },
            secondary: {
              main: "#dc004e",
            },
            background: {
              default: "#f5f5f5",
              paper: "#ffffff",
            },
            success: {
              main: "#2e7d32",
            },
          }
        : {
            // Dark mode colors
            primary: {
              main: "#90caf9",
            },
            secondary: {
              main: "#f48fb1",
            },
            background: {
              default: "#121212",
              paper: "#1e1e1e",
            },
            success: {
              main: "#66bb6a",
            },
          }),
    },

    typography: {
      fontSize: 14 * SCALE_FACTOR, // Base font size scaled
      htmlFontSize: 16 * SCALE_FACTOR, // Root font size

      // Scale all typography variants
      h1: { fontSize: `${2.5 * SCALE_FACTOR}rem` },
      h2: { fontSize: `${2 * SCALE_FACTOR}rem` },
      h3: { fontSize: `${1.75 * SCALE_FACTOR}rem` },
      h4: { fontSize: `${1.5 * SCALE_FACTOR}rem` },
      h5: { fontSize: `${1.25 * SCALE_FACTOR}rem` },
      h6: { fontSize: `${1 * SCALE_FACTOR}rem` },
      subtitle1: { fontSize: `${1 * SCALE_FACTOR}rem` },
      subtitle2: { fontSize: `${0.875 * SCALE_FACTOR}rem` },
      body1: { fontSize: `${1 * SCALE_FACTOR}rem` },
      body2: { fontSize: `${0.875 * SCALE_FACTOR}rem` },
      button: { fontSize: `${0.875 * SCALE_FACTOR}rem` },
      caption: { fontSize: `${0.75 * SCALE_FACTOR}rem` },
      overline: { fontSize: `${0.75 * SCALE_FACTOR}rem` },
    },

    spacing: (factor: number) => `${0.5 * SCALE_FACTOR * factor}rem`,

    shape: {
      borderRadius: 12 * SCALE_FACTOR,
    },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            fontSize: `${16 * SCALE_FACTOR}px !important`,
          },
          body: {
            fontSize: `${14 * SCALE_FACTOR}px`,
          },
        },
      },

      // Scale all button sizes
      MuiButton: {
        styleOverrides: {
          root: {
            fontSize: `${14 * SCALE_FACTOR}px`,
            padding: `${6 * SCALE_FACTOR}px ${16 * SCALE_FACTOR}px`,
          },
          sizeSmall: {
            fontSize: `${13 * SCALE_FACTOR}px`,
            padding: `${4 * SCALE_FACTOR}px ${10 * SCALE_FACTOR}px`,
          },
          sizeLarge: {
            fontSize: `${15 * SCALE_FACTOR}px`,
            padding: `${8 * SCALE_FACTOR}px ${22 * SCALE_FACTOR}px`,
          },
        },
      },

      // Scale text fields
      MuiTextField: {
        styleOverrides: {
          root: {
            "& .MuiInputBase-root": {
              fontSize: `${14 * SCALE_FACTOR}px`,
            },
            "& .MuiInputLabel-root": {
              fontSize: `${14 * SCALE_FACTOR}px`,
            },
          },
        },
      },

      MuiAppBar: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            minHeight: `${64 * SCALE_FACTOR}px`,
          },
        },
      },

      MuiAccordion: {
        styleOverrides: {
          root: {
            borderRadius: 12 * SCALE_FACTOR,
          },
        },
      },

      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12 * SCALE_FACTOR,
          },
        },
      },

      // Scale icons
      MuiSvgIcon: {
        styleOverrides: {
          root: {
            fontSize: `${24 * SCALE_FACTOR}px`,
          },
          fontSizeSmall: {
            fontSize: `${20 * SCALE_FACTOR}px`,
          },
          fontSizeLarge: {
            fontSize: `${35 * SCALE_FACTOR}px`,
          },
        },
      },

      // Scale table pagination (this will affect DataGrid pagination)
      MuiTablePagination: {
        styleOverrides: {
          root: {
            fontSize: `${14 * SCALE_FACTOR}px`,
          },
          selectLabel: {
            fontSize: `${14 * SCALE_FACTOR}px`,
          },
          displayedRows: {
            fontSize: `${14 * SCALE_FACTOR}px`,
          },
          select: {
            fontSize: `${14 * SCALE_FACTOR}px`,
          },
        },
      },
    },
  });
};

// Export default theme for backwards compatibility
const theme = createAppTheme("light");
export default theme;

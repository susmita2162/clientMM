// vite.config.ts
//
// MFE remote entry URLs are driven by env vars so the same config works
// across local dev and the deployed poc environment without edits.
// vite.config.ts reads them via loadEnv() at build time.
//
// Proxy removed: VITE_MOCK_API_BASE_URL is the full URL to the centralized
// server, so claimsApi.ts constructs absolute URLs directly.

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const memberSearchBase =
    env.VITE_MEMBER_SEARCH_URL ?? 'http://localhost:3002/ucp-member-search-ui';

  const employerGroupBase =
    env.VITE_EMPLOYER_GROUP_URL ?? 'http://localhost:3003/ucp-group-search-ui';

  return {
    base: '/ucp-client-match-ui',

    plugins: [
      react(),
      federation({
        name: 'claimsManagementHost',
        remotes: {
          memberSearchApp: {
            type: 'module',
            name: 'memberSearchApp',
            entry: `${memberSearchBase}/remoteEntry.js`,
          },
          employerGroupSearchApp: {
            type: 'module',
            name: 'employerGroupSearchApp',
            entry: `${employerGroupBase}/remoteEntry.js`,
          },
        },
        shared: {
          react: { singleton: true },
          'react-dom': { singleton: true },
          '@mui/material': { singleton: true },
          '@mui/icons-material': { singleton: true },
          '@emotion/react': { singleton: true },
          '@emotion/utils': { singleton: true },
        },
        dts: false,
      }),
    ],

    server: {
      port: 5173,
      // No proxy — claimsApi.ts uses absolute VITE_MOCK_API_BASE_URL directly.
      // To run against localhost:3001 offline, set
      // VITE_MOCK_API_BASE_URL=http://localhost:3001 in .env.local.
    },

    build: {
      target: 'esnext',
    },
  };
});

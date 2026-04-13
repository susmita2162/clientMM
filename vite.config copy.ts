import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

export default defineConfig({
  base: '/ucp-client-match-ui',
  plugins: [
    react(),
    federation({
      name: 'claimsManagementHost',
      remotes: {
        memberSearchApp: {
          type: 'module',
          name: 'memberSearchApp',
          entry: 'http://localhost:3002/ucp-member-search-ui/remoteEntry.js',
        },
        employerGroupSearchApp: {
          type: 'module',
          name: 'employerGroupSearchApp',
          entry: 'http://localhost:3003/ucp-group-search-ui/remoteEntry.js',
        },
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
        '@mui/material': { singleton: true },
        '@mui/icons-material': { singleton: true },
        '@emotion/react': { singleton: true },
        // '@emotion/styled': { singleton: true },
        // ✅ FIX ISSUE 1: Add @emotion internal packages
        // '@emotion/cache': { singleton: true },
        // '@emotion/serialize': { singleton: true },
        '@emotion/utils': { singleton: true },
      },
      // ✅ FIX ISSUE 2 & 3: Host doesn't need DTS - you have manual types
      dts: false,
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
    // minify: false, // Better for debugging
  },
});

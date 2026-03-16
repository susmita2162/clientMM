import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'claimsManagementHost',
      remotes: {
        memberSearchApp: {
          type: 'module',
          name: 'memberSearchApp',
          entry: 'http://localhost:3002/remoteEntry.js',
        },
        employerGroupSearchApp: {
          type: 'module',
          name: 'employerGroupSearchApp',
          entry: 'http://localhost:3003/remoteEntry.js',
        },
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
        '@mui/material': { singleton: true },
        '@mui/icons-material': { singleton: true },
        '@emotion/react': { singleton: true },
        '@emotion/styled': { singleton: true },
      },
      dts: { tsConfigPath: './tsconfig.mf.json' },
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
  },
});

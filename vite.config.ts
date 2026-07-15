// vite.config.ts — ucp-client-match-ui (HOST)
/// <reference types="vitest/config" />
//
// Shared singleton rules:
//   Only packages that are safe to share across the federation boundary are
//   listed here. @emotion/styled, @emotion/cache, @emotion/serialize are
//   intentionally excluded from ALL three apps (host + both remotes) —
//   sharing them causes "TypeError: e is not a function" at runtime due to
//   CJS/ESM interop issues in @module-federation/vite. Each app bundles its
//   own copy; the size trade-off is acceptable and correct.
//
//   requiredVersion uses >= ranges so minor version differences between host
//   (19.2.0) and remotes (19.1.1) don't cause federation warnings or
//   unpredictable singleton resolution.
//
// Proxy — two live services, one proxy rule:
//
//   The live API exposes two separate services on the same host:
//     claimsearchservice — /api/clientmatch/* and /api/clientMatch/*
//     claim-match        — /api/client-match/*
//
//   A single proxy rule on '/api/client' catches all three path variants.
//   The rewrite function distinguishes the two services by inspecting the
//   path prefix and prepends the correct service segment:
//     /api/client-match/... → /claim-match/api/client-match/...
//     /api/clientmatch/...  → /claimsearchservice/api/clientmatch/...
//     /api/clientMatch/...  → /claimsearchservice/api/clientMatch/...
//
//   In mock mode paths pass through unchanged — the mock server handles
//   all three prefixes directly.
//
//   In Docker/OKE the Vite dev server is not running; nginx/ingress handles
//   service routing instead. No change required there.

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const isLive = env.VITE_API_MODE === 'live';

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
          react: { singleton: true, requiredVersion: '>=19.1.1' },
          'react-dom': { singleton: true, requiredVersion: '>=19.1.1' },
          '@mui/material': { singleton: true, requiredVersion: '>=7.3.4' },
          '@mui/icons-material': {
            singleton: true,
            requiredVersion: '>=7.3.4',
          },
          '@emotion/react': { singleton: true, requiredVersion: '>=11.14.0' },
        },
        dts: false,
      }),
    ],

    server: {
      port: 5173,
      proxy: {
        '/api/client': {
          target: isLive ? env.VITE_API_BASE_URL : env.VITE_MOCK_API_BASE_URL,
          changeOrigin: true,
          secure: false,
          rewrite: isLive
            ? (path: string) => {
                if (path.startsWith('/api/client-match')) {
                  return `/claim-match${path}`;
                }
                return `/claimsearchservice${path}`;
              }
            : (path: string) => path,
        },
      },
    },

    build: {
      target: 'esnext',
    },

    // ── Vitest ────────────────────────────────────────────────────────────
    // Lives in this same file (not a separate vitest.config.ts) so Vitest
    // resolves modules with the same alias/plugin setup as the app itself.
    test: {
      environment: 'jsdom', // simulates a DOM so React components can render in Node
      globals: true, // lets test files use describe/it/expect without importing them
      setupFiles: './src/test/setup.ts',
      css: false, // skip CSS parsing — MUI's sx/emotion styles don't need real CSS for logic tests
      coverage: {
        provider: 'v8', // uses Node's built-in coverage, no extra native deps like istanbul needs
        reporter: ['text', 'lcov'], // 'text' for your terminal, 'lcov' for Sonar to consume
        reportsDirectory: './coverage',
        exclude: [
          'src/main.tsx',
          'src/vite-env.d.ts',
          'src/module-federation.d.ts',
          'src/**/*.d.ts',
          'src/types/**',
          'src/theme.ts',
          'src/ThemeModeProvider.tsx',
          'src/**/*.stories.tsx',
          'src/**/*.test.{ts,tsx}',
          '**/*.config.{ts,js}',
        ],
      },
    },
  };
});

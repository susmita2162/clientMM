// vite.config.lib.ts — ucp-client-match-ui (LIBRARY BUILD)
//
// Separate from vite.config.ts, which builds this app as a standalone,
// deployed SPA (its own routing + Module Federation host role consuming
// employerGroupSearchApp). That config has no `build.lib` section and no
// dts plugin — it was never meant to produce an installable package, and
// still shouldn't; don't merge these two configs together.
//
// This config produces the actual npm package Chassis installs:
//   dist/index.es.js    — ESM entry
//   dist/index.umd.js   — CJS/UMD entry
//   dist/index.d.ts     — type declarations
//
// Modeled directly on ucp-Group-search-ui's vite.config.ts, which is
// confirmed working today.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      ...dts({
        tsconfigPath: './tsconfig.app.json',
        include: ['src'],
        insertTypesEntry: true,
        exclude: [
          'src/**/*.test.ts',
          'src/**/*.test.tsx',
          'src/test',
          'src/main.tsx',
          'src/module-federation.d.ts',
        ],
        outDir: 'dist',
        entryRoot: 'src',
      }),
      apply: 'build',
      enforce: 'post',
      closeBundle: async () => {
        // Same fixup Group Search uses: dts emits dist/src/index.d.ts,
        // move it to dist/index.d.ts and rewrite relative import paths.
        const srcIndexPath = path.resolve(__dirname, 'dist/src/index.d.ts');
        const distIndexPath = path.resolve(__dirname, 'dist/index.d.ts');

        if (fs.existsSync(srcIndexPath)) {
          let content = fs.readFileSync(srcIndexPath, 'utf-8');
          content = content.replace(
            /from ['"](\.\/)([^'"]+)['"]/g,
            (_, dot, modulePath) => {
              return `from '${dot}src/${modulePath}'`;
            }
          );
          fs.writeFileSync(distIndexPath, content, 'utf-8');
        }
      },
    } as any,
  ],

  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'ClientMatchUI',
      formats: ['es', 'umd'],
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      // TODO: confirm against this package's actual package.json
      // dependencies/peerDependencies — list below is inferred from
      // Group Search's pattern plus what index.ts's export graph touches.
      // react-router-dom is included for safety even though the three
      // components we made router-free no longer import it directly —
      // harmless to list if genuinely unused, Rollup just won't bundle it.
      external: [
        'react',
        'react/jsx-runtime',
        'react-dom',
        'dayjs',
        'react-router-dom',
        '@emotion/styled',
        '@emotion/react',
        '@emotion/cache',
        '@emotion/serialize',
        '@emotion/utils',
        '@mui/material',
        '@mui/system',
        '@mui/icons-material',
        '@mui/x-data-grid',
        '@mui/x-date-pickers',
        'framer-motion',
      ],
      output: {
        globals: {
          react: 'React',
          'react/jsx-runtime': 'ReactJSXRuntime',
          'react-dom': 'ReactDOM',
          'react-router-dom': 'ReactRouterDOM',
          dayjs: 'dayjs',
          '@emotion/react': 'emotionReact',
          '@emotion/styled': 'emotionStyled',
          '@emotion/cache': 'emotionCache',
          '@emotion/serialize': 'emotionSerialize',
          '@emotion/utils': 'emotionUtils',
          '@mui/material': 'MUI',
          '@mui/system': 'MUISystem',
          '@mui/icons-material': 'MUIIcons',
          '@mui/x-data-grid': 'MUIXDataGrid',
          '@mui/x-date-pickers': 'MUIXDatePickers',
          'framer-motion': 'FramerMotion',
        },
      },
    },
    sourcemap: true,
    minify: 'esbuild',
  },
});

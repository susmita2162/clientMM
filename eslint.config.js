import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'coverage']),

  {
    files: ['**/*.{ts,tsx}'],
    linterOptions: {
      // Promotes stale eslint-disable comments from warning → error.
      // Stale directives mean the underlying issue was fixed but the
      // suppression was left behind — this ensures they can never be committed.
      reportUnusedDisableDirectives: 'error',
    },
    extends: [
      js.configs.recommended,
      // Type-aware rules catch real bugs (unsafe assignments, unhandled promises).
      // Requires parserOptions.project below.
      tseslint.configs.recommendedTypeChecked,
      // Must be last: disables ESLint rules that conflict with Prettier.
      prettierConfig,
    ],
    // react-hooks and react-refresh must be wired as plugin objects in
    // flat config. Their shareable configs still use the old
    // plugins-as-strings format internally, which ESLint 9 rejects.
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // react-hooks recommended rules — spread manually since the shareable
      // config cannot be used in extends with flat config.
      ...reactHooks.configs.recommended.rules,
      // Warn when a component file exports something other than components
      // (breaks Fast Refresh). allowConstantExport permits exporting consts.
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      // Unused vars/params are already enforced by noUnusedLocals /
      // noUnusedParameters in tsconfig — this catches the rest at lint time.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      // Prevent debug logs reaching production; allow warn/error.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Test files: relax type-unsafe rules — jest-dom matchers and MSW handlers
  // intentionally use patterns that would otherwise fail type-checked rules.
  {
    files: ['src/test/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    linterOptions: {
      // Disable directives in test files are often intentional stubs —
      // keep as warn rather than error so test scaffolding isn't blocked.
      reportUnusedDisableDirectives: 'warn',
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
]);

// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  // ── Global ignores ──────────────────────────────────────────
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.js',           // compiled JS output in shared/
      '**/*.d.ts',         // declaration files
      'scripts/**',        // one-off import scripts
      'atlas-tool/**',     // separate tool
      'temp/**',
      'examples/**',
    ],
  },

  // ── Base: recommended JS rules ──────────────────────────────
  eslint.configs.recommended,

  // ── TypeScript (type-aware) for shared + backend ────────────
  {
    files: ['shared/**/*.ts', 'backend/src/**/*.ts'],
    extends: [
      ...tseslint.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Relax rules for a large existing codebase — tighten over time
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',     // Phase 27 goal: error
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off', // used deliberately
      'no-case-declarations': 'off',                     // common in reducers
      'prefer-const': 'warn',
    },
  },

  // ── TypeScript + React for frontend ─────────────────────────
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    extends: [
      ...tseslint.configs.recommended,
    ],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // React hooks
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', {
        allowConstantExport: true,
      }],

      // TypeScript — relaxed for existing code
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-case-declarations': 'off',
      'prefer-const': 'warn',
    },
  },
);

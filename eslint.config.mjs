import js from '@eslint/js';
import ts from 'typescript-eslint';

export default ts.config(
  { ignores: ['dist/**', 'test-results/**', '**/.next/**', '**/next-env.d.ts', '**/node_modules/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  { files: ['**/*.{mjs,ts,tsx}'], languageOptions: { globals: {
    Request: 'readonly', Response: 'readonly', URL: 'readonly', Headers: 'readonly',
    fetch: 'readonly', process: 'readonly', console: 'readonly',
    setTimeout: 'readonly', clearTimeout: 'readonly', AbortSignal: 'readonly', ReadableStream: 'readonly',
  } } },
);

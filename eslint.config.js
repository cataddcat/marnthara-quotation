import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

// ── Design-system typography guard (DESIGN.md §1/§2) ───────────────────────────
// Body 14–16px · 12px = Meta only · <12px BANNED for content. Bans Tailwind
// text-[9/10/11px] literals. Gated at `error` below (was the Phase-1 lint:design).
const DESIGN_SUB_12 = String.raw`text-\[(9|10|11)px\]`;
const DESIGN_SUB_12_MSG =
  'ห้ามใช้ตัวอักษร < 12px กับเนื้อหา (DESIGN.md §1/§2: Body 14–16px · 12px = Meta only). ใช้ <Text>/typography scale หรือ text-xs ขึ้นไป.';

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  // Design-system typography guard — GATED at error (DESIGN.md §1/§2/§7).
  // Print medium has its own sizing, so src/components/print/** is exempt.
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/components/print/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: `Literal[value=/${DESIGN_SUB_12}/]`, message: DESIGN_SUB_12_MSG },
        { selector: `TemplateElement[value.raw=/${DESIGN_SUB_12}/]`, message: DESIGN_SUB_12_MSG },
      ],
    },
  },
]);

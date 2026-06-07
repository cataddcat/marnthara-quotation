// eslint.design.config.mjs
//
// Design-system guard — NON-GATING in Phase 1. Run via `npm run lint:design` to enumerate the
// readability worklist (every <12px text used on content). It is intentionally NOT part of the
// gated `npm run lint` yet.
//
// PHASE 2 (immediate next, mandatory — see DESIGN.md / HANDOFF): after the worklist is cleared,
// promote this rule into the main flat config (eslint.config.js) at `error` so regressions are blocked.
//
// Rule: ban Tailwind `text-[9px] / text-[10px] / text-[11px]` (sub-12px) on readable content.
// DESIGN.md §2 — Body 14–16px · 12px = Meta only · <12px banned.

import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

const SUB_12 = String.raw`text-\[(9|10|11)px\]`;
const MESSAGE =
  'ห้ามใช้ตัวอักษร < 12px กับเนื้อหา (DESIGN.md §2: Body 14–16px · 12px = Meta only). ใช้ <Text>/typography scale หรือ text-xs ขึ้นไป.';

export default [
  {
    ignores: [
      'dist',
      'coverage',
      'playwright-report',
      'test-results',
      // print medium intentionally uses small type
      'src/components/print/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    // this config only runs the design guard — don't flag existing disable directives as unused
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    languageOptions: { parser: tseslint.parser },
    // register plugins so existing `eslint-disable` directives resolve (rules stay OFF —
    // this config only runs the design guard below, keeping the worklist output clean)
    plugins: { '@typescript-eslint': tseslint.plugin, 'react-hooks': reactHooks },
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: `Literal[value=/${SUB_12}/]`, message: MESSAGE },
        { selector: `TemplateElement[value.raw=/${SUB_12}/]`, message: MESSAGE },
      ],
    },
  },
];

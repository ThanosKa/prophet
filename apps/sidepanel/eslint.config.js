import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

const ALLOWED = [
  /^\s*prettier-ignore\s*$/,
  /^\s*eslint-(disable|enable)/,
  /^\s*@(vitest|jest)-environment\s/,
  /^\s*(@vite-ignore|webpackIgnore:)/,
  /^\/\s*<reference\s/,
  /https?:\/\/\S+/,
  /\b(copyright|license|SPDX-License-Identifier)\b/i,
];

function isDocOnExport(comment, source) {
  if (comment.type !== "Block" || !comment.value.startsWith("*")) return false;
  return source.getTokenAfter(comment, { includeComments: false })?.value === "export";
}

const noComments = {
  meta: {
    type: "suggestion",
    messages: {
      banned:
        "Delete this comment and let the code say it. Allowed: a license header, prettier-ignore, /** */ on an export, or a link to the issue, RFC or vendor doc that forces the behaviour.",
    },
  },
  create(context) {
    const source = context.sourceCode;
    return {
      Program() {
        for (const comment of source.getAllComments()) {
          if (comment.type === "Shebang") continue;
          if (isDocOnExport(comment, source)) continue;
          if (ALLOWED.some((pattern) => pattern.test(comment.value))) continue;
          context.report({ loc: comment.loc, messageId: "banned" });
        }
      },
    };
  },
};

const localPlugin = { rules: { "no-comments": noComments } };

export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    ...react.configs.flat.recommended,
    plugins: {
      react: react,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        ...globals.browser,
        chrome: "readonly",
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        projectService: {
          allowDefaultProject: ["tailwind.config.ts", "vitest.config.ts"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "no-console": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "FunctionDeclaration[params.length>1]",
          message: "Take one object argument instead of positional params.",
        },
        {
          selector: "VariableDeclarator:not([id.name=/^(listener|onUpdated)$/]) > ArrowFunctionExpression[params.length>1]",
          message: "Take one object argument instead of positional params.",
        },
      ],
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    files: [
      "**/*.test.{ts,tsx}",
      "**/*.spec.{ts,tsx}",
      "**/tests/**/*.{ts,tsx}",
      "**/__tests__/**/*.{ts,tsx}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/consistent-type-assertions": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "no-restricted-syntax": "off",
    },
  },
  {
    files: ["src/lib/logger.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["vite.config.ts"],
    rules: {
      "@typescript-eslint/consistent-type-assertions": "off",
    },
  },
  {
    files: ["**/components/ai-elements/shimmer.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    plugins: { local: localPlugin },
    rules: { "local/no-comments": "error" },
  },
];

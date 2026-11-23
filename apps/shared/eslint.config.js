import js from "@eslint/js";
import tseslint from "typescript-eslint";

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
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
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
          selector: "VariableDeclarator > ArrowFunctionExpression[params.length>1]",
          message: "Take one object argument instead of positional params.",
        },
      ],
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "**/tests/**/*.ts", "**/__tests__/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/consistent-type-assertions": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "no-restricted-syntax": "off",
    },
  },
  {
    plugins: { local: localPlugin },
    rules: { "local/no-comments": "error" },
  },
];

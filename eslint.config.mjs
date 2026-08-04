import js from "@eslint/js";
import globals from "globals";

import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

import prettier from "eslint-config-prettier";

export default [
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/.changeset/**"],
  },

  js.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],

    languageOptions: {
      parser: tsParser,

      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },

    plugins: {
      "@typescript-eslint": tsPlugin,

      react,

      "react-hooks": reactHooks,
    },

    rules: {
      ...tsPlugin.configs.recommended.rules,

      ...react.configs.recommended.rules,

      ...reactHooks.configs.recommended.rules,

      "react/react-in-jsx-scope": "off",
    },

    settings: {
      react: {
        version: "detect",
      },
    },
  },

  prettier,
];

/** Shared ESLint preset — extend from apps/*/eslint.config.mjs */
module.exports = {
  extends: ["next/core-web-vitals", "next/typescript"],
  rules: {
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
  },
};

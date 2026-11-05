import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

// ESM-only packages that Jest must transform (pnpm nests them under .pnpm/)
const esmPackages = [
  "jose",
  "next-intl",
  "use-intl",
  "@formatjs",
  "intl-messageformat",
];

/** @type {import('jest').Config} */
const config = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jsdom",
  testPathIgnorePatterns: ["<rootDir>/e2e-tests/", "<rootDir>/node_modules/"],
};

// next/jest adds its own transformIgnorePatterns, so override them afterwards
export default async function jestConfig() {
  const resolved = await createJestConfig(config)();
  return {
    ...resolved,
    transformIgnorePatterns: [
      `/node_modules/(?!(\\.pnpm/)?(${esmPackages.join("|")})[@/+])`,
      "^.+\\.module\\.(css|sass|scss)$",
    ],
  };
}

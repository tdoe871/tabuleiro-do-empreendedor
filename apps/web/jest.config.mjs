import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jsdom",
  testPathIgnorePatterns: ["<rootDir>/e2e-tests/", "<rootDir>/node_modules/"],
  // next/jest rewrites "@/" in static imports at compile time, but not inside
  // jest.mock() or computed require() paths, so map it for the resolver too.
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
};

// ESM-only packages that Jest has to transform (next/jest skips everything in
// node_modules by default). With pnpm they live under node_modules/.pnpm, where
// scoped packages are spelled "@scope+name@version".
const ESM_PACKAGES = [
  "jose",
  "next-intl",
  "use-intl",
  "@formatjs",
  "intl-messageformat",
];

export default async function jestConfig() {
  const resolved = await createJestConfig(config)();
  resolved.transformIgnorePatterns = [
    `/node_modules/(?!(\\.pnpm/)?(${ESM_PACKAGES.join("|")})[@/+])`,
    ...(resolved.transformIgnorePatterns ?? []).filter(
      (pattern) => !pattern.includes("node_modules"),
    ),
  ];
  return resolved;
}

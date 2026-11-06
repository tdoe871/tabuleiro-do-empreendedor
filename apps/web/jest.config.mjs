import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jsdom",
  testPathIgnorePatterns: ["<rootDir>/e2e-tests/", "<rootDir>/node_modules/"],
};

// ESM-only packages that Jest has to transform (next/jest skips everything in
// node_modules by default). With pnpm they live under node_modules/.pnpm.
const ESM_PACKAGES = ["jose"];

export default async function jestConfig() {
  const resolved = await createJestConfig(config)();
  resolved.transformIgnorePatterns = [
    `/node_modules/(?!(\\.pnpm/(${ESM_PACKAGES.join("|")})@[^/]+/node_modules/)?(${ESM_PACKAGES.join("|")})/)`,
    ...(resolved.transformIgnorePatterns ?? []).filter(
      (pattern) => !pattern.includes("node_modules"),
    ),
  ];
  return resolved;
}

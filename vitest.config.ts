import { defineConfig } from "vitest/config";

export default defineConfig({
  // Explicitly no Vite plugins — keeps the test runner isolated from
  // @tailwindcss/vite and @vitejs/plugin-react which are not needed for unit tests.
  plugins: [],
  test: {
    // Run tests in a Node.js environment — no DOM needed for pure utility functions.
    environment: "node",
    globals: true,
    pool: "vmThreads",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    typecheck: {
      tsconfig: "./tsconfig.app.json",
    },
  },
});
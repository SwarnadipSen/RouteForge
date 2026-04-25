import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  server: {
    host: true,
    port: 5173,
  },
  test: {
    environment: "jsdom",
    setupFiles: "./tests/setup.js",
    include: ["tests/**/*.test.{js,jsx,ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**"],
  },
});

import { defineConfig } from "vite";

export default defineConfig({
  // 상대 경로로 빌드해야 /sand-box/isekai-kimdaewon/ 같은 하위 경로에서도 그대로 동작한다
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
    assetsInlineLimit: 0,
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
  },
});

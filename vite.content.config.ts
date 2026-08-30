import { defineConfig } from "vite";

// content script(マニフェストのcontent_scriptsから読み込まれる素のスクリプト)のビルド設定
// MV3のcontent_scriptsはESモジュールとして直接読み込めないため、IIFE形式で単一ファイルに出力する
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true, // 最初に走らせるビルドでdistをクリーンにする
    lib: {
      entry: "src/content/content.ts",
      name: "ctrlEnterUnifierContent",
      formats: ["iife"],
      fileName: () => "content.js",
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
});

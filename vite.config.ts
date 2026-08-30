import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

// popup(HTML+TS+Tailwind)のビルド設定
// root を src/popup にすることで、dist/popup.html のようにフラットな階層で出力する
export default defineConfig({
  root: resolve(import.meta.dirname, "src/popup"),
  base: "./",
  plugins: [tailwindcss()],
  build: {
    outDir: resolve(import.meta.dirname, "dist"),
    emptyOutDir: false, // content scriptビルドの成果物を消さない
    rollupOptions: {
      input: resolve(import.meta.dirname, "src/popup/popup.html"),
    },
  },
});

import { defineConfig } from "vite";

export default defineConfig({
  publicDir: "public",
  server: {
    port: 5174,
  },
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
      },
    },
  },
});

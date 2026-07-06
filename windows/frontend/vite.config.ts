import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Relative base so built assets resolve under Tauri's asset protocol.
  base: "./",
  plugins: [react(), tailwindcss()],
  // Tauri: fail loudly on Vite errors and don't clear the terminal.
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: "es2021",
  },
});

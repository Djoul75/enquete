import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Servi sous djoul75.github.io/enquete/
export default defineConfig({
  base: "/enquete/",
  plugins: [react()],
});

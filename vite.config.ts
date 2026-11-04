import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Servi sur agencenoire.fr (domaine branché sur GitHub Pages)
export default defineConfig({
  base: "/",
  plugins: [react()],
});

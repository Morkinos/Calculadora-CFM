import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" permite alojar la página en cualquier carpeta o subdominio.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
